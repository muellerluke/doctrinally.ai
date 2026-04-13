import { streamText, tool, stepCountIs, jsonSchema, type Tool } from "ai";
import { openai } from "@ai-sdk/openai";
import { getServerSession } from "next-auth";
import { eq, and } from "drizzle-orm";
import { db } from "@/db";
import { chats, messages, memberships, churches, subscriptions } from "@/db/schema";
import { authOptions } from "@/lib/auth";
import { hybridSearch } from "@/lib/retrieval";
import { incrementQuestionCount } from "@/lib/usage";
import { getPostHogClient } from "@/lib/posthog-server";
import { tasks } from "@trigger.dev/sdk/v3";
import { lookupByReference } from "@/lib/bible";
import type { Citation, RetrievedChunk } from "@/lib/types/citations";

interface ClientMessage {
  role: "user" | "assistant";
  content: string;
}

function getModel() {
  const model = process.env.AI_MODEL || "gpt-5.4-mini";
  return openai(model);
}

function buildSystemPrompt(
  churchName: string,
  fallbackInstruction?: string | null
): string {
  const fallbackLine = fallbackInstruction
    ? fallbackInstruction
    : `If your searches don't find relevant church-specific information, draw on general biblical knowledge but clearly say so.`;

  return `You are a helpful, knowledgeable assistant for ${churchName}. Your role is to answer questions using the Bible and the church's own teachings, sermons, and documents.

You have access to a search tool that lets you find relevant content from the church's library of sermons, documents, and videos. ALWAYS use the search tool at least once before answering — do not guess or make up information about the church's specific teachings.

Guidelines:
- Search the church's content library before answering. You can search multiple times with different queries if the first search doesn't find what you need.
- When you reference a search result, cite it by embedding the source using <document>DOCUMENT_ID</document> where DOCUMENT_ID is the documentId from the search result.
- IMPORTANT: <document> tags must ALWAYS be on their own line, separated from surrounding text by blank lines. Never place a <document> tag inside a sentence or paragraph. Always finish your sentence or paragraph first, then place the tag on the next line.
- Include the most relevant 1-3 sources as <document> embeds. You don't need to embed every result.
- When you need to quote or reference a specific Bible passage, ALWAYS use the lookupBiblePassage tool to get the exact text. Never quote Bible verses from memory — the tool provides the Berean Standard Bible (BSB) translation which is copyright-safe.
- Be warm, pastoral, and helpful. Speak in a way that is accessible to church members of all backgrounds.
- When referencing Bible passages, include the book, chapter, and verse.
- Keep responses focused and concise unless the user asks for a detailed explanation.

CRITICAL — When search returns NO results:
When the search tool returns a "noResults" response, it means the church's library does not contain content on this topic. When this happens you MUST follow the fallback instruction below EXACTLY. Do not deviate from it. Do not add your own answer before or after it. The fallback instruction is set by the church administrator and overrides your default behavior.

<fallback_instruction>
${fallbackLine}
</fallback_instruction>

Rules for applying the fallback instruction:
1. Read the fallback instruction carefully. If it tells you NOT to answer, you must NOT answer — not even with a disclaimer attached.
2. If the fallback instruction permits answering from general knowledge, you may do so, but clearly distinguish it from church-specific content.
3. If the fallback instruction tells you to redirect the user (e.g. to a pastor), do exactly that — do not answer the question first and then redirect.
4. Do NOT give a substantive answer and then add a disclaimer unless the fallback instruction explicitly permits general-knowledge answers. The pattern of "here's a full answer… but note this isn't from your church" violates a fallback that says not to answer.
5. NEVER present general knowledge as if it comes from the church's own materials.
6. You may offer to help rephrase the question so a different search might find something.`;
}

function chunksToMetadata(chunks: RetrievedChunk[]): Citation[] {
  return chunks.map((chunk, i) => ({
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
      const RELEVANCE_THRESHOLD = 0.35;
      const results = await hybridSearch(churchId, query, 6);

      // Hard-filter results below the relevance threshold in code so the
      // AI never even sees them. Previously we relied on a prompt
      // instruction ("ignore results below 0.35") which the model often
      // ignored, producing answers without any grounding.
      const relevant = results.filter(
        (c) =>
          typeof c.similarity === "number" &&
          c.similarity >= RELEVANCE_THRESHOLD
      );

      if (relevant.length === 0) {
        return {
          noResults: true,
          message:
            "No relevant content was found in the church's library for this query. " +
            "You MUST follow the fallback instructions in your system prompt. " +
            "Do NOT answer from your own knowledge as if it comes from this church.",
        };
      }

      return relevant.map((chunk, i) => ({
        resultNumber: i + 1,
        relevanceScore:
          chunk.similarity != null
            ? Math.round(chunk.similarity * 100) / 100
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
    },
  };
}

function createBibleLookupTool(): Tool<{ reference: string }, unknown> {
  return {
    description:
      "Look up a specific Bible passage by reference (e.g. 'John 3:16', 'Romans 8:28-30', 'Psalm 23'). Returns the exact text from the Berean Standard Bible (BSB) translation. ALWAYS use this tool when you need to quote scripture — never quote Bible verses from memory.",
    inputSchema: jsonSchema<{ reference: string }>({
      type: "object",
      properties: {
        reference: {
          type: "string",
          description:
            "The Bible reference to look up, e.g. 'John 3:16', 'Genesis 1:1-5', '1 Corinthians 13:4-7'",
        },
      },
      required: ["reference"],
    }),
    execute: async ({ reference }) => {
      const result = await lookupByReference(reference);
      if (!result) {
        return { error: `Could not find passage: ${reference}` };
      }
      return {
        reference: result.reference,
        text: result.text,
        bookName: result.bookName,
        chapter: result.chapter,
        verseStart: result.verseStart,
        verseEnd: result.verseEnd,
        translation: "BSB (Berean Standard Bible)",
      };
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

  const lastUserMessage = [...clientMessages]
    .reverse()
    .find((m) => m.role === "user");

  if (!lastUserMessage) {
    return new Response("No user message found", { status: 400 });
  }

  const userQuery = lastUserMessage.content;

  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;

  // Validate authenticated user belongs to this church
  if (userId) {
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

  const result = streamText({
    model: getModel(),
    system: buildSystemPrompt(
      church?.name || churchName || "this church",
      church?.aiFallbackInstruction
    ),
    messages: coreMessages,
    tools: {
      search: createSearchTool(churchId),
      lookupBiblePassage: createBibleLookupTool(),
    },
    stopWhen: stepCountIs(6),
  });

  const encoder = new TextEncoder();

  const outputStream = new ReadableStream({
    async start(controller) {
      try {
        let fullText = "";
        for await (const chunk of result.textStream) {
          fullText += chunk;
          controller.enqueue(encoder.encode(chunk));
        }

        // Extract tool results for citations
        const steps = await result.steps;
        const searchResults = extractSearchResults(steps as unknown[]);
        const citations = chunksToMetadata(searchResults);

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

            const posthog = getPostHogClient();
            posthog.capture({
              distinctId: userId ?? `anon-${churchId}`,
              event: "chat_message_sent",
              properties: {
                church_id: churchId,
                chat_id: chatId,
                has_citations: citations.length > 0,
                citation_count: citations.length,
                is_admin_test: isAdminTest ?? false,
                is_authenticated: !!userId,
              },
            });

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
