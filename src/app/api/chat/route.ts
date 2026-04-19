import { streamText, tool, stepCountIs, jsonSchema, type Tool } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { getServerSession } from "next-auth";
import { eq, and } from "drizzle-orm";
import { db } from "@/db";
import { chats, messages, memberships, churches, subscriptions } from "@/db/schema";
import { authOptions } from "@/lib/auth";
import { hybridSearch } from "@/lib/retrieval";
import { incrementQuestionCount, getCurrentUsage, getEffectiveMessageLimit } from "@/lib/usage";
import { tasks } from "@trigger.dev/sdk/v3";
import type { Citation, RetrievedChunk } from "@/lib/types/citations";
import { logger } from "@/lib/logger";
import { isSuperAdminEmail } from "@/lib/super-admin";
import {
  estimateMessageTokens,
  estimateTokens,
  trimHistoryToBudget,
} from "@/lib/chat/tokens";

const TOTAL_TOKEN_BUDGET = 100_000;
const OUTPUT_RESERVE = 4_000;

interface ClientMessage {
  role: "user" | "assistant";
  content: string;
}

const inception = createOpenAI({
  baseURL: process.env.INCEPTION_BASE_URL || "https://api.inceptionlabs.ai/v1",
  apiKey: process.env.INCEPTION_API_KEY,
});

const DEFAULT_MODEL = "mercury-2";

function getModel() {
  const model = process.env.AI_MODEL || DEFAULT_MODEL;
  return inception.chat(model);
}

function buildSystemPrompt(
  churchName: string,
  fallbackInstruction?: string | null
): string {
  const fallbackLine = fallbackInstruction
    ? fallbackInstruction
    : `If your searches don't find relevant church-specific information, draw on general biblical knowledge but clearly say so.`;

  return `You are a helpful, knowledgeable assistant for ${churchName}. Your role is to answer questions using the Bible and the church's own teachings, sermons, and documents.

You have access to a search tool that lets you find relevant content from the church's library of sermons, documents, and videos. ALWAYS use the search tool at least once before answering — do not guess or make up information about the church's specific teachings. Search multiple times with different queries if the first search doesn't find what you need.

How to cite — READ CAREFULLY:
Each result from the search tool has a "documentId" field — a UUID like "07c6d2c8-4f91-4302-9cec-a06e0eaf5c20". When you reference information from a search result, emit a citation tag using the EXACT format:

  <document>DOCUMENT_ID</document>

where DOCUMENT_ID is copied verbatim from the result's documentId field. The ID goes BETWEEN the opening and closing tags.

STRICT RULES for <document> tags — violating these breaks citation rendering:
- Every <document> tag MUST contain a document ID between the opening and closing tags. Never emit an empty "<document></document>" or a bare "<document>" with no closing tag.
- The opening "<document>", the ID, and the closing "</document>" must all appear together on a single line.
- Place each <document>…</document> tag on its own line, with blank lines before and after. Never place a tag inside a sentence or paragraph.
- Include 1-3 citations total for the whole response — the single most relevant result per point you want to cite.

Other guidelines:
- Be warm, pastoral, and helpful. Speak in a way that is accessible to church members of all backgrounds.
- Keep responses focused and concise — typically 2-4 paragraphs. Only go longer when the user explicitly asks for a detailed explanation.

Bible quotations — copyright rules you MUST follow:
- You may quote Bible passages from memory. Always include the book, chapter, and verse reference (e.g. "John 3:16").
- Bible quotations are INDEPENDENT of the search tool. When the user asks you to quote, recite, or explain a specific Bible passage, answer from your own biblical knowledge even if the church's content library returns nothing. The fallback instruction below applies to questions about what THIS CHURCH teaches — it does NOT apply to direct requests for Bible verse text.
- Default to the New International Version (NIV) unless the user asks for a different translation. State the translation in parentheses after any direct quotation — e.g. 'For God so loved the world...' (John 3:16, NIV).
- HARD CAP: never quote more than 15 verses total in a single response, regardless of how many passages are referenced. If more scripture would help, summarize the additional passages in your own words and point the user to a Bible app for the full text.
- NEVER quote or reproduce an entire chapter or book of the Bible. If a user asks for a whole chapter (e.g. "give me all of Romans 8" or "quote the whole book of James"), decline politely and suggest they open a Bible app or website such as BibleGateway. You may briefly summarize the passage and quote a few key verses (within the 15-verse cap).
- Paraphrasing longer passages in your own words is preferred over long direct quotations.
- When your response contains one or more direct Bible quotations, append the following attribution block at the very end of the response, on its own paragraph, in italics using markdown (e.g. *Scripture...*):

  Scripture quotations taken from the Holy Bible, New International Version®, NIV®. Copyright © 1973, 1978, 1984, 2011 by Biblica, Inc.® Used by permission. All rights reserved worldwide.

  If you quoted a translation other than NIV, replace this attribution with the correct notice for that translation. If no Bible passage was quoted directly, omit the attribution entirely.

CRITICAL — When search returns NO results:
When the search tool returns a "noResults" response, it means the church's library does not contain content on this topic. When this happens you MUST follow the fallback instruction below EXACTLY. Do not deviate from it. Do not add your own answer before or after it. The fallback instruction is set by the church administrator and overrides your default behavior.

<fallback_instruction>
${fallbackLine.toUpperCase()}
</fallback_instruction>

Rules for applying the fallback instruction:
1. Read the fallback instruction carefully. If it tells you NOT to answer, you must NOT answer — not even with a disclaimer attached.
2. If the fallback instruction permits answering from general knowledge, you may do so, but clearly distinguish it from church-specific content.
3. If the fallback instruction tells you to redirect the user (e.g. to a pastor), do exactly that — do not answer the question first and then redirect.
4. Do NOT give a substantive answer and then add a disclaimer unless the fallback instruction explicitly permits general-knowledge answers. The pattern of "here's a full answer… but note this isn't from your church" violates a fallback that says not to answer.
5. NEVER present general knowledge as if it comes from the church's own materials.
6. You may offer to help rephrase the question so a different search might find something.

I REPEAT — THIS IS THE MOST IMPORTANT RULE. WHEN SEARCH RETURNS NO RESULTS, YOU MUST OBEY THE FOLLOWING FALLBACK INSTRUCTION EXACTLY AS WRITTEN. DO NOT ANSWER THE QUESTION YOURSELF. DO NOT ADD YOUR OWN KNOWLEDGE. DO NOT DEVIATE IN ANY WAY:
${fallbackLine.toUpperCase()}`;
}

function chunksToMetadata(chunks: RetrievedChunk[]): Citation[] {
  // Deduplicate by documentId — keep only the first (most relevant) chunk
  // per document so the same source doesn't appear as multiple citations.
  const seenDocs = new Set<string>();
  const unique: RetrievedChunk[] = [];
  for (const chunk of chunks) {
    if (seenDocs.has(chunk.documentId)) continue;
    seenDocs.add(chunk.documentId);
    unique.push(chunk);
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

function createSearchTool(churchId: string): Tool<{ query: string }, unknown> {
  return {
    description:
      "Search the church's content library (sermons, documents, videos, teachings) using keyword and semantic search. Returns relevant passages with document metadata. Always search before answering questions about the church's teachings.",
    inputSchema: jsonSchema<{ query: string }>({
      type: "object",
      properties: {
        query: {
          type: "string",
          description:
            "The search query. Be specific — include key terms, names, topics, or Bible references the user is asking about.",
        },
      },
      required: ["query"],
    }),
    execute: async ({ query }) => {
      // Per-scale relevance gates. A chunk is relevant if it passes EITHER:
      //  - semantic cosine similarity >= SEMANTIC_THRESHOLD, or
      //  - keyword ts_rank >= KEYWORD_THRESHOLD
      // These scales are not comparable — applying a single cutoff to both
      // (as the old code did) silently rejected every keyword-only hit.
      const SEMANTIC_THRESHOLD = 0.3;
      const KEYWORD_THRESHOLD = 0.01;
      const searchStartMs = Date.now();
      const results = await hybridSearch(churchId, query, 6);
      const searchDurationMs = Date.now() - searchStartMs;

      const isRelevant = (c: (typeof results)[number]) =>
        (typeof c.semanticSimilarity === "number" &&
          c.semanticSimilarity >= SEMANTIC_THRESHOLD) ||
        (typeof c.keywordRank === "number" &&
          c.keywordRank >= KEYWORD_THRESHOLD);

      const relevant = results.filter(isRelevant);

      logger.info("[chat] search executed", {
        churchId,
        query,
        durationMs: searchDurationMs,
        totalResults: results.length,
        relevantResults: relevant.length,
        semanticThreshold: SEMANTIC_THRESHOLD,
        keywordThreshold: KEYWORD_THRESHOLD,
        scores: results.map((r) => ({
          docId: r.documentId,
          title: r.documentTitle,
          semanticSimilarity:
            r.semanticSimilarity != null
              ? Math.round(r.semanticSimilarity * 100) / 100
              : null,
          keywordRank:
            r.keywordRank != null
              ? Math.round(r.keywordRank * 1000) / 1000
              : null,
          passed: isRelevant(r),
          contentPreview: r.content?.slice(0, 100) ?? "(empty)",
        })),
      });

      if (relevant.length === 0) {
        return {
          noResults: true,
          message:
            "No relevant content was found in the church's library for this query. " +
            "You MUST follow the fallback instructions in your system prompt. " +
            "Do NOT answer from your own knowledge as if it comes from this church.",
        };
      }

      const toolOutput = relevant.map((chunk, i) => ({
        resultNumber: i + 1,
        relevanceScore:
          chunk.semanticSimilarity != null
            ? Math.round(chunk.semanticSimilarity * 100) / 100
            : null,
        documentId: chunk.documentId,
        documentTitle: chunk.documentTitle,
        documentType: chunk.documentType,
        sourceUrl: chunk.sourceUrl || undefined,
        heading: chunk.heading || undefined,
        startTime: chunk.startTime,
        endTime: chunk.endTime,
        pageNumber: chunk.pageNumber,
        content: chunk.content,
      }));

      logger.info("[chat] search tool output sent to model", {
        churchId,
        query,
        resultCount: toolOutput.length,
        results: toolOutput.map((r) => ({
          resultNumber: r.resultNumber,
          documentId: r.documentId,
          documentTitle: r.documentTitle,
          relevanceScore: r.relevanceScore,
          contentLength: r.content?.length ?? 0,
          contentPreview: r.content?.slice(0, 200) ?? "(empty)",
        })),
      });

      return toolOutput;
    },
  };
}

/**
 * Extract search results from tool call steps.
 */
function extractSearchResults(
  steps: unknown[]
): RetrievedChunk[] {
  const results: RetrievedChunk[] = [];
  const seen = new Set<string>();

  for (const step of steps) {
    const s = step as Record<string, unknown>;
    const toolResults = s.toolResults as Array<Record<string, unknown>> | undefined;
    if (!toolResults) continue;

    for (const toolResult of toolResults) {
      // The output may be under 'output' or 'result' depending on SDK version
      const output = (toolResult.output ?? toolResult.result) as unknown;
      if (toolResult.toolName !== "search" || !Array.isArray(output)) continue;

      for (const item of output as Record<string, unknown>[]) {
        const docId = item.documentId as string;
        const content = item.content as string;
        if (!docId || !content) continue;

        const key = `${docId}:${content}`;
        if (seen.has(key)) continue;
        seen.add(key);

        results.push({
          chunkId: `${docId}-${results.length}`,
          documentId: docId,
          documentTitle: (item.documentTitle as string) || "Untitled",
          documentType: (item.documentType as RetrievedChunk["documentType"]) || "platejs",
          content,
          sourceUrl: (item.sourceUrl as string) || undefined,
          heading: (item.heading as string) || undefined,
          startTime: item.startTime != null ? Number(item.startTime) : undefined,
          endTime: item.endTime != null ? Number(item.endTime) : undefined,
          pageNumber: item.pageNumber != null ? Number(item.pageNumber) : undefined,
        });
      }
    }
  }

  return results;
}

const CITATION_SENTINEL = "\n__CITATIONS__";
const CHAT_ID_SENTINEL = "\n__CHAT_ID__";
const CHUNK_BOUNDARY = "\u200B\u200B";

export const maxDuration = 60;

export async function POST(request: Request) {
  const body = await request.json();
  const {
    messages: clientMessages,
    churchId,
    churchName,
    chatId: existingChatId,
    isAdminTest,
  } = body as {
    messages: ClientMessage[];
    churchId: string;
    churchName: string;
    chatId?: string;
    isAdminTest?: boolean;
  };

  if (!churchId) {
    return new Response("churchId is required", { status: 400 });
  }

  // Block chat if church has no active subscription
  const sub = await db.query.subscriptions.findFirst({
    where: eq(subscriptions.churchId, churchId),
  });
  const activeStatuses = ["active", "trialing", "past_due"];
  if (!sub || !activeStatuses.includes(sub.status)) {
    return new Response("Church subscription is not active", { status: 403 });
  }

  // Enforce hard message limit
  const [msgLimit, currentUsage] = await Promise.all([
    getEffectiveMessageLimit(churchId),
    getCurrentUsage(churchId),
  ]);

  if (msgLimit && currentUsage && currentUsage.questions >= msgLimit.effectiveMax) {
    logger.info("[chat] message limit reached", {
      churchId,
      currentUsage: currentUsage.questions,
      effectiveMax: msgLimit.effectiveMax,
      overageEnabled: msgLimit.overageEnabled,
      overageCap: msgLimit.overageCap,
    });
    return new Response(
      JSON.stringify({
        error: "message_limit_reached",
        message: "Your church has reached its monthly message limit. Contact your church admin for more information.",
      }),
      { status: 403, headers: { "Content-Type": "application/json" } }
    );
  }

  const lastUserMessage = [...clientMessages]
    .reverse()
    .find((m) => m.role === "user");

  if (!lastUserMessage) {
    return new Response("No user message found", { status: 400 });
  }

  const userQuery = lastUserMessage.content;

  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;

  // Validate authenticated user belongs to this church. Platform super-admin
  // (luke@doctrinally.ai) bypasses — he can chat-test any church he's
  // impersonating via the admin switcher.
  if (userId && !isSuperAdminEmail(session?.user?.email)) {
    const membership = await db.query.memberships.findFirst({
      where: and(
        eq(memberships.userId, userId),
        eq(memberships.churchId, churchId)
      ),
    });
    if (!membership) {
      return new Response("Unauthorized for this church", { status: 403 });
    }
  }

  // Create or reuse chat record. Anonymous users get userId=null so their
  // messages are still saved for analytics and topic classification.
  let chatId = existingChatId;
  if (!chatId) {
    try {
      const [newChat] = await db
        .insert(chats)
        .values({
          churchId,
          userId: userId ?? null,
          title:
            userQuery.length > 80
              ? userQuery.slice(0, 80) + "..."
              : userQuery,
          isAdminTest: isAdminTest ?? false,
        })
        .returning({ id: chats.id });
      chatId = newChat.id;
    } catch (err) {
      console.error("Failed to create chat:", err);
    }
  }

  // Load church settings for system prompt (server-authoritative, not client-trusted)
  const church = await db.query.churches.findFirst({
    where: eq(churches.id, churchId),
    columns: { name: true, aiFallbackInstruction: true },
  });

  const coreMessages = clientMessages.map((m) => ({
    role: m.role as "user" | "assistant",
    content: m.content,
  }));

  const systemPrompt = buildSystemPrompt(
    church?.name || churchName || "this church",
    church?.aiFallbackInstruction
  );

  // Trim older messages to fit the 100k total input budget. The last message
  // (current user turn) is always kept. The chat route is purely agentic —
  // retrieval happens via the `search` tool at the model's discretion, not
  // via eager pre-fetching into the prompt.
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

  logger.info("[chat] request started", {
    churchId,
    chatId: chatId ?? null,
    userId: userId ?? null,
    isAdminTest: isAdminTest ?? false,
    model: process.env.AI_MODEL || DEFAULT_MODEL,
    messageCount: messagesToSend.length,
    historyDropped: olderMessages.length - trimmedOlder.length,
  });

  logger.debug("[chat] system prompt", {
    churchId,
    systemPrompt,
  });

  logger.debug("[chat] messages sent to model", {
    churchId,
    messages: messagesToSend,
  });

  const streamStartMs = Date.now();
  const result = streamText({
    model: getModel(),
    system: systemPrompt,
    messages: messagesToSend,
    tools: {
      search: createSearchTool(churchId),
    },
    // Pure agentic flow: the model typically runs search once, then
    // replies. 6 steps allows retries with different queries when the
    // first search returns nothing useful.
    stopWhen: stepCountIs(6),
    // Defenses against Mercury 2 post-answer degeneracy — we've seen
    // the model run clean through the response + attribution, then get
    // stuck in a loop emitting thousands of `<b>\n</b>` / `</br>` junk
    // tags until the step runs out. Each of these caps/triggers kills
    // that tail:
    //   - maxOutputTokens: hard ceiling so a degenerate tail can't run
    //     past ~3-4 paragraphs' worth of output
    //   - stopSequences: Mercury's known-bad escape patterns. The
    //     system prompt doesn't ask for HTML at all; markdown emphasis
    //     uses `*…*`. Any `<b`, `<br`, `</b`, `</br` is noise.
    //   - temperature 0.7: slightly more deterministic than the default
    //     1.0, reduces the chance of getting stuck in the loop state.
    maxOutputTokens: 1500,
    stopSequences: ["<b>", "</b>", "<br", "</br"],
    temperature: 0.7,
    // Reasoning effort left at Mercury's default — the 40 s latency we
    // saw earlier turned out to be a missing pgvector/GIN index, not
    // reasoning overhead. With the index fix in place the full response
    // is ~5-8 s at default reasoning.
  });

  const encoder = new TextEncoder();

  const outputStream = new ReadableStream({
    async start(controller) {
      try {
        let fullText = "";
        let firstTokenAt: number | null = null;
        for await (const chunk of result.textStream) {
          if (!chunk) continue;
          if (firstTokenAt == null) firstTokenAt = Date.now();
          fullText += chunk;
          controller.enqueue(encoder.encode(CHUNK_BOUNDARY + chunk));
        }
        const streamEndMs = Date.now();

        // Extract tool results for citations
        const steps = await result.steps;

        // Log all tool calls and their results
        for (const [stepIdx, step] of (steps as Record<string, unknown>[]).entries()) {
          const toolCalls = step.toolCalls as Array<Record<string, unknown>> | undefined;
          const toolResults = step.toolResults as Array<Record<string, unknown>> | undefined;

          if (toolCalls && toolCalls.length > 0) {
            logger.info("[chat] tool calls", {
              churchId,
              chatId: chatId ?? null,
              step: stepIdx,
              calls: toolCalls.map((tc) => ({
                toolName: tc.toolName,
                args: tc.args,
              })),
            });
          }

          if (toolResults && toolResults.length > 0) {
            logger.debug("[chat] tool results", {
              churchId,
              chatId: chatId ?? null,
              step: stepIdx,
              results: toolResults.map((tr) => ({
                toolName: tr.toolName,
                output: tr.output ?? tr.result,
              })),
            });
          }
        }

        // Citations come solely from whatever the agentic `search` tool
        // returned — the chat route no longer pre-fetches RAG.
        const searchResults = extractSearchResults(steps as unknown[]);
        const citations = chunksToMetadata(searchResults);

        // Timing summary. `timeToFirstTokenMs` is the real user-perceived
        // latency — everything before this is the user staring at
        // "Thinking…". `generationMs` is how long the tokens took to
        // stream once they started. `totalDurationMs` includes both.
        // A big gap between `timeToFirstTokenMs` and
        // `totalDurationMs - timeToFirstTokenMs` tells us whether we're
        // bottlenecked on agentic setup (tool calls, first-token latency)
        // or on raw generation speed.
        const timeToFirstTokenMs =
          firstTokenAt != null ? firstTokenAt - streamStartMs : null;
        const generationMs =
          firstTokenAt != null ? streamEndMs - firstTokenAt : 0;
        const totalDurationMs = streamEndMs - streamStartMs;
        const toolCallCount = (steps as Record<string, unknown>[]).reduce(
          (sum, step) => {
            const calls = step.toolCalls as unknown[] | undefined;
            return sum + (Array.isArray(calls) ? calls.length : 0);
          },
          0
        );

        logger.info("[chat] response completed", {
          churchId,
          chatId: chatId ?? null,
          responseLength: fullText.length,
          totalSteps: steps.length,
          toolCallCount,
          searchResultsRaw: searchResults.length,
          citationsDeduped: citations.length,
          citationDocIds: citations.map((c) => c.documentId),
          timeToFirstTokenMs,
          generationMs,
          totalDurationMs,
        });

        // Append chatId sentinel (so client can track the conversation)
        if (chatId) {
          controller.enqueue(
            encoder.encode(CHAT_ID_SENTINEL + chatId)
          );
        }

        // Append citation sentinel
        if (citations.length > 0) {
          controller.enqueue(
            encoder.encode(CITATION_SENTINEL + JSON.stringify(citations))
          );
        }

        controller.close();

        // Save messages to DB for all chats (authenticated and anonymous).
        // Anonymous chats have userId=null but are still tracked for analytics,
        // billing, and topic classification.
        if (chatId) {
          try {
            const [userMsg] = await db
              .insert(messages)
              .values({
                chatId,
                role: "user",
                content: userQuery,
              })
              .returning({ id: messages.id });

            const cleanText = (fullText || "").replace(
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

            // Increment question count for billing (all chats, including admin test)
            await incrementQuestionCount(churchId);

            // Classify topic in background (only for non-admin-test chats)
            if (!isAdminTest && userMsg) {
              tasks
                .trigger("classify-message", {
                  messageId: userMsg.id,
                  chatId,
                  churchId,
                })
                .catch((err) =>
                  console.error("Failed to trigger classify-message:", err)
                );
            }
          } catch (err) {
            console.error("Failed to save messages:", err);
          }
        }
      } catch (err) {
        controller.error(err);
      }
    },
  });

  return new Response(outputStream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
