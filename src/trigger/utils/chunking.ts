/**
 * Shared text chunking utilities for document processing.
 *
 * Uses a real OpenAI-compatible tokenizer (cl100k_base via js-tiktoken)
 * for token counting — critical for non-Latin scripts like Hebrew and
 * Greek where the old word-count heuristic underestimated by ~10x,
 * producing chunks that blew past OpenAI's 8192-token embedding cap.
 */

import { getEncoding, type Tiktoken } from "js-tiktoken";

// cl100k_base is the encoding used by text-embedding-3-small, gpt-4,
// and gpt-3.5-turbo. Load lazily — the encoding tables are ~1 MB of
// JSON that we don't want to parse on every cold start if the module
// isn't used (e.g. during tests that stub chunking).
let encoder: Tiktoken | null = null;
function getTokenEncoder(): Tiktoken {
  if (!encoder) encoder = getEncoding("cl100k_base");
  return encoder;
}

/**
 * Accurate token count for a string using the cl100k_base tokenizer.
 * Use this anywhere we need to stay under OpenAI's hard token limits
 * (chunking for embeddings, chunking for model input, etc.). Heuristic
 * estimators break on mixed-script content.
 */
export function countTokens(text: string): number {
  if (!text) return 0;
  return getTokenEncoder().encode(text).length;
}

/**
 * Split text on sentence boundaries, returning an array of sentences.
 */
function splitSentences(text: string): string[] {
  const raw = text.match(/[^.!?]+[.!?]+[\s]*/g);
  if (!raw) return [text];
  return raw.map((s) => s.trim()).filter(Boolean);
}

/**
 * Hard-split a single block that's longer than `maxTokens` into smaller pieces.
 * Tries (in order): paragraph breaks → line breaks → word boundaries → raw
 * character slices. Guarantees every output is ≤ maxTokens, which is required
 * so individual chunks never exceed OpenAI's 8192-token embedding input limit.
 */
function hardSplitBlock(block: string, maxTokens: number): string[] {
  if (countTokens(block) <= maxTokens) return [block];

  const splitters: RegExp[] = [/\n\n+/, /\n/, /\s+/];
  for (const re of splitters) {
    const parts = block.split(re).filter((p) => p.length > 0);
    if (parts.length <= 1) continue;

    const out: string[] = [];
    let acc = "";
    for (const part of parts) {
      const candidate = acc ? `${acc} ${part}` : part;
      if (countTokens(candidate) > maxTokens && acc.length > 0) {
        out.push(acc);
        acc = part;
      } else {
        acc = candidate;
      }
    }
    if (acc.length > 0) out.push(acc);

    // Recurse so any piece still over the limit gets split by the next
    // coarser-grained splitter.
    if (out.every((p) => countTokens(p) <= maxTokens)) return out;
    return out.flatMap((p) => hardSplitBlock(p, maxTokens));
  }

  // Last resort — no whitespace at all (e.g. run-together OCR output in a
  // script with no token-safe ratio). Binary-chop: slice in halves until
  // every piece fits inside the budget. Measures real tokens each step so
  // it works for Hebrew / Greek / CJK equally.
  const out: string[] = [];
  const stack = [block];
  while (stack.length > 0) {
    const piece = stack.pop()!;
    if (countTokens(piece) <= maxTokens) {
      out.push(piece);
    } else if (piece.length <= 1) {
      // Pathological single-char case — push it anyway; embedding will
      // succeed on a solitary character.
      out.push(piece);
    } else {
      const mid = Math.floor(piece.length / 2);
      // Push right first so left is processed first (preserves order).
      stack.push(piece.slice(mid));
      stack.push(piece.slice(0, mid));
    }
  }
  return out;
}

/**
 * Chunk text into segments of approximately `maxTokens` tokens with `overlap`
 * token overlap between consecutive chunks. Splits on sentence boundaries
 * when possible.
 */
export function chunkByTokens(
  text: string,
  maxTokens = 300,
  overlap = 30
): string[] {
  // Defensive: strip NUL bytes — Postgres `text` columns reject U+0000 and
  // embedded NULs can sneak in from PDFs, OCR output, or corrupt sources.
  const safeText = text.replace(/\u0000/g, "");
  // Split into sentences, then hard-split any sentence that would by itself
  // exceed maxTokens. Without this, a PDF page with no sentence terminators
  // (tables, bullet lists, URL dumps) becomes one multi-thousand-token
  // "sentence" and the per-chunk loop below has no way to break it down.
  const sentences = splitSentences(safeText).flatMap((s) =>
    hardSplitBlock(s, maxTokens)
  );
  const chunks: string[] = [];
  let current: string[] = [];
  let currentTokens = 0;

  for (const sentence of sentences) {
    const sentenceTokens = countTokens(sentence);

    if (currentTokens + sentenceTokens > maxTokens && current.length > 0) {
      chunks.push(current.join(" "));

      // Build overlap from the end of the current chunk
      const overlapSentences: string[] = [];
      let overlapTokens = 0;
      for (let i = current.length - 1; i >= 0; i--) {
        const t = countTokens(current[i]);
        if (overlapTokens + t > overlap) break;
        overlapSentences.unshift(current[i]);
        overlapTokens += t;
      }
      current = [...overlapSentences];
      currentTokens = overlapTokens;
    }

    current.push(sentence);
    currentTokens += sentenceTokens;
  }

  if (current.length > 0) {
    chunks.push(current.join(" "));
  }

  return chunks;
}

/**
 * Split markdown content at heading lines (# ## ###, etc.).
 * Each chunk includes the heading it falls under and all content until the
 * next heading of equal or higher level.
 */
export function chunkByHeadings(
  markdown: string
): { heading: string | null; content: string }[] {
  const lines = markdown.split("\n");
  const chunks: { heading: string | null; content: string }[] = [];
  let currentHeading: string | null = null;
  let currentLines: string[] = [];

  for (const line of lines) {
    const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);

    if (headingMatch) {
      // Flush the current chunk
      if (currentLines.length > 0 || currentHeading !== null) {
        const content = currentLines.join("\n").trim();
        if (content.length > 0 || currentHeading !== null) {
          chunks.push({ heading: currentHeading, content });
        }
      }
      currentHeading = headingMatch[2].trim();
      currentLines = [];
    } else {
      currentLines.push(line);
    }
  }

  // Flush final chunk
  const finalContent = currentLines.join("\n").trim();
  if (finalContent.length > 0 || currentHeading !== null) {
    chunks.push({ heading: currentHeading, content: finalContent });
  }

  return chunks;
}

/**
 * Group transcript segments into chunks of approximately `maxDurationSecs`
 * seconds.
 */
export function chunkTranscript(
  segments: { text: string; start: number; end: number }[],
  maxDurationSecs = 120
): { text: string; startTime: number; endTime: number }[] {
  if (segments.length === 0) return [];

  const chunks: { text: string; startTime: number; endTime: number }[] = [];
  let currentTexts: string[] = [];
  let chunkStart = segments[0].start;
  let chunkEnd = segments[0].end;

  for (const segment of segments) {
    const duration = segment.end - chunkStart;

    if (duration > maxDurationSecs && currentTexts.length > 0) {
      chunks.push({
        text: currentTexts.join(" ").trim(),
        startTime: Math.round(chunkStart),
        endTime: Math.round(chunkEnd),
      });
      currentTexts = [];
      chunkStart = segment.start;
    }

    currentTexts.push(segment.text);
    chunkEnd = segment.end;
  }

  if (currentTexts.length > 0) {
    chunks.push({
      text: currentTexts.join(" ").trim(),
      startTime: Math.round(chunkStart),
      endTime: Math.round(chunkEnd),
    });
  }

  return chunks;
}
