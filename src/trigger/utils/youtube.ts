import { Innertube } from "youtubei.js";
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
export async function withRetry<T>(
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
      // Supadata wraps non-JSON upstream responses (Cloudflare HTML pages,
      // 5xx without JSON bodies) as `SupadataError` with
      // `error: "internal-error"` and `message: "Unexpected error response
      // format"`. Those are transient — retry alongside the usual
      // network/rate-limit signals.
      const isSupadataInternalError =
        err &&
        typeof err === "object" &&
        "error" in err &&
        (err as { error?: unknown }).error === "internal-error";
      const isRetryable =
        isSupadataInternalError ||
        /429|rate.?limit|too many requests|500|502|503|504|ECONNRESET|ETIMEDOUT|fetch failed|unexpected error response|invalid response format|failed to parse response/i.test(
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
 * Pull captions from YouTube's InnerTube API via youtubei.js. Used during
 * the actual processing pass to fetch transcript segments. Throws
 * `CaptionsUnavailableError` if the video has no caption tracks or an
 * empty transcript.
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
 * Cheap caption-availability probe. Returns true if the video has at least
 * one caption track exposed by InnerTube (including YouTube's auto-generated
 * ASR track, since `fetchYouTubeCaptions` happily consumes those too).
 *
 * Falls through to attempting a full transcript fetch if the player response
 * doesn't expose a usable `caption_tracks` array — some shorts / live
 * archives don't populate the metadata object the same way as regular
 * uploads, but still have a transcript available.
 *
 * Throws on network/transport errors so callers can retry. A clean "video
 * has no captions" outcome resolves to `false`.
 */
export async function hasYouTubeCaptions(videoId: string): Promise<boolean> {
  const inspect = await withRetry(
    async () => {
      const yt = await Innertube.create({
        lang: "en",
        retrieve_player: false,
      });
      const info = await yt.getInfo(videoId);
      // The youtubei.js typings don't surface `captions.caption_tracks`
      // consistently across shape-shifting player responses — read through
      // a loose cast rather than disabling type-checking on the whole file.
      const captions = (info as unknown as {
        captions?: { caption_tracks?: unknown[] };
      }).captions;
      const tracks = captions?.caption_tracks;
      return {
        hasTrackMetadata: Array.isArray(tracks),
        trackCount: Array.isArray(tracks) ? tracks.length : 0,
      };
    },
    { label: "YouTube caption probe" }
  );

  if (inspect.hasTrackMetadata) {
    return inspect.trackCount > 0;
  }

  // No caption metadata exposed — fall back to attempting a transcript
  // fetch and bucketing CaptionsUnavailableError as "no captions". Any
  // other error propagates so the caller can retry.
  try {
    await fetchYouTubeCaptions(videoId);
    return true;
  } catch (err) {
    if (err instanceof CaptionsUnavailableError) return false;
    throw err;
  }
}
