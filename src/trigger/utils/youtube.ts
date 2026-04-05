import { Innertube } from "youtubei.js";
import {
  transcribeWithWhisper,
  WhisperFileTooLargeError,
  type WhisperSegment,
} from "./whisper";

export class CaptionsUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CaptionsUnavailableError";
  }
}

export { WhisperFileTooLargeError };

/**
 * Free, fast path: pull captions from YouTube's InnerTube API.
 * Works on most videos, including ones where the old timedtext
 * endpoint returns "Transcript is disabled".
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
 * Fallback path: download the smallest audio-only stream and run it
 * through OpenAI Whisper. ~$0.006/min, bounded at 25 MB input.
 */
export async function transcribeYouTubeViaWhisper(
  videoId: string
): Promise<WhisperSegment[]> {
  const yt = await Innertube.create({ retrieve_player: true });
  const info = await yt.getBasicInfo(videoId);

  const audioFormats = (info.streaming_data?.adaptive_formats ?? []).filter(
    (f) => f.mime_type?.startsWith("audio/")
  );

  if (audioFormats.length === 0) {
    throw new Error(`No audio-only formats available for video ${videoId}`);
  }

  // Pick the lowest-bitrate audio track to stay under Whisper's 25 MB cap.
  audioFormats.sort((a, b) => (a.bitrate ?? 0) - (b.bitrate ?? 0));
  const format = audioFormats[0];

  const WHISPER_MAX_BYTES = 25 * 1024 * 1024;
  if (format.content_length && format.content_length > WHISPER_MAX_BYTES) {
    throw new WhisperFileTooLargeError(format.content_length);
    // TODO: chunk audio into <25 MB pieces and stitch transcripts for long sermons.
  }

  // Download audio stream and collect into a Uint8Array.
  const stream = await yt.download(videoId, {
    type: "audio",
    quality: "bestefficiency",
    format: "any",
  });

  const parts: Uint8Array[] = [];
  let totalBytes = 0;
  const reader = stream.getReader();
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      parts.push(value);
      totalBytes += value.byteLength;
      if (totalBytes > WHISPER_MAX_BYTES) {
        throw new WhisperFileTooLargeError(totalBytes);
      }
    }
  } finally {
    reader.releaseLock();
  }

  const buffer = new Uint8Array(totalBytes);
  let offset = 0;
  for (const part of parts) {
    buffer.set(part, offset);
    offset += part.byteLength;
  }

  const blob = new Blob([buffer], {
    type: format.mime_type ?? "audio/mp4",
  });

  const ext = format.mime_type?.includes("webm") ? "webm" : "m4a";
  return transcribeWithWhisper(blob, `${videoId}.${ext}`);
}
