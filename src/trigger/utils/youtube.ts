import { Innertube } from "youtubei.js";
import { Supadata } from "@supadata/js";
import type { WhisperSegment } from "./whisper";

export class CaptionsUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CaptionsUnavailableError";
  }
}

/**
 * Retry a function with exponential backoff when it throws a rate-limit
 * or transient server error. Retries on HTTP 429, 500, 502, 503, 504
 * and generic network errors.
 */
async function withRetry<T>(
  fn: () => Promise<T>,
  {
    maxAttempts = 3,
    baseDelayMs = 2000,
    label = "request",
  }: { maxAttempts?: number; baseDelayMs?: number; label?: string } = {}
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      const message =
        err instanceof Error ? err.message : String(err);
      const isRetryable =
        /429|rate.?limit|too many requests|500|502|503|504|ECONNRESET|ETIMEDOUT|fetch failed/i.test(
          message
        );
      if (!isRetryable || attempt === maxAttempts) break;
      const delay = baseDelayMs * Math.pow(2, attempt - 1);
      console.warn(
        `[${label}] Attempt ${attempt}/${maxAttempts} failed (${message}), retrying in ${delay}ms...`
      );
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  throw lastError;
}

/**
 * Tier 1 — Free: pull captions from YouTube's InnerTube API via youtubei.js.
 * Works on most videos, including ones where the old timedtext endpoint
 * returns "Transcript is disabled".
 */
export async function fetchYouTubeCaptions(
  videoId: string
): Promise<WhisperSegment[]> {
  let transcript;
  try {
    transcript = await withRetry(
      async () => {
        const yt = await Innertube.create({
          lang: "en",
          retrieve_player: false,
        });
        const info = await yt.getInfo(videoId);
        return info.getTranscript();
      },
      { label: "YouTube InnerTube" }
    );
  } catch (err) {
    throw new CaptionsUnavailableError(
      err instanceof Error ? err.message : "Failed to fetch captions"
    );
  }

  const rawSegments =
    transcript?.transcript?.content?.body?.initial_segments ?? [];

  if (rawSegments.length === 0) {
    throw new CaptionsUnavailableError(
      "No caption segments returned for this video"
    );
  }

  const segments: WhisperSegment[] = [];
  for (const s of rawSegments) {
    // Skip non-text segments (e.g., SectionHeaderRenderer).
    const text = s.snippet?.text;
    const startMs = Number(s.start_ms);
    const endMs = Number(s.end_ms);
    if (!text || Number.isNaN(startMs) || Number.isNaN(endMs)) continue;
    segments.push({
      text,
      start: startMs / 1000,
      end: endMs / 1000,
    });
  }

  if (segments.length === 0) {
    throw new CaptionsUnavailableError(
      "Caption segments were present but contained no text"
    );
  }

  return segments;
}

/**
 * Tier 2 — Cheap (~$0.001/req): use Supadata's YouTube transcript API.
 * Handles bot-detection and datacenter IP issues on their end.
 * Falls back to their AI-generated transcript if native captions are missing.
 */
export async function fetchSupadataTranscript(
  videoId: string
): Promise<WhisperSegment[]> {
  const apiKey = process.env.SUPADATA_API_KEY;
  if (!apiKey) {
    throw new Error("SUPADATA_API_KEY is not set — cannot use Supadata fallback");
  }

  const supadata = new Supadata({ apiKey });

  const url = `https://www.youtube.com/watch?v=${videoId}`;
  const result = await withRetry(
    () => supadata.transcript({ url, lang: "en" }),
    { label: "Supadata transcript" }
  );

  // Handle async jobs (large files return a jobId instead of immediate content)
  type TranscriptContent = import("@supadata/js").TranscriptChunk[] | string;
  let content: TranscriptContent | undefined;

  if ("jobId" in result) {
    const jobId = result.jobId;
    const maxAttempts = 60; // ~60 seconds max
    for (let i = 0; i < maxAttempts; i++) {
      await new Promise((r) => setTimeout(r, 1000));
      const job = await withRetry(
        () => supadata.transcript.getJobStatus(jobId),
        { maxAttempts: 3, baseDelayMs: 1000, label: "Supadata job poll" }
      );
      if (job.status === "completed" && job.result) {
        content = job.result.content;
        break;
      }
      if (job.status === "failed") {
        throw new Error(`Supadata job ${jobId} failed`);
      }
    }
    if (content === undefined) {
      throw new Error(`Supadata job ${result.jobId} timed out after ${maxAttempts}s`);
    }
  } else {
    content = result.content;
  }

  if (!content) {
    throw new Error("Supadata returned empty transcript");
  }

  // Timestamped chunks: { text, offset (ms), duration (ms), lang }
  if (Array.isArray(content)) {
    const segments: WhisperSegment[] = content
      .filter((c) => c.text && typeof c.offset === "number")
      .map((c) => ({
        text: c.text,
        start: c.offset / 1000,
        end: (c.offset + (c.duration || 0)) / 1000,
      }));

    if (segments.length === 0) {
      throw new Error("Supadata returned chunks but none had text");
    }
    return segments;
  }

  // Plain text fallback — no timestamps, create a single segment
  if (typeof content === "string" && content.trim().length > 0) {
    return [{ text: content.trim(), start: 0, end: 0 }];
  }

  throw new Error("Supadata returned unrecognized transcript format");
}
