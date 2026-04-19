import { schedules, tasks } from "@trigger.dev/sdk/v3";
import { eq, and, lt, inArray, isNull, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { documents } from "@/db/schema";

const DOC_TYPE_TO_TASK: Record<string, string> = {
  youtube: "process-youtube",
  pdf: "process-pdf",
  word: "process-word",
  video: "process-video",
  platejs: "process-platejs",
  website_page: "process-website-page",
};

/**
 * Hard cap on how many times the scheduler will re-queue a single document
 * before giving up. Combined with Trigger.dev's own `retry.maxAttempts: 2`
 * on each process-* task, a truly broken doc gets ≈(MAX_RETRIES + 1) × 2
 * processing attempts before the scheduler stops touching it.
 *
 * When the cap is hit the doc is left in whatever terminal state it's in
 * (usually "failed"). An admin can reset `retry_count` and try again by
 * calling retryDocument/reprocessDocument from the UI.
 */
const MAX_RETRIES = 3;

/**
 * Statuses that indicate a transient-stuck document worth re-queuing.
 * Split by cutoff because "queued" should trigger almost immediately in
 * prod (Trigger.dev normally picks up a task within seconds) while
 * "processing" legitimately runs for up to an hour on large videos.
 */
const QUEUED_CUTOFF_MS = 15 * 60 * 1000;      // 15 min — queued but never picked up
const PROCESSING_CUTOFF_MS = 60 * 60 * 1000;  // 1 hour — running job presumed dead

export const retryFailedDocuments = schedules.task({
  id: "retry-failed-documents",
  // Run every hour at :17 to avoid landing on the hour exactly.
  cron: "17 * * * *",
  machine: "small-1x",
  run: async () => {
    // --- 0. Delete unrecoverable documents ---
    // Rows with no source material at all (no blobPath, no sourceUrl, no
    // content) can never succeed. Without this step they bounce between
    // `failed` → `queued` → `processing` → `failed` forever in the retry
    // loop below. Wait 1h before reaping so an in-flight upload that is
    // mid-Phase-2 webhook doesn't get nuked.
    const unrecoverableCutoff = new Date(Date.now() - 60 * 60 * 1000);
    const deletedUnrecoverable = await db
      .delete(documents)
      .where(
        and(
          isNull(documents.blobPath),
          isNull(documents.sourceUrl),
          or(isNull(documents.content), eq(documents.content, "")),
          lt(documents.createdAt, unrecoverableCutoff)
        )
      )
      .returning({ id: documents.id });

    if (deletedUnrecoverable.length > 0) {
      console.log(
        `[retry-failed-documents] Deleted ${deletedUnrecoverable.length} unrecoverable document(s) with no source.`
      );
    }

    // --- 1. Explicitly failed docs ---
    // Wait 5 minutes so Trigger.dev's built-in retry has a chance to finish
    // before the scheduler piles on its own retry.
    const failedCutoff = new Date(Date.now() - 5 * 60 * 1000);
    const failedDocs = await db
      .select({
        id: documents.id,
        type: documents.type,
        title: documents.title,
        status: documents.status,
        retryCount: documents.retryCount,
      })
      .from(documents)
      .where(
        and(
          eq(documents.status, "failed"),
          lt(documents.updatedAt, failedCutoff),
          lt(documents.retryCount, MAX_RETRIES)
        )
      );

    // --- 2. Stuck in "queued" — short window ---
    // Trigger.dev normally picks up a queued task within seconds. If a row
    // has been sitting in "queued" for 15+ minutes, the trigger call almost
    // certainly dropped on the floor (network blip during upload webhook,
    // worker crash between queue and start, etc.).
    const queuedCutoff = new Date(Date.now() - QUEUED_CUTOFF_MS);
    const queuedStuck = await db
      .select({
        id: documents.id,
        type: documents.type,
        title: documents.title,
        status: documents.status,
        retryCount: documents.retryCount,
      })
      .from(documents)
      .where(
        and(
          inArray(documents.status, ["queued", "uploaded"]),
          lt(documents.updatedAt, queuedCutoff),
          lt(documents.retryCount, MAX_RETRIES)
        )
      );

    // --- 3. Stuck in "processing" — long window ---
    // Video transcription can legitimately take the better part of an hour.
    // Only rescue processing-stuck rows after they've been silent for 1h.
    const processingCutoff = new Date(Date.now() - PROCESSING_CUTOFF_MS);
    const processingStuck = await db
      .select({
        id: documents.id,
        type: documents.type,
        title: documents.title,
        status: documents.status,
        retryCount: documents.retryCount,
      })
      .from(documents)
      .where(
        and(
          eq(documents.status, "processing"),
          lt(documents.updatedAt, processingCutoff),
          lt(documents.retryCount, MAX_RETRIES)
        )
      );

    const allDocs = [...failedDocs, ...queuedStuck, ...processingStuck];

    if (allDocs.length === 0) {
      return {
        retriedCount: 0,
        unstuckCount: 0,
        deletedUnrecoverable: deletedUnrecoverable.length,
        capped: 0,
      };
    }

    let retriedCount = 0;
    let unstuckCount = 0;

    for (const doc of allDocs) {
      const taskId = DOC_TYPE_TO_TASK[doc.type];
      if (!taskId) continue;

      const wasFailed = doc.status === "failed";

      try {
        // Atomically flip to "queued" AND increment retryCount. The WHERE
        // clause re-checks status + retry_count so two concurrent scheduler
        // runs can't double-increment (only one of them wins the UPDATE).
        const [updated] = await db
          .update(documents)
          .set({
            status: "queued",
            errorMessage: null,
            retryCount: sql`${documents.retryCount} + 1`,
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(documents.id, doc.id),
              eq(documents.status, doc.status),
              eq(documents.retryCount, doc.retryCount)
            )
          )
          .returning({ id: documents.id });

        // Another process changed status or retryCount between our SELECT
        // and UPDATE — skip this one to avoid duplicate work.
        if (!updated) continue;

        await tasks.trigger(taskId, { documentId: doc.id });

        if (wasFailed) {
          retriedCount++;
        } else {
          unstuckCount++;
        }
      } catch (err) {
        console.error(
          `[retry-failed-documents] Failed to re-queue ${doc.type} document "${doc.title}" (${doc.id}, was ${doc.status}, retry ${doc.retryCount + 1}/${MAX_RETRIES}):`,
          err
        );
      }
    }

    // Count how many docs we looked at but skipped because they already
    // hit the retry cap — useful signal in the Trigger.dev UI for spotting
    // genuinely broken docs that need admin attention.
    const [cappedRow] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(documents)
      .where(
        and(
          inArray(documents.status, ["failed", "queued", "uploaded", "processing"]),
          sql`${documents.retryCount} >= ${MAX_RETRIES}`
        )
      );

    return {
      retriedCount,
      unstuckCount,
      deletedUnrecoverable: deletedUnrecoverable.length,
      totalFound: allDocs.length,
      capped: cappedRow?.count ?? 0,
    };
  },
});
