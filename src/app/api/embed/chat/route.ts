import { NextResponse } from "next/server";
import { eq, and, asc } from "drizzle-orm";
import { streamText, generateText, stepCountIs, jsonSchema, type Tool } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { db } from "@/db";
import {
  chats,
  messages,
  embedWidgetSessions,
  churches,
  subscriptions,
  prospects,
} from "@/db/schema";
import { hybridSearch } from "@/lib/retrieval";
import {
  incrementQuestionCount,
  getCurrentUsage,
  getEffectiveMessageLimit,
} from "@/lib/usage";
import type { Citation, RetrievedChunk } from "@/lib/types/citations";
import {
  estimateMessageTokens,
  estimateTokens,
  trimHistoryToBudget,
} from "@/lib/chat/tokens";
import {
  MAX_USER_MESSAGE_CHARS,
  validateUserMessageLength,
} from "@/lib/chat/limits";
import {
  checkOrigin,
  checkSecFetchHeaders,
  corsHeaders,
  handleOptions,
  readKey,
} from "@/lib/embed/origin";
import { verifyToken } from "@/lib/embed/session-token";
import {
  consumeToken,
  incrementAndCheckHardCap,
  incrementAndCheckChurchHourlyChatCap,
} from "@/lib/embed/rate-limit";
import { logger } from "@/lib/logger";
import { isEmbeddedChatAvailable } from "@/lib/plan-gating";
import {
  getRequestIp,
  hashIp,
  verifyAndUpdateSessionIp,
} from "@/lib/embed/ip";

/**
 * Streaming chat for the embedded widget.
 *
 * Distinct from `/api/chat`:
 *   - Authenticates via `X-Doctrinally-Session` (widget token) instead
 *     of NextAuth cookie.
 *   - Origin-gated via the church's website allowlist.
 *   - Two-tier rate-limited (in-memory token bucket + Postgres hard cap).
 *   - Tuned system prompt: assumes the caller is a website visitor, not
 *     a member. Encourages gentle-but-eager engagement, with pivots to
 *     "would you like someone from the church to follow up?" when the
 *     conversation warms up.
 *   - 1000-char input cap (shared with member chat).
 *
 * Streaming wire protocol matches the member chat so the widget can
 * share the parser: `\u200B\u200B` chunk delimiters + `__CHAT_ID__`
 * and `__CITATIONS__` trailing sentinels.
 */

export const runtime = "nodejs";
export const maxDuration = 60;

const CITATION_SENTINEL = "\n__CITATIONS__";
const CHAT_ID_SENTINEL = "\n__CHAT_ID__";
const PROSPECT_SENTINEL = "\n__PROSPECT__";
const CHUNK_BOUNDARY = "\u200B\u200B";
const TOTAL_TOKEN_BUDGET = 100_000;
const OUTPUT_RESERVE = 4_000;
const DEFAULT_MODEL = "mercury-2";
const HARD_CAP_PER_HOUR = 200;

const inception = createOpenAI({
  baseURL:
    process.env.INCEPTION_BASE_URL || "https://api.inceptionlabs.ai/v1",
  apiKey: process.env.INCEPTION_API_KEY,
});

function getModel() {
  return inception.chat(process.env.AI_MODEL || DEFAULT_MODEL);
}

/**
 * Regenerate the running conversation summary for a widget session.
 * Called fire-and-forget at the end of each turn so the handshake
 * path can ship summary-only context to the LLM on the next turn
 * without a heavy blocking call here.
 *
 * Reads the most recent 20 messages of the chat; earlier messages
 * fall off the window. The summary is capped at ~500 chars so
 * injecting it as a system-prompt prefix is cheap (< 150 tokens).
 *
 * DEBOUNCING — both for cost and for write traffic. Skip the refresh
 * when ANY of these is true:
 *   - The session's last summary is < 5 minutes old (the visitor is
 *     actively chatting; a fresh summary won't gain much over the
 *     existing one for the next turn's context)
 *   - Fewer than SUMMARY_MIN_NEW_MESSAGES have been added since the
 *     last summary (we don't summarize a 1-message delta)
 *
 * On a 100-turn abusive session this drops the summary cost from
 * 100 LLM calls to ~25 — and on legitimate short sessions it skips
 * the call entirely most of the time.
 */
const SUMMARY_REFRESH_TTL_MS = 5 * 60 * 1000;
const SUMMARY_MIN_NEW_MESSAGES = 4;

async function refreshConversationSummary({
  churchId,
  chatId,
  sessionId,
  lastSummaryUpdatedAt,
}: {
  churchId: string;
  chatId: string;
  sessionId: string;
  lastSummaryUpdatedAt: Date | null;
}): Promise<void> {
  // Time-based debounce.
  if (
    lastSummaryUpdatedAt &&
    Date.now() - lastSummaryUpdatedAt.getTime() < SUMMARY_REFRESH_TTL_MS
  ) {
    return;
  }

  const recent = await db.query.messages.findMany({
    where: eq(messages.chatId, chatId),
    orderBy: [asc(messages.createdAt)],
    limit: 20,
  });
  if (recent.length === 0) return;

  // Message-count debounce — only refresh when enough new messages
  // have arrived since the prior summary. Approximated by counting
  // messages newer than `lastSummaryUpdatedAt`.
  if (lastSummaryUpdatedAt) {
    const newMessages = recent.filter(
      (m) => m.createdAt.getTime() > lastSummaryUpdatedAt.getTime()
    ).length;
    if (newMessages < SUMMARY_MIN_NEW_MESSAGES) return;
  }

  const transcript = recent
    .map((m) => {
      const role = m.role === "user" ? "Visitor" : "Assistant";
      const content = (m.content || "").replace(
        /<document>[^<]*<\/document>/g,
        ""
      );
      return `${role}: ${content.trim()}`;
    })
    .join("\n\n")
    .slice(0, 8000);

  try {
    const { text } = await generateText({
      model: inception.chat(process.env.AI_MODEL || DEFAULT_MODEL),
      system:
        "You summarize website-chat conversations into a single paragraph for use as later system-prompt context. Cover: who the visitor is, what they asked about, any info they shared (name, email, interests), and what was answered. Under 500 characters. Third person. No preamble, no quotes.",
      prompt: `Summarize this conversation:\n\n${transcript}`,
      maxOutputTokens: 220,
      temperature: 0.3,
      abortSignal: AbortSignal.timeout(8000),
    });
    const summary = text.trim().replace(/^["']|["']$/g, "").slice(0, 1000);
    if (!summary) return;
    await db
      .update(embedWidgetSessions)
      .set({
        conversationSummary: summary,
        summaryUpdatedAt: new Date(),
      })
      .where(eq(embedWidgetSessions.id, sessionId));
    logger.info("[embed/chat] summary refreshed", {
      churchId,
      sessionId,
      summaryLength: summary.length,
    });
  } catch (err) {
    // Non-fatal. The session keeps its previous summary; next turn
    // will try again.
    logger.warn("[embed/chat] summary generation failed", {
      error: err instanceof Error ? err.message : String(err),
    });
  }
}

function buildWidgetSystemPrompt({
  churchName,
  priorSummary,
  prospectCaptured,
}: {
  churchName: string;
  priorSummary: string | null;
  prospectCaptured: boolean;
}): string {
  const summaryBlock = priorSummary
    ? `\n\nPrior conversation context (visitor has chatted before on this site; their history is summarized below — they do NOT see these messages in the UI, so refer back only if relevant):\n"""\n${priorSummary}\n"""\n`
    : "";

  // Two distinct prompts — when the prospect is already captured we
  // describe ONLY the search tool (captureProspect is literally not
  // registered for this request, see the POST handler). Telling the
  // model about a tool it can't call would just produce tool-call
  // attempts that the SDK rejects.
  const toolsSection = prospectCaptured
    ? `You have one tool:
1. \`search\` — returns content from the church's library (sermons, documents, videos, teachings). ALWAYS use it at least once before answering questions about the church's specific teaching. Use it multiple times with different queries if the first search is thin.

This visitor has already shared their contact info with us earlier in the conversation — do NOT ask for it again. Focus entirely on answering their questions.`
    : `You have two tools:
1. \`search\` — returns content from the church's library (sermons, documents, videos, teachings). ALWAYS use it at least once before answering questions about the church's specific teaching. Use it multiple times with different queries if the first search is thin.
2. \`captureProspect\` — records the visitor's contact info so a pastor or someone from the church can follow up personally. AT LEAST ONE of \`email\` or \`phone\` is required; \`name\` is optional but include it whenever the visitor has shared it. Call this tool ONLY when the visitor has actually given you their info in their messages (extract them from what they've written). Do NOT invent or guess values.

CRITICAL — ASK FOR FOLLOW-UP CONTACT IMMEDIATELY:
On your VERY FIRST response in this conversation, after you answer their question, ALWAYS invite the visitor to share a phone number or email address so a pastor or someone from ${churchName} can follow up with more information. Phrase it warmly and naturally — make clear it's so the church can serve them better, not for marketing. Either phone or email is fine; if they share their name too, that's helpful but not required.

If they don't share contact info on their reply, you may gently bring it up ONE more time later in the conversation, but do not pester. The moment the visitor provides an email or a phone (or both), call \`captureProspect\` immediately and then briefly thank them.`;

  return `You are the AI assistant embedded on ${churchName}'s website. The person you're chatting with is a WEBSITE VISITOR — they may be curious, investigating whether this church is a good fit, or looking for specific information. They are not necessarily a member.${summaryBlock}

${toolsSection}

Tone:
- Warm and welcoming. This is often a visitor's first touchpoint.
- Short answers — 1 to 3 short paragraphs. Visitors on a website are skimming, not settling in.
- When the church has clearly taught on the topic, ground the answer in that teaching and cite it.
- When the church has not taught on the topic directly, be honest: "I didn't find anything in our teaching library on that specific question — would you like me to have someone from the church follow up?" Do not invent a position.

Citations:
Each search result has a "documentId" field (UUID). When you reference a source, emit:

  <document>DOCUMENT_ID</document>

Rules:
- The tag must contain the UUID between the opening and closing tags.
- Place each citation on its own line with blank lines before and after.
- Never emit a bare or empty tag. Never put a tag inside a sentence.
- 1-2 citations total for the response — the single most relevant source per point.
- NEVER cite the same documentId more than once in a response. If you'd reference the same source again, just continue without a tag.

NEVER echo raw tool output:
The \`search\` tool returns JSON-formatted data for YOUR context only. Read it, paraphrase what's useful into natural English prose, and emit a \`<document>\` tag for each citation. Under no circumstances write JSON syntax in your response — no curly braces \`{ }\` as data delimiters, no field names like \`chunkContent\`, \`documentId\`, \`documentTitle\`, \`documentType\`, \`sourceUrl\`, \`heading\`, \`resultNumber\`, no \`":"\` key-value pairs, no fragments like \`","chunkContent":"\`. If you find yourself about to write any of those, stop and rephrase as plain English. The visitor must never see the raw search payload.

Bible quotations:
- You may quote scripture from memory. Always include book, chapter, verse.
- Default to NIV unless the user specifies another translation.
- Cap: 15 verses total per response. Don't quote whole chapters — summarize and point to a Bible app.
- When you directly quote, append (once per response, at the end, in italics):
  *Scripture quotations taken from the Holy Bible, New International Version®, NIV®. Copyright © 1973, 1978, 1984, 2011 by Biblica, Inc.® Used by permission. All rights reserved worldwide.*

If the search tool returns noResults:
Say you didn't find specific teaching on the topic, offer to connect them with the church, and — if it's a general Bible or theology question — you may share a short, humble answer that starts with "Speaking generally…" Never present general answers as if they came from the church.`;
}

/**
 * Detect tool-result JSON bleeding into the visible response. Mercury
 * 2 occasionally echoes a fragment of its `search` tool output when
 * the result set is large or the prompt is long — the user-visible
 * answer ends with something like `…","chunkContent":"…"` followed by
 * the entire payload. Stop sequences catch most of these in the model,
 * but the regex is defense-in-depth.
 *
 * The keys below are unique to `chunksToMetadata` / search-tool output
 * and don't appear in natural prose with a colon directly after a
 * closing quote. Returns -1 if the text is clean.
 */
function findToolOutputLeakIndex(text: string): number {
  const m = /"(chunkContent|resultNumber|documentId|documentTitle|documentType|sourceUrl)"\s*:/.exec(
    text
  );
  return m ? m.index : -1;
}

/**
 * When truncating a leaked response, walk back to the last clean
 * sentence/paragraph boundary so the visitor doesn't see a half-word
 * dangling. Only honors the boundary if it preserves more than half
 * the text — past that, the leak hit early enough that showing
 * "[clean prefix]" is worse than showing nothing useful.
 */
function trimToCleanBoundary(text: string): string {
  const boundary = Math.max(
    text.lastIndexOf("\n\n"),
    text.lastIndexOf("\n"),
    text.lastIndexOf(". "),
    text.lastIndexOf("? "),
    text.lastIndexOf("! ")
  );
  if (boundary > text.length / 2) {
    return text.slice(0, boundary).replace(/\s+$/, "");
  }
  return text.replace(/\s+$/, "");
}

function chunksToMetadata(chunks: RetrievedChunk[]): Citation[] {
  const seen = new Set<string>();
  const unique: RetrievedChunk[] = [];
  for (const c of chunks) {
    if (seen.has(c.documentId)) continue;
    seen.add(c.documentId);
    unique.push(c);
  }
  return unique.map((chunk, i) => ({
    index: i + 1,
    documentId: chunk.documentId,
    documentTitle: chunk.documentTitle,
    documentType: chunk.documentType,
    sourceUrl: chunk.sourceUrl,
    heading: chunk.heading,
    startTime: chunk.startTime,
    endTime: chunk.endTime,
    pageNumber: chunk.pageNumber,
    chunkContent:
      chunk.content.length > 300
        ? chunk.content.slice(0, 300) + "..."
        : chunk.content,
  }));
}

const EMAIL_RX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
// Lenient phone shape: must start with `+` or a digit and contain
// 7–30 chars total drawn from digits and common separators (space,
// dash, parens, dot). We deliberately don't normalize to E.164 — a
// pastor can read "+44 7700 900123" or "(555) 555-1234" just fine,
// and stripping formatting before storage loses information visitors
// expect to see preserved.
const PHONE_RX = /^[+\d][\d\s().-]{6,29}$/;

/**
 * Shared state the captureProspect tool writes into so the outer
 * stream handler can emit the `__PROSPECT__` sentinel to the widget
 * and mark the session as captured. We use a mutable object (not a
 * return value) because the Vercel AI SDK doesn't give us a clean
 * way to plumb tool-result state out of the streamText callback.
 */
interface ProspectCaptureState {
  captured: boolean;
  prospectId: string | null;
  name: string | null;
  email: string | null;
  phone: string | null;
}

function createCaptureProspectTool({
  churchId,
  chatId,
  sessionId,
  originUrl,
  originPageTitle,
  captureState,
}: {
  churchId: string;
  chatId: string;
  sessionId: string;
  originUrl: string | null;
  originPageTitle: string | null;
  captureState: ProspectCaptureState;
}): Tool<{ name?: string; email?: string; phone?: string }, unknown> {
  return {
    description:
      "Save the visitor's contact info so a pastor or someone from the church can follow up. AT LEAST ONE of `email` or `phone` is required — `name` is optional. Call this ONLY when the visitor has actually provided their info in their messages; do not invent or guess values.",
    inputSchema: jsonSchema<{ name?: string; email?: string; phone?: string }>({
      type: "object",
      properties: {
        name: {
          type: "string",
          description:
            "The visitor's name as they wrote it. Trim whitespace. Optional — include only when the visitor has shared their name.",
        },
        email: {
          type: "string",
          description:
            "The visitor's email address, lowercased. Optional if a phone number is provided. At least one of email or phone is required.",
        },
        phone: {
          type: "string",
          description:
            "The visitor's phone number as they typed it (preserve country code, dashes, parens). Optional if an email is provided. At least one of email or phone is required.",
        },
      },
      required: [],
    }),
    execute: async ({ name, email, phone }) => {
      // Early-return if we've already captured this turn — prevents
      // the model from double-calling the tool in the same response.
      if (captureState.captured) {
        return {
          ok: true,
          alreadyCaptured: true,
          message: "Already saved in this turn. Acknowledge and move on.",
        };
      }

      const trimmedName = (name ?? "").trim().slice(0, 120);
      const cleanName = trimmedName.length >= 2 ? trimmedName : null;
      const cleanEmailRaw = (email ?? "").trim().toLowerCase().slice(0, 254);
      const cleanEmail = cleanEmailRaw.length > 0 ? cleanEmailRaw : null;
      const cleanPhoneRaw = (phone ?? "").trim().slice(0, 30);
      const cleanPhone = cleanPhoneRaw.length > 0 ? cleanPhoneRaw : null;

      if (cleanEmail && !EMAIL_RX.test(cleanEmail)) {
        return {
          ok: false,
          reason: "email_invalid",
          message:
            "That email doesn't look valid. Ask the visitor to re-share it.",
        };
      }
      if (cleanPhone && !PHONE_RX.test(cleanPhone)) {
        return {
          ok: false,
          reason: "phone_invalid",
          message:
            "That phone number doesn't look valid. Ask the visitor to re-share it.",
        };
      }
      if (!cleanEmail && !cleanPhone) {
        return {
          ok: false,
          reason: "no_contact",
          message:
            "Need at least an email or a phone number. Ask the visitor for one before calling this tool again.",
        };
      }

      try {
        // Merge on return: prefer email-key when present (the more
        // common stable identifier), fall back to phone-key for
        // phone-only captures. Both unique constraints are partial
        // (NULLs treated as distinct), so multiple email-only and
        // multiple phone-only rows for a church coexist cleanly.
        const existing = cleanEmail
          ? await db.query.prospects.findFirst({
              where: and(
                eq(prospects.churchId, churchId),
                eq(prospects.email, cleanEmail)
              ),
            })
          : cleanPhone
          ? await db.query.prospects.findFirst({
              where: and(
                eq(prospects.churchId, churchId),
                eq(prospects.phone, cleanPhone)
              ),
            })
          : null;
        let prospectId: string;
        if (existing) {
          const prior = existing.metadata?.sessionHistory ?? [];
          const sessionHistory = Array.from(
            new Set([...prior, sessionId])
          );
          await db
            .update(prospects)
            .set({
              // Update fields opportunistically — keep prior values
              // when this turn didn't supply something.
              name: cleanName ?? existing.name,
              email: cleanEmail ?? existing.email,
              phone: cleanPhone ?? existing.phone,
              metadata: {
                ...(existing.metadata ?? {}),
                sessionHistory,
                lastSeenAt: new Date().toISOString(),
              },
              updatedAt: new Date(),
            })
            .where(eq(prospects.id, existing.id));
          prospectId = existing.id;
        } else {
          const [inserted] = await db
            .insert(prospects)
            .values({
              churchId,
              chatId,
              sessionId,
              name: cleanName,
              email: cleanEmail,
              phone: cleanPhone,
              // Distinct source_ref from the form-based capture ("embed_widget")
              // so admins can spot tool-captures if they ever need to.
              sourceType: "embed_widget",
              sourceRef: `tool:${sessionId}`,
              sourceUrl: originUrl ?? null,
              metadata: {
                sessionHistory: [sessionId],
                firstSeenAt: new Date().toISOString(),
                ...(originPageTitle
                  ? { sourcePageTitle: originPageTitle.slice(0, 300) }
                  : {}),
              },
            })
            .returning({ id: prospects.id });
          prospectId = inserted.id;
        }

        // Link the session to the prospect for the transcript UI.
        await db
          .update(embedWidgetSessions)
          .set({ prospectId, lastSeenAt: new Date() })
          .where(eq(embedWidgetSessions.id, sessionId));

        captureState.captured = true;
        captureState.prospectId = prospectId;
        captureState.name = cleanName;
        captureState.email = cleanEmail;
        captureState.phone = cleanPhone;

        logger.info("[embed/chat] prospect captured via tool", {
          churchId,
          prospectId,
          sessionId,
          merged: !!existing,
          hasEmail: !!cleanEmail,
          hasPhone: !!cleanPhone,
          hasName: !!cleanName,
        });

        return {
          ok: true,
          message:
            "Saved. Briefly thank the visitor and let them know someone from the church will follow up.",
        };
      } catch (err) {
        logger.error("[embed/chat] prospect tool failed", {
          error: err instanceof Error ? err.message : String(err),
        });
        return {
          ok: false,
          reason: "server_error",
          message:
            "Couldn't save just now. Apologize briefly and suggest they try again.",
        };
      }
    },
  };
}

function createSearchTool(churchId: string): Tool<{ query: string }, unknown> {
  return {
    description:
      "Search the church's content library (sermons, documents, videos, teachings). Returns relevant passages with document metadata.",
    inputSchema: jsonSchema<{ query: string }>({
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "Specific search query tied to the visitor's question.",
        },
      },
      required: ["query"],
    }),
    execute: async ({ query }) => {
      const SEMANTIC_THRESHOLD = 0.3;
      const KEYWORD_THRESHOLD = 0.01;
      const results = await hybridSearch(churchId, query, 6, "member");
      const relevant = results.filter(
        (c) =>
          (typeof c.semanticSimilarity === "number" &&
            c.semanticSimilarity >= SEMANTIC_THRESHOLD) ||
          (typeof c.keywordRank === "number" &&
            c.keywordRank >= KEYWORD_THRESHOLD)
      );
      if (relevant.length === 0) {
        return {
          noResults: true,
          message:
            "No specific teaching found in this church's library. Offer to connect the visitor with someone from the church.",
        };
      }
      return relevant.map((c, i) => ({
        resultNumber: i + 1,
        documentId: c.documentId,
        documentTitle: c.documentTitle,
        documentType: c.documentType,
        sourceUrl: c.sourceUrl || undefined,
        heading: c.heading || undefined,
        startTime: c.startTime,
        endTime: c.endTime,
        pageNumber: c.pageNumber,
        content: c.content,
      }));
    },
  };
}

function extractSearchResults(steps: unknown[]): RetrievedChunk[] {
  const out: RetrievedChunk[] = [];
  const seen = new Set<string>();
  for (const step of steps) {
    const s = step as Record<string, unknown>;
    const toolResults = s.toolResults as
      | Array<Record<string, unknown>>
      | undefined;
    if (!toolResults) continue;
    for (const tr of toolResults) {
      const output = (tr.output ?? tr.result) as unknown;
      if (tr.toolName !== "search" || !Array.isArray(output)) continue;
      for (const item of output as Record<string, unknown>[]) {
        const docId = item.documentId as string;
        const content = item.content as string;
        if (!docId || !content) continue;
        const key = `${docId}:${content}`;
        if (seen.has(key)) continue;
        seen.add(key);
        out.push({
          chunkId: `${docId}-${out.length}`,
          documentId: docId,
          documentTitle: (item.documentTitle as string) || "Untitled",
          documentType:
            (item.documentType as RetrievedChunk["documentType"]) || "platejs",
          content,
          sourceUrl: (item.sourceUrl as string) || undefined,
          heading: (item.heading as string) || undefined,
          startTime: item.startTime != null ? Number(item.startTime) : undefined,
          endTime: item.endTime != null ? Number(item.endTime) : undefined,
          pageNumber:
            item.pageNumber != null ? Number(item.pageNumber) : undefined,
        });
      }
    }
  }
  return out;
}

export async function OPTIONS(request: Request) {
  const key = readKey(request);
  if (!key) return new NextResponse(null, { status: 400 });
  return handleOptions(request, key);
}

export async function POST(request: Request) {
  const key = readKey(request);
  if (!key) return new NextResponse("missing key", { status: 400 });

  const originCheck = await checkOrigin(request, key);
  if (!originCheck.ok || !originCheck.origin) {
    return new NextResponse("origin not allowed", { status: 403 });
  }
  const cors = corsHeaders(originCheck.origin);

  const secFetchReason = checkSecFetchHeaders(request);
  if (secFetchReason) {
    logger.warn("[embed/chat] sec-fetch reject", { reason: secFetchReason });
    return new NextResponse("bad request", { status: 400, headers: cors });
  }

  const token = request.headers.get("x-doctrinally-session");
  const verified = verifyToken(token);
  if (!verified.ok) {
    return new NextResponse(`unauthorized: ${verified.reason}`, {
      status: 401,
      headers: cors,
    });
  }
  if (verified.value.origin !== originCheck.origin) {
    return new NextResponse("origin mismatch", {
      status: 401,
      headers: cors,
    });
  }

  // Fast-path in-memory rate limit.
  if (!consumeToken("chat:session", verified.value.sessionId)) {
    return new NextResponse("rate limited", { status: 429, headers: cors });
  }
  if (!consumeToken("chat:church", verified.value.churchId)) {
    return new NextResponse("rate limited (church)", {
      status: 429,
      headers: cors,
    });
  }

  // Look up the session + plan + sub in parallel.
  const [session, sub] = await Promise.all([
    db.query.embedWidgetSessions.findFirst({
      where: eq(embedWidgetSessions.sessionTokenHash, verified.value.tokenHash),
    }),
    db.query.subscriptions.findFirst({
      where: eq(subscriptions.churchId, verified.value.churchId),
    }),
  ]);

  if (!session) {
    return new NextResponse("session not found", {
      status: 401,
      headers: cors,
    });
  }

  // Session-IP binding: a stolen token replayed from a 4th distinct
  // IP fails here. Side-effect — bumps `lastSeenAt` on the matching
  // IP entry or appends a new one (capped at MAX_IPS_PER_SESSION).
  const ipHash = hashIp(getRequestIp(request));
  const ipCheck = await verifyAndUpdateSessionIp({
    sessionId: session.id,
    ipHash,
  });
  if (!ipCheck.ok) {
    logger.warn("[embed/chat] ip cap exceeded", {
      sessionId: verified.value.sessionId,
      ipsUsed: ipCheck.ipsUsed,
    });
    return new NextResponse("session bound to too many IPs", {
      status: 401,
      headers: cors,
    });
  }

  if (!sub || !(await isEmbeddedChatAvailable(verified.value.churchId, sub.plan))) {
    return new NextResponse("widget not enabled", {
      status: 403,
      headers: cors,
    });
  }
  if (!["active", "trialing", "past_due"].includes(sub.status)) {
    return new NextResponse("subscription inactive", {
      status: 403,
      headers: cors,
    });
  }

  // Behavioral gate — block chat until the session has seen at least
  // one scroll/mouse/key event (posted by the widget via a separate
  // interaction endpoint or piggybacked on the config call). Reject
  // messages that fire within 2 s of session creation.
  const ageMs = Date.now() - session.createdAt.getTime();
  if (!session.hasInteracted || ageMs < 2000) {
    // First message auto-marks interaction — the visitor IS the
    // interaction at this point. But we still require the 2-s age so
    // a scripted attacker can't chain session-create → message → …
    // in one burst.
    if (ageMs < 2000) {
      return new NextResponse("too fast", { status: 429, headers: cors });
    }
  }

  // Authoritative per-session, per-hour cap. One DB round-trip,
  // multi-region safe.
  const hardCap = await incrementAndCheckHardCap({
    sessionId: verified.value.sessionId,
    hardCapPerHour: HARD_CAP_PER_HOUR,
  });
  if (!hardCap.ok) {
    return new NextResponse("hourly cap exceeded", {
      status: 429,
      headers: cors,
    });
  }

  // Per-CHURCH hourly cap — defends the monthly message budget
  // against many-sessions-coordinating abuse. A successful budget
  // DoS used to take ~30 minutes; with this cap it takes 7+ hours,
  // long enough that monitoring + manual response can intervene.
  const churchCap = await incrementAndCheckChurchHourlyChatCap({
    churchId: verified.value.churchId,
  });
  if (!churchCap.ok) {
    logger.warn("[embed/chat] church hourly cap exceeded", {
      churchId: verified.value.churchId,
      count: churchCap.count,
      limit: churchCap.limit,
    });
    return new NextResponse(
      JSON.stringify({
        error: "church_hourly_cap_exceeded",
        message:
          "This church's chat is temporarily unavailable. Please try again in an hour.",
      }),
      {
        status: 429,
        headers: { ...cors, "Content-Type": "application/json" },
      }
    );
  }

  // Message-limit check — same pool as the member chat.
  const [msgLimit, currentUsage] = await Promise.all([
    getEffectiveMessageLimit(verified.value.churchId),
    getCurrentUsage(verified.value.churchId),
  ]);
  if (
    msgLimit &&
    currentUsage &&
    currentUsage.questions >= msgLimit.effectiveMax
  ) {
    return new NextResponse(
      JSON.stringify({
        error: "message_limit_reached",
        message:
          "The church has reached its monthly message limit. Please try again next month or contact the church directly.",
      }),
      {
        status: 403,
        headers: { ...cors, "Content-Type": "application/json" },
      }
    );
  }

  const body = await request.json().catch(() => null);
  if (!body || !Array.isArray(body.messages)) {
    return new NextResponse("bad request", { status: 400, headers: cors });
  }
  const clientMessages = body.messages as Array<{
    role: "user" | "assistant";
    content: string;
  }>;

  const lastUser = [...clientMessages].reverse().find((m) => m.role === "user");
  if (!lastUser) {
    return new NextResponse("no user message", {
      status: 400,
      headers: cors,
    });
  }

  // 1000-character input cap.
  const lenError = validateUserMessageLength(lastUser.content);
  if (lenError) {
    return new NextResponse(
      JSON.stringify({
        error: "message_too_long",
        message: lenError,
        limit: MAX_USER_MESSAGE_CHARS,
      }),
      {
        status: 400,
        headers: { ...cors, "Content-Type": "application/json" },
      }
    );
  }

  // Flip the interaction flag on first message so subsequent sessions
  // skip the gate. Always-on-first-message is fine because a scripted
  // attacker still has to pay the 2-s age cost above.
  if (!session.hasInteracted) {
    await db
      .update(embedWidgetSessions)
      .set({ hasInteracted: true, lastSeenAt: new Date() })
      .where(eq(embedWidgetSessions.id, session.id));
  } else {
    await db
      .update(embedWidgetSessions)
      .set({ lastSeenAt: new Date() })
      .where(eq(embedWidgetSessions.id, session.id));
  }

  const church = await db.query.churches.findFirst({
    where: eq(churches.id, verified.value.churchId),
    columns: { name: true },
  });
  const churchName = church?.name ?? "this church";

  const systemPrompt = buildWidgetSystemPrompt({
    churchName,
    priorSummary: session.conversationSummary,
    prospectCaptured: !!session.prospectId,
  });
  const coreMessages = clientMessages.map((m) => ({
    role: m.role,
    content: m.content,
  }));
  const lastMessage = coreMessages.at(-1);
  const olderMessages = coreMessages.slice(0, -1);
  const trimmedOlder = lastMessage
    ? trimHistoryToBudget(olderMessages, {
        systemPromptTokens: estimateTokens(systemPrompt),
        ragContextTokens: 0,
        currentUserTokens: estimateMessageTokens(lastMessage),
        totalBudget: TOTAL_TOKEN_BUDGET,
        outputReserve: OUTPUT_RESERVE,
      })
    : [];
  const messagesToSend = lastMessage
    ? [...trimmedOlder, lastMessage]
    : coreMessages;

  const chatId = session.chatId;
  const prospectAlreadyCaptured = !!session.prospectId;

  // Mutable capture state so the tool can report back to the outer
  // handler. `captureProspect` writes to the DB inline; this object
  // just tracks "did the tool run?" so we can emit the sentinel and
  // update session state after streaming completes.
  const captureState: ProspectCaptureState = {
    captured: false,
    prospectId: null,
    name: null,
    email: null,
    phone: null,
  };

  logger.info("[embed/chat] request", {
    churchId: verified.value.churchId,
    chatId,
    sessionId: verified.value.sessionId,
    model: process.env.AI_MODEL || DEFAULT_MODEL,
    messageCount: messagesToSend.length,
    hasPriorSummary: !!session.conversationSummary,
    prospectAlreadyCaptured,
  });

  // One prospect per session. Once `session.prospectId` is set — via
  // the captureProspect tool OR the inline form — the tool is no
  // longer registered on subsequent requests. This makes the
  // "capture only once" rule enforced by the SDK's tool registry,
  // not by model compliance. A jailbroken model literally cannot
  // call a tool it doesn't have.
  //
  // Within a single turn, the tool's own `alreadyCaptured` guard
  // still fires — the model could call the tool twice in one
  // response, and we want the second call to no-op even though the
  // registry can't be hot-swapped mid-stream.
  const searchTool = createSearchTool(verified.value.churchId);
  const result = streamText({
    model: getModel(),
    system: systemPrompt,
    messages: messagesToSend,
    tools: prospectAlreadyCaptured
      ? { search: searchTool }
      : {
          search: searchTool,
          captureProspect: createCaptureProspectTool({
            churchId: verified.value.churchId,
            chatId,
            sessionId: verified.value.sessionId,
            originUrl: session.metadata?.lastPageUrl ?? originCheck.origin,
            originPageTitle: session.metadata?.lastPageTitle ?? null,
            captureState,
          }),
        },
    stopWhen: stepCountIs(6),
    maxOutputTokens: 900,
    // Stop sequences serve two purposes here. The HTML fragments
    // (`<b>`, `</b>`, `<br`, `</br`) catch a markdown-bleed bug where
    // the model would start emitting raw HTML tags instead of
    // markdown. The JSON-key fragments catch the model leaking its
    // tool-result JSON into the visible response — Mercury 2 sometimes
    // echoes a `","chunkContent":"…` fragment when the search results
    // crowd its context, and these stops halt generation before the
    // payload bleeds through. The post-stream scrub below is the
    // belt-and-suspenders backstop if any of these slip past.
    stopSequences: [
      "<b>",
      "</b>",
      "<br",
      "</br",
      '"chunkContent"',
      '"resultNumber"',
      '"documentId"',
    ],
    temperature: 0.7,
  });

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      try {
        let fullText = "";
        let leakTruncated = false;
        for await (const chunk of result.textStream) {
          if (!chunk) continue;
          // Once a leak has been detected and the stream truncated,
          // drop everything else the model emits — we already cut
          // cleanly and don't want late tokens reopening the wound.
          if (leakTruncated) continue;

          const candidate = fullText + chunk;
          const leakIdx = findToolOutputLeakIndex(candidate);
          if (leakIdx === -1) {
            fullText = candidate;
            controller.enqueue(encoder.encode(CHUNK_BOUNDARY + chunk));
            continue;
          }

          // Tool-result JSON started leaking. Enqueue only the clean
          // prefix from this chunk, snap to a sentence boundary for
          // the persisted copy, and stop streaming further tokens.
          const safeText = trimToCleanBoundary(candidate.slice(0, leakIdx));
          if (safeText.length > fullText.length) {
            const cleanChunk = chunk.slice(0, safeText.length - fullText.length);
            if (cleanChunk) {
              controller.enqueue(encoder.encode(CHUNK_BOUNDARY + cleanChunk));
            }
          }
          fullText = safeText;
          leakTruncated = true;
          logger.warn("[embed/chat] tool-output leak in stream — truncated", {
            churchId: verified.value.churchId,
            chatId,
            sessionId: verified.value.sessionId,
            leakIndex: leakIdx,
            keptChars: fullText.length,
          });
        }

        // Defensive backstop: if the per-chunk check somehow missed a
        // leak (a stop sequence fired mid-key, two-chunk straddle,
        // etc.), scrub fullText once more before the citation
        // sentinels go on the wire and before we persist.
        if (!leakTruncated) {
          const leakIdxFinal = findToolOutputLeakIndex(fullText);
          if (leakIdxFinal !== -1) {
            fullText = trimToCleanBoundary(fullText.slice(0, leakIdxFinal));
            logger.warn("[embed/chat] tool-output leak post-stream — truncated", {
              churchId: verified.value.churchId,
              chatId,
              sessionId: verified.value.sessionId,
              leakIndex: leakIdxFinal,
              keptChars: fullText.length,
            });
          }
        }

        const steps = await result.steps;
        const searchResults = extractSearchResults(steps as unknown[]);
        const citations = chunksToMetadata(searchResults);

        controller.enqueue(encoder.encode(CHAT_ID_SENTINEL + chatId));
        if (citations.length > 0) {
          controller.enqueue(
            encoder.encode(
              CITATION_SENTINEL + JSON.stringify(citations)
            )
          );
        }
        // Emit a prospect sentinel when the captureProspect tool
        // fired — the widget uses this to flip `prospectCaptured` so
        // the tool isn't registered on future requests. The widget
        // doesn't surface name/email/phone in its UI, but we still
        // ship them in the payload for completeness so any debug
        // tooling can see what was captured.
        if (captureState.captured) {
          controller.enqueue(
            encoder.encode(
              PROSPECT_SENTINEL +
                JSON.stringify({
                  prospectId: captureState.prospectId,
                  name: captureState.name,
                  email: captureState.email,
                  phone: captureState.phone,
                })
            )
          );
        }
        controller.close();

        // Persist both sides of the turn. Anonymous chat — `userId`
        // stays null. Messages go into the same table as the member
        // chat so `/prospects/[id]` can reuse the existing transcript
        // UI patterns.
        try {
          await db.insert(messages).values({
            chatId,
            role: "user",
            content: lastUser.content,
          });
          const cleanText = fullText.replace(
            /<document>[^<]*<\/document>/g,
            ""
          );
          await db.insert(messages).values({
            chatId,
            role: "assistant",
            content: cleanText,
            citations:
              citations.length > 0
                ? (citations as unknown as Record<string, unknown>[])
                : null,
            hasCitations: citations.length > 0,
          });
          await db
            .update(chats)
            .set({ updatedAt: new Date() })
            .where(eq(chats.id, chatId));
          await incrementQuestionCount(verified.value.churchId);
        } catch (err) {
          logger.error("[embed/chat] failed to persist", {
            error: err instanceof Error ? err.message : String(err),
          });
        }

        // Fire-and-forget conversation summary update. Runs Mercury 2
        // against the most recent messages and writes back to
        // `embed_widget_sessions.conversation_summary`. Intentionally
        // not awaited — the visitor's response stream is already done
        // and this only affects the NEXT turn's context injection.
        // Internally debounced (5 min TTL + 4-message min delta) so a
        // chatty session doesn't trigger an LLM call on every turn.
        refreshConversationSummary({
          churchId: verified.value.churchId,
          chatId,
          sessionId: verified.value.sessionId,
          lastSummaryUpdatedAt: session.summaryUpdatedAt ?? null,
        }).catch((err) => {
          logger.warn("[embed/chat] summary refresh failed", {
            error: err instanceof Error ? err.message : String(err),
          });
        });
      } catch (err) {
        controller.error(err);
      }
    },
  });

  return new Response(stream, {
    headers: {
      ...cors,
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-cache",
    },
  });
}
