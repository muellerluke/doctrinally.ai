import { task } from "@trigger.dev/sdk/v3";
import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { documents } from "@/db/schema";
import { extractVideoId } from "../utils/extract-video-id";
import { hasYouTubeCaptions } from "../utils/youtube";

/**
 * Probe a single YouTube document for caption availability and update the
 * row accordingly. Runs at `concurrencyLimit: 3` so a whole-channel scan
 * spreads across Trigger.dev workers — bounded concurrent InnerTube calls
 * per source IP keeps us well under YouTube's rate-limit threshold.
 *
 * Only touches documents currently in `queued` or `skipped_no_captions`
 * so a race with a parallel processing run can't clobber an `indexed` row.
 */
export async function checkVideoCaptionsBody(payload: { documentId: string }) {
  const { documentId } = payload;

  const [doc] = await db
    .select()
    .from(documents)
    .where(eq(documents.id, documentId))
    .limit(1);

  if (!doc) {
    // Silently succeed — row was deleted (disconnect / cleanup). Nothing
    // to do, and throwing would trigger retries for a doomed task.
    return { skipped: true, reason: "document-not-found" };
  }

  if (doc.type !== "youtube") {
    return { skipped: true, reason: "not-youtube" };
  }

  if (!doc.sourceUrl) {
    return { skipped: true, reason: "missing-source-url" };
  }

  const videoId = extractVideoId(doc.sourceUrl);
  if (!videoId) {
    return { skipped: true, reason: "invalid-video-id" };
  }

  const available = await hasYouTubeCaptions(videoId);

  if (available) {
    // Queue for (or restore to) processing — the orchestrator will batch
    // these into process-youtube runs once every check has finished.
    await db
      .update(documents)
      .set({
        hasCaptions: true,
        status: "queued",
        errorMessage: null,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(documents.id, documentId),
          inArray(documents.status, ["queued", "skipped_no_captions"])
        )
      );
    return { documentId, hasCaptions: true };
  }

  await db
    .update(documents)
    .set({
      hasCaptions: false,
      status: "skipped_no_captions",
      errorMessage: null,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(documents.id, documentId),
        inArray(documents.status, ["queued", "skipped_no_captions"])
      )
    );
  return { documentId, hasCaptions: false };
}

export const checkVideoCaptions = task({
  id: "check-video-captions",
  machine: "micro",
  // Bounded concurrent caption probes. Trigger.dev allocates each run to
  // its own worker (different IPs), so 3-in-flight stays well under the
  // InnerTube rate limit even for large channels.
  queue: { concurrencyLimit: 3 },
  retry: { maxAttempts: 2 },
  maxDuration: 120,
  run: checkVideoCaptionsBody,
});
