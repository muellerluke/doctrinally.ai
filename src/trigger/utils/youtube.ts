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
 * Tier 1 — Free: pull captions from YouTube's InnerTube API via youtubei.js.
 * Works on most videos, including ones where the old timedtext endpoint
 * returns "Transcript is disabled".
 */
export async function fetchYouTubeCaptions(
  videoId: string
): Promise<WhisperSegment[]> {
  const yt = await Innertube.create({
    lang: "en",
    retrieve_player: false,
  });

  let transcript;
  try {
    const info = await yt.getInfo(videoId);
    transcript = await info.getTranscript();
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
  const result = await supadata.transcript({ url, lang: "en" });

  // Handle async jobs (large files return a jobId instead of immediate content)
  type TranscriptContent = import("@supadata/js").TranscriptChunk[] | string;
  let content: TranscriptContent | undefined;

  if ("jobId" in result) {
    const jobId = result.jobId;
    const maxAttempts = 60; // ~60 seconds max
    for (let i = 0; i < maxAttempts; i++) {
      await new Promise((r) => setTimeout(r, 1000));
      const job = await supadata.transcript.getJobStatus(jobId);
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
