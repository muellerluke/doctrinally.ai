/**
 * RAG context builder. Serializes retrieved chunks into a deterministic,
 * cache-friendly text block that gets prepended to the current user
 * message so every turn eagerly has source material without requiring
 * the model to call the `search` tool.
 *
 * Determinism matters: providers with automatic prompt caching (OpenAI,
 * Inception Labs, Anthropic w/ cache_control) match on prefix bytes. By
 * sorting chunks by `chunkId` and rendering each chunk identically, a
 * follow-up turn that retrieves an overlapping top set will share prefix
 * bytes with the prior turn up to the first differing chunk — allowing a
 * cache hit on everything before that point.
 */

import type { RetrievedChunk } from "@/lib/types/citations";

function escapeAttr(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/"/g, "&quot;");
}

function formatChunk(c: RetrievedChunk): string {
  const attrs: string[] = [
    `id="${escapeAttr(c.chunkId)}"`,
    `doc="${escapeAttr(c.documentId)}"`,
    `title="${escapeAttr(c.documentTitle)}"`,
    `type="${escapeAttr(c.documentType)}"`,
  ];
  if (c.heading) attrs.push(`heading="${escapeAttr(c.heading)}"`);
  if (c.startTime != null) attrs.push(`start="${c.startTime}"`);
  if (c.endTime != null) attrs.push(`end="${c.endTime}"`);
  if (c.pageNumber != null) attrs.push(`page="${c.pageNumber}"`);
  return `<chunk ${attrs.join(" ")}>\n${c.content}\n</chunk>`;
}

/**
 * Render retrieved chunks as a `<retrieved_context>…</retrieved_context>`
 * block. Returns an empty string when there are no chunks, so callers can
 * unconditionally concatenate without extra branching.
 */
export function buildRagContext(chunks: RetrievedChunk[]): string {
  if (chunks.length === 0) return "";
  const sorted = [...chunks].sort((a, b) => a.chunkId.localeCompare(b.chunkId));
  const body = sorted.map(formatChunk).join("\n\n");
  return `<retrieved_context>\n${body}\n</retrieved_context>\n\n`;
}
