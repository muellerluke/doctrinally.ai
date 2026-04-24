import { Supadata, SupadataError } from "@supadata/js";
import type { WhisperSegment } from "./whisper";

export class CaptionsUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CaptionsUnavailableError";
  }
}

function getSupadataClient(): Supadata {
  const apiKey = process.env.SUPADATA_API_KEY;
  if (!apiKey) {
    throw new Error("SUPADATA_API_KEY is not set — cannot fetch captions");
  }
  return new Supadata({ apiKey });
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

function isTranscriptUnavailable(err: unknown): boolean {
  if (err instanceof SupadataError) {
    return err.error === "transcript-unavailable" || err.error === "not-found";
  }
  // Defensive: SDK error instances don't always survive bundler boundaries,
  // so also match the error code field directly.
  if (err && typeof err === "object" && "error" in err) {
    const code = (err as { error?: unknown }).error;
    return code === "transcript-unavailable" || code === "not-found";
  }
  return false;
}

/**
 * Fetch the native (existing) caption track for a YouTube video via
 * Supadata's `/v1/transcript?mode=native` endpoint. We intentionally use
 * `mode=native` — not `auto` — so Supadata never silently falls back to
 * its AI-generated path, which is billed per-minute and would quietly
 * blow up credit usage. Churches can enable captions on their own videos
 * if they want transcripts.
 *
 * Throws `CaptionsUnavailableError` when the video has no native caption
 * track (including auto-generated ASR). All other errors propagate so
 * callers can retry on transient failures.
 */
export async function fetchYouTubeCaptions(
  videoId: string
): Promise<WhisperSegment[]> {
  const url = `https://www.youtube.com/watch?v=${videoId}`;
  const supadata = getSupadataClient();

  let result;
  try {
    result = await withRetry(
      () => supadata.transcript({ url, mode: "native" }),
      { label: "Supadata transcript (native)" }
    );
  } catch (err) {
    if (isTranscriptUnavailable(err)) {
      throw new CaptionsUnavailableError(
        err instanceof Error ? err.message : "No native transcript available"
      );
    }
    throw err;
  }

  // `mode=native` shouldn't ever return a processing job — native caption
  // fetches need no generation — but the SDK union includes `JobId`.
  // Treat the unexpected case as unavailable so we never enter a poll loop
  // that could accidentally charge for AI generation.
  if ("jobId" in result) {
    throw new CaptionsUnavailableError(
      `Supadata returned a job for mode=native (jobId=${result.jobId}) — treating as unavailable`
    );
  }

  const content = result.content;
  if (!Array.isArray(content) || content.length === 0) {
    throw new CaptionsUnavailableError(
      "Native transcript was empty for this video"
    );
  }

  const segments: WhisperSegment[] = [];
  for (const chunk of content) {
    const offsetMs = Number(chunk.offset);
    const durationMs = Number(chunk.duration);
    if (!chunk.text || Number.isNaN(offsetMs) || Number.isNaN(durationMs)) {
      continue;
    }
    segments.push({
      text: chunk.text,
      start: offsetMs / 1000,
      end: (offsetMs + durationMs) / 1000,
    });
  }

  if (segments.length === 0) {
    throw new CaptionsUnavailableError(
      "Native transcript chunks contained no usable text"
    );
  }

  return segments;
}

/**
 * Caption-availability probe. Resolves `true` when the video has a native
 * caption track Supadata can read (including YouTube auto-generated ASR),
 * `false` when it has none. Network/transport errors propagate so callers
 * can retry.
 *
 * Note: this intentionally downloads the transcript under the hood, because
 * Supadata's cheaper metadata endpoints (`/youtube/video.transcriptLanguages`)
 * return empty arrays for ASR-only tracks even when the transcript endpoint
 * can successfully fetch them. The full fetch is the only reliable probe.
 */
export async function hasYouTubeCaptions(videoId: string): Promise<boolean> {
  try {
    await fetchYouTubeCaptions(videoId);
    return true;
  } catch (err) {
    if (err instanceof CaptionsUnavailableError) return false;
    throw err;
  }
}
