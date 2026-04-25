import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { generateText } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { db } from "@/db";
import {
  churches,
  embedWidgetSessions,
  messages,
  subscriptions,
} from "@/db/schema";
import {
  checkOrigin,
  checkSecFetchHeaders,
  corsHeaders,
  handleOptions,
  readKey,
} from "@/lib/embed/origin";
import { verifyToken } from "@/lib/embed/session-token";
import { consumeToken } from "@/lib/embed/rate-limit";
import { isEmbeddedChatAvailable } from "@/lib/plan-gating";
import {
  getRequestIp,
  hashIp,
  verifyAndUpdateSessionIp,
} from "@/lib/embed/ip";
import {
  getCurrentUsage,
  getEffectiveMessageLimit,
} from "@/lib/usage";
import { logger } from "@/lib/logger";

/**
 * Proactive outreach opener — fired once per session after the
 * visitor pauses while reading. Returns a short assistant line that
 * the widget shows as the first message, with an unread-dot animation
 * on the launcher.
 *
 * Always AI-generated via `mercury-2`. If the model can't produce a
 * line in time (timeout, error, throttle hit, monthly budget cap), we
 * skip outreach for this visitor — no fallback message is sent and
 * `outreachSentAt` is left unset so a future page nav can retry.
 *
 * Server-side enforcement of "once per session" is authoritative —
 * the widget also holds a localStorage flag but the server's
 * `outreach_sent_at` is what stops abuse.
 */

export const runtime = "nodejs";

const AI_TIMEOUT_MS = 1500;
const DEFAULT_MODEL = "mercury-2";

const inception = createOpenAI({
  baseURL:
    process.env.INCEPTION_BASE_URL || "https://api.inceptionlabs.ai/v1",
  apiKey: process.env.INCEPTION_API_KEY,
});

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
    logger.warn("[embed/outreach] sec-fetch reject", { reason: secFetchReason });
    return new NextResponse("bad request", { status: 400, headers: cors });
  }

  const token = request.headers.get("x-doctrinally-session");
  const verifyResult = verifyToken(token);
  if (!verifyResult.ok || verifyResult.value.origin !== originCheck.origin) {
    return new NextResponse("unauthorized", { status: 401, headers: cors });
  }
  const verified = verifyResult.value;

  const session = await db.query.embedWidgetSessions.findFirst({
    where: eq(embedWidgetSessions.sessionTokenHash, verified.tokenHash),
  });
  if (!session) {
    return new NextResponse("session not found", {
      status: 401,
      headers: cors,
    });
  }

  // Session-IP binding (same gate as /chat).
  const ipHash = hashIp(getRequestIp(request));
  const ipCheck = await verifyAndUpdateSessionIp({
    sessionId: session.id,
    ipHash,
  });
  if (!ipCheck.ok) {
    logger.warn("[embed/outreach] ip cap exceeded", {
      sessionId: verified.sessionId,
      ipsUsed: ipCheck.ipsUsed,
    });
    return new NextResponse("session bound to too many IPs", {
      status: 401,
      headers: cors,
    });
  }

  if (session.outreachSentAt) {
    // Server-side "already sent" guard — stops double-fires from
    // race conditions in the client (e.g. tab background/foreground
    // flaps) and makes "reload the page" not reset the counter.
    return new NextResponse("already_sent", {
      status: 409,
      headers: cors,
    });
  }

  const church = await db.query.churches.findFirst({
    where: eq(churches.id, verified.churchId),
    columns: {
      id: true,
      name: true,
      embedProactiveOutreachEnabled: true,
    },
  });
  if (!church || !church.embedProactiveOutreachEnabled) {
    return new NextResponse("outreach disabled", {
      status: 404,
      headers: cors,
    });
  }

  const sub = await db.query.subscriptions.findFirst({
    where: eq(subscriptions.churchId, verified.churchId),
  });
  if (!sub || !(await isEmbeddedChatAvailable(verified.churchId, sub.plan))) {
    return new NextResponse("widget not enabled", {
      status: 403,
      headers: cors,
    });
  }

  const body = (await request.json().catch(() => ({}))) as {
    visibleText?: string;
    pageUrl?: string;
    pageTitle?: string;
  };
  const visibleText = (body.visibleText || "").slice(0, 2000);

  // Per-church throttle. Skip outreach when exceeded.
  if (!consumeToken("outreach:church", verified.churchId)) {
    return new NextResponse("throttled", { status: 503, headers: cors });
  }

  // Backend cost-protection gate: skip the AI call when the church is
  // already at its monthly question cap. AI openers don't bill the
  // church, but we don't want to eat Inception API costs on top of an
  // already-overbudget account.
  const [msgLimit, currentUsage] = await Promise.all([
    getEffectiveMessageLimit(verified.churchId),
    getCurrentUsage(verified.churchId),
  ]);
  if (
    msgLimit &&
    currentUsage &&
    currentUsage.questions >= msgLimit.effectiveMax
  ) {
    return new NextResponse("over_budget", { status: 503, headers: cors });
  }

  // AI path with a hard 1.5 s timeout. On timeout/error/empty → skip.
  const aiController = new AbortController();
  const timeoutId = setTimeout(() => aiController.abort(), AI_TIMEOUT_MS);
  let opener: string;
  try {
    const aiPrompt = `You are the AI on ${church.name}'s website. A visitor just paused after reading the following content:

"""
${visibleText || "(no visible text captured)"}
"""

Write ONE short, warm opening line (max 2 sentences, under 200 characters) that:
- Acknowledges something specific from what they were reading
- Offers to help with a question
- Does NOT guess what they want — ask an open question

No lists. No markdown. No preamble. Just the opening line.`;

    const { text } = await generateText({
      model: inception.chat(process.env.AI_MODEL || DEFAULT_MODEL),
      system: `You write short, warm openings for a church's website chat widget. One short message, no more than two sentences.`,
      prompt: aiPrompt,
      maxOutputTokens: 140,
      temperature: 0.8,
      abortSignal: aiController.signal,
    });
    clearTimeout(timeoutId);
    const cleaned = text.trim().replace(/^["']|["']$/g, "").slice(0, 400);
    if (!cleaned) {
      return new NextResponse("ai_unavailable", {
        status: 503,
        headers: cors,
      });
    }
    opener = cleaned;
  } catch (err) {
    clearTimeout(timeoutId);
    logger.warn("[embed/outreach] AI opener skipped", {
      error: err instanceof Error ? err.message : String(err),
    });
    return new NextResponse("ai_unavailable", { status: 503, headers: cors });
  }

  // Persist as the first assistant message of the conversation so
  // the widget's session-rehydrate path returns it on reload and
  // the member admin sees the outreach in the transcript.
  try {
    await db.insert(messages).values({
      chatId: session.chatId,
      role: "assistant",
      content: opener,
      citations: null,
      hasCitations: false,
    });
    await db
      .update(embedWidgetSessions)
      .set({
        outreachSentAt: new Date(),
        metadata: {
          ...(session.metadata ?? {}),
          lastPageUrl: body.pageUrl,
          lastPageTitle: body.pageTitle,
        },
      })
      .where(eq(embedWidgetSessions.id, session.id));
  } catch (err) {
    logger.error("[embed/outreach] persist failed", {
      error: err instanceof Error ? err.message : String(err),
    });
  }
  logger.info("[embed/outreach] sent", {
    churchId: verified.churchId,
    sessionId: verified.sessionId,
  });
  return NextResponse.json({ opener }, { headers: cors });
}
