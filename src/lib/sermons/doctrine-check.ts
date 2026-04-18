import { generateText, jsonSchema, tool, type Tool } from "ai";
import { openai } from "@ai-sdk/openai";
import { hybridSearch } from "@/lib/retrieval";
import type { Citation } from "@/lib/types/citations";
import { logger } from "@/lib/logger";
import { DEFAULT_MODEL, priceTokens } from "./token-budget";

export interface DoctrineCheckResult {
  claim: string;
  supporting: Citation[];
  conflicting: Citation[];
  verdict: "aligned" | "unclear" | "conflict";
}

export interface DoctrineCheckReport {
  results: DoctrineCheckResult[];
  summary: string;
  costCents: number;
}

interface DoctrineCheckInput {
  sermonMarkdown: string;
  claims?: string[];
}

/**
 * Create the `doctrineCheck` tool for the sermon-writer streamText call.
 *
 * The outer model calls this once; internally we extract claims (if not
 * provided), run `hybridSearch` with full scope for each, and return a
 * structured report. Token usage from the internal claim-extraction call is
 * accumulated into `onCost` so the budget meter captures the full turn.
 */
export function createDoctrineCheckTool(
  churchId: string,
  getSermonMarkdown: () => string,
  onCost: (cents: number) => void
): Tool<DoctrineCheckInput, DoctrineCheckReport> {
  return {
    description:
      "Check the sermon's doctrinal claims against the church's library. Extracts 2-8 doctrinal claims from the sermon (or uses the provided list), searches the library for each, and returns alignment, supporting citations, and conflicts. Use when the pastor asks to verify orthodoxy, check for heresy, or compare the sermon to existing church teaching.",
    inputSchema: jsonSchema<DoctrineCheckInput>({
      type: "object",
      properties: {
        sermonMarkdown: {
          type: "string",
          description:
            "The current sermon markdown. Pass the exact sermon state so claim extraction is accurate.",
        },
        claims: {
          type: "array",
          items: { type: "string" },
          description:
            "Optional explicit claims to check. If omitted, the tool extracts claims automatically from the sermon.",
        },
      },
      required: ["sermonMarkdown"],
    }),
    execute: async ({ claims: suppliedClaims }) => {
      const sermonMarkdown = getSermonMarkdown();
      let claims = suppliedClaims ?? [];

      if (claims.length === 0) {
        claims = await extractClaims(sermonMarkdown, churchId, onCost);
      }
      if (claims.length === 0) {
        return {
          results: [],
          summary:
            "No doctrinal claims were extracted from the sermon. The sermon may still be too short or unstructured to analyze.",
          costCents: 0,
        };
      }

      const capped = claims.slice(0, 8);

      const results = await Promise.all(
        capped.map(async (claim) => {
          const chunks = await hybridSearch(churchId, claim, 6, "full");
          // Heuristic: top-3 highly-similar results are treated as supporting;
          // any result with similarity between 0.3 and 0.5 (matched but weak)
          // is treated as "conflicting" because it's on-topic but doesn't
          // clearly align. Better heuristics can be layered on later.
          const supporting: Citation[] = [];
          const conflicting: Citation[] = [];
          for (const c of chunks) {
            const sim =
              typeof c.semanticSimilarity === "number"
                ? c.semanticSimilarity
                : 0;
            const citation: Citation = {
              index: supporting.length + conflicting.length + 1,
              documentId: c.documentId,
              documentTitle: c.documentTitle,
              documentType: c.documentType,
              sourceUrl: c.sourceUrl,
              heading: c.heading,
              startTime: c.startTime,
              endTime: c.endTime,
              pageNumber: c.pageNumber,
              chunkContent:
                c.content.length > 300 ? c.content.slice(0, 300) + "…" : c.content,
            };
            if (sim >= 0.55) supporting.push(citation);
            else if (sim >= 0.3) conflicting.push(citation);
          }

          const verdict: DoctrineCheckResult["verdict"] =
            supporting.length >= 2
              ? "aligned"
              : conflicting.length > 0 && supporting.length === 0
                ? "conflict"
                : "unclear";

          return { claim, supporting, conflicting, verdict };
        })
      );

      const summary = summarizeVerdicts(results);

      logger.info("[sermon.doctrine-check] completed", {
        churchId,
        claimCount: capped.length,
        aligned: results.filter((r) => r.verdict === "aligned").length,
        unclear: results.filter((r) => r.verdict === "unclear").length,
        conflict: results.filter((r) => r.verdict === "conflict").length,
      });

      return { results, summary, costCents: 0 };
    },
  };
}

async function extractClaims(
  sermonMarkdown: string,
  churchId: string,
  onCost: (cents: number) => void
): Promise<string[]> {
  try {
    const { text, usage } = await generateText({
      model: openai(process.env.AI_MODEL || DEFAULT_MODEL),
      system:
        "You extract doctrinal claims from sermons for a second-pass library check. Return each claim as a single declarative sentence. Output one claim per line, no numbering, no commentary. Limit to at most 8 claims. If there are no testable doctrinal claims, output the single line NONE.",
      prompt: `<sermon>\n${sermonMarkdown}\n</sermon>\n\nExtract the doctrinal claims.`,
    });

    const cents = priceTokens(
      process.env.AI_MODEL || DEFAULT_MODEL,
      usage?.inputTokens ?? 0,
      usage?.outputTokens ?? 0
    );
    onCost(cents);

    const trimmed = text.trim();
    if (!trimmed || /^none$/i.test(trimmed)) return [];
    return trimmed
      .split(/\n+/)
      .map((line) => line.replace(/^[-*\d.\s]+/, "").trim())
      .filter((line) => line.length > 0)
      .slice(0, 8);
  } catch (err) {
    logger.error("[sermon.doctrine-check] claim extraction failed", {
      churchId,
      error: err instanceof Error ? err.message : String(err),
    });
    return [];
  }
}

function summarizeVerdicts(results: DoctrineCheckResult[]): string {
  const aligned = results.filter((r) => r.verdict === "aligned").length;
  const unclear = results.filter((r) => r.verdict === "unclear").length;
  const conflict = results.filter((r) => r.verdict === "conflict").length;
  return `${results.length} claim${results.length === 1 ? "" : "s"} checked: ${aligned} aligned, ${unclear} unclear, ${conflict} potential conflict${conflict === 1 ? "" : "s"}.`;
}

// Re-export tool type for convenience so callers can bind without pulling `ai`.
export type { Tool };
