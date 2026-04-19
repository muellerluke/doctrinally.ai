import { streamText, tool, stepCountIs, jsonSchema, type Tool } from "ai";
import { openai } from "@ai-sdk/openai";
import { getServerSession } from "next-auth";
import { eq, and } from "drizzle-orm";
import { db } from "@/db";
import {
  documents,
  memberships,
  sermonSessions,
  subscriptions,
} from "@/db/schema";
import type { SermonChatMessage } from "@/db/schema/sermon-sessions";
import { authOptions } from "@/lib/auth";
import { hybridSearch } from "@/lib/retrieval";
import { getSermonBudgetStatus, incrementSermonTokenSpend } from "@/lib/usage";
import { hasSermonWriter } from "@/lib/plans";
import { buildSermonSystemPrompt } from "@/lib/sermons/system-prompt";
import { createDoctrineCheckTool } from "@/lib/sermons/doctrine-check";
import { DEFAULT_MODEL, priceTokens } from "@/lib/sermons/token-budget";
import type { Citation, RetrievedChunk } from "@/lib/types/citations";
import { isSuperAdminEmail } from "@/lib/super-admin";
import { logger } from "@/lib/logger";

interface ClientMessage {
  role: "user" | "assistant";
  content: string;
}

const CITATION_SENTINEL = "\n__CITATIONS__";
const COST_SENTINEL = "\n__COST__";

export const maxDuration = 60;

function getModel() {
  const model = process.env.AI_MODEL || DEFAULT_MODEL;
  return openai(model);
}

function createSermonSearchTool(churchId: string): Tool<{ query: string }, unknown> {
  return {
    description:
      "Search the church's library of sermons, documents, and videos. Returns relevant passages with document metadata. Use before making doctrinal claims about this church's teachings. Sermon drafts in progress are not returned — only indexed documents.",
    inputSchema: jsonSchema<{ query: string }>({
      type: "object",
      properties: {
        query: {
          type: "string",
          description:
            "Specific search terms. Include key concepts, names, or scripture references.",
        },
      },
      required: ["query"],
    }),
    execute: async ({ query }) => {
      const results = await hybridSearch(churchId, query, 6, "full");
      const relevant = results.filter(
        (c) =>
          (typeof c.semanticSimilarity === "number" &&
            c.semanticSimilarity >= 0.3) ||
          (typeof c.keywordRank === "number" && c.keywordRank >= 0.01)
      );
      logger.info("[sermon.chat] search", {
        churchId,
        query,
        total: results.length,
        relevant: relevant.length,
      });
      if (relevant.length === 0) {
        return {
          noResults: true,
          message:
            "No matching content in the church's library. You may answer from general knowledge, but clearly flag that it is not from this church's own materials.",
        };
      }
      return relevant.map((c, i) => ({
        resultNumber: i + 1,
        documentId: c.documentId,
        documentTitle: c.documentTitle,
        documentType: c.documentType,
        sourceUrl: c.sourceUrl,
        heading: c.heading,
        startTime: c.startTime,
        endTime: c.endTime,
        pageNumber: c.pageNumber,
        content: c.content,
      }));
    },
  };
}

function extractSearchCitations(steps: unknown[]): Citation[] {
  const seen = new Set<string>();
  const citations: Citation[] = [];
  let index = 1;

  for (const step of steps) {
    const s = step as Record<string, unknown>;
    const toolResults = s.toolResults as Array<Record<string, unknown>> | undefined;
    if (!toolResults) continue;
    for (const result of toolResults) {
      if (result.toolName !== "search") continue;
      const output = (result.output ?? result.result) as unknown;
      if (!Array.isArray(output)) continue;
      for (const item of output as Record<string, unknown>[]) {
        const docId = item.documentId as string | undefined;
        if (!docId || seen.has(docId)) continue;
        seen.add(docId);
        const content = (item.content as string) ?? "";
        citations.push({
          index: index++,
          documentId: docId,
          documentTitle: (item.documentTitle as string) || "Untitled",
          documentType: (item.documentType as RetrievedChunk["documentType"]) || "platejs",
          sourceUrl: (item.sourceUrl as string) || undefined,
          heading: (item.heading as string) || undefined,
          startTime: item.startTime != null ? Number(item.startTime) : undefined,
          endTime: item.endTime != null ? Number(item.endTime) : undefined,
          pageNumber: item.pageNumber != null ? Number(item.pageNumber) : undefined,
          chunkContent:
            content.length > 300 ? content.slice(0, 300) + "…" : content,
        });
      }
    }
  }

  return citations;
}

export async function POST(request: Request) {
  const body = (await request.json()) as {
    documentId: string;
    messages: ClientMessage[];
    sermonMarkdown: string;
    sermonTitle: string;
  };

  const { documentId, messages: clientMessages, sermonMarkdown, sermonTitle } = body;

  if (!documentId) {
    return new Response("documentId is required", { status: 400 });
  }

  // Authenticate and authorize
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 });
  }

  const doc = await db.query.documents.findFirst({
    where: and(eq(documents.id, documentId), eq(documents.type, "sermon")),
  });
  if (!doc) {
    return new Response("Sermon not found", { status: 404 });
  }

  // Super-admin bypasses the per-church membership check for support/debugging.
  if (!isSuperAdminEmail(session.user.email)) {
    const membership = await db.query.memberships.findFirst({
      where: and(
        eq(memberships.userId, session.user.id),
        eq(memberships.churchId, doc.churchId)
      ),
    });
    if (!membership || membership.role === "member") {
      return new Response("Forbidden", { status: 403 });
    }
  }

  // Enterprise-only feature gate
  const sub = await db.query.subscriptions.findFirst({
    where: eq(subscriptions.churchId, doc.churchId),
  });
  const activeStatuses = new Set(["active", "trialing", "past_due"]);
  if (!sub || !activeStatuses.has(sub.status)) {
    return new Response("Subscription not active", { status: 403 });
  }
  if (!hasSermonWriter(sub.plan)) {
    return new Response(
      JSON.stringify({
        error: "plan_required",
        message: "The sermon writer is available on the Enterprise plan.",
      }),
      { status: 403, headers: { "Content-Type": "application/json" } }
    );
  }

  // Budget pre-flight check
  const budget = await getSermonBudgetStatus(doc.churchId);
  if (budget?.exhausted) {
    return new Response(
      JSON.stringify({
        error: "sermon_budget_exhausted",
        message:
          "You've used your sermon-writer budget for this period. It resets at the start of your next billing cycle.",
      }),
      { status: 402, headers: { "Content-Type": "application/json" } }
    );
  }

  const lastUserMessage = [...clientMessages].reverse().find((m) => m.role === "user");
  if (!lastUserMessage) {
    return new Response("No user message", { status: 400 });
  }

  const churchRow = await db.query.churches.findFirst({
    where: (c, { eq }) => eq(c.id, doc.churchId),
    columns: { name: true },
  });

  const systemPrompt = buildSermonSystemPrompt({
    churchName: churchRow?.name ?? "this church",
    sermonTitle: sermonTitle || doc.title,
    sermonMarkdown: sermonMarkdown ?? "",
  });

  // Trim chat history — keep the most recent 16 messages. Older turns are
  // already reflected in the editor state sent via the system prompt.
  const trimmed = clientMessages.slice(-16);
  const coreMessages = trimmed.map((m) => ({
    role: m.role,
    content: m.content,
  }));

  let extraCostCents = 0;
  const sermonMdRef = { current: sermonMarkdown ?? "" };

  logger.info("[sermon.chat] request", {
    churchId: doc.churchId,
    documentId,
    plan: sub.plan,
    budgetCents: budget?.budgetCents,
    spentCents: budget?.spentCents,
    messageCount: coreMessages.length,
    sermonChars: sermonMarkdown?.length ?? 0,
  });

  const result = streamText({
    model: getModel(),
    system: systemPrompt,
    messages: coreMessages,
    tools: {
      search: createSermonSearchTool(doc.churchId),
      doctrineCheck: createDoctrineCheckTool(
        doc.churchId,
        () => sermonMdRef.current,
        (cents) => {
          extraCostCents += cents;
        }
      ),
    },
    stopWhen: stepCountIs(6),
    onFinish: async ({ usage }) => {
      const cents =
        priceTokens(
          process.env.AI_MODEL || DEFAULT_MODEL,
          usage?.inputTokens ?? 0,
          usage?.outputTokens ?? 0
        ) + extraCostCents;
      try {
        await incrementSermonTokenSpend(doc.churchId, cents);
      } catch (err) {
        logger.error("[sermon.chat] failed to increment spend", {
          churchId: doc.churchId,
          documentId,
          cents,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    },
  });

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      try {
        let fullText = "";
        for await (const chunk of result.textStream) {
          fullText += chunk;
          controller.enqueue(encoder.encode(chunk));
        }

        const steps = await result.steps;
        const citations = extractSearchCitations(steps as unknown[]);

        const usage = await result.usage;
        const turnCostCents =
          priceTokens(
            process.env.AI_MODEL || DEFAULT_MODEL,
            usage?.inputTokens ?? 0,
            usage?.outputTokens ?? 0
          ) + extraCostCents;

        if (citations.length > 0) {
          controller.enqueue(
            encoder.encode(CITATION_SENTINEL + JSON.stringify(citations))
          );
        }

        controller.enqueue(encoder.encode(COST_SENTINEL + String(turnCostCents)));
        controller.close();

        // Persist the turn into sermon_sessions.messages
        try {
          const existing = await db.query.sermonSessions.findFirst({
            where: eq(sermonSessions.documentId, documentId),
          });
          if (existing) {
            const userMsg: SermonChatMessage = {
              id: crypto.randomUUID(),
              role: "user",
              content: lastUserMessage.content,
              createdAt: new Date().toISOString(),
            };
            const assistantMsg: SermonChatMessage = {
              id: crypto.randomUUID(),
              role: "assistant",
              content: fullText,
              citations:
                citations.length > 0
                  ? (citations as unknown as Record<string, unknown>[])
                  : undefined,
              createdAt: new Date().toISOString(),
            };
            const nextMessages = [...(existing.messages ?? []), userMsg, assistantMsg];
            await db
              .update(sermonSessions)
              .set({
                messages: nextMessages,
                tokensInTotal:
                  existing.tokensInTotal + (usage?.inputTokens ?? 0),
                tokensOutTotal:
                  existing.tokensOutTotal + (usage?.outputTokens ?? 0),
                centsSpent: existing.centsSpent + turnCostCents,
                updatedAt: new Date(),
              })
              .where(eq(sermonSessions.id, existing.id));
          }
        } catch (err) {
          logger.error("[sermon.chat] failed to persist turn", {
            churchId: doc.churchId,
            documentId,
            error: err instanceof Error ? err.message : String(err),
          });
        }
      } catch (err) {
        controller.error(err);
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
