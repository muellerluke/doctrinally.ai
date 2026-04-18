/**
 * Shared text chunking utilities for document processing.
 */

import { estimateTokens } from "@/lib/chat/tokens";

/**
 * Split text on sentence boundaries, returning an array of sentences.
 */
function splitSentences(text: string): string[] {
  const raw = text.match(/[^.!?]+[.!?]+[\s]*/g);
  if (!raw) return [text];
  return raw.map((s) => s.trim()).filter(Boolean);
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
  const sentences = splitSentences(text);
  const chunks: string[] = [];
  let current: string[] = [];
  let currentTokens = 0;

  for (const sentence of sentences) {
    const sentenceTokens = estimateTokens(sentence);

    if (currentTokens + sentenceTokens > maxTokens && current.length > 0) {
      chunks.push(current.join(" "));

      // Build overlap from the end of the current chunk
      const overlapSentences: string[] = [];
      let overlapTokens = 0;
      for (let i = current.length - 1; i >= 0; i--) {
        const t = estimateTokens(current[i]);
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
