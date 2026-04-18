import { schedules, tasks } from "@trigger.dev/sdk/v3";
import { eq, and, lt, inArray, isNull, or } from "drizzle-orm";
import { db } from "@/db";
import { documents } from "@/db/schema";

const DOC_TYPE_TO_TASK: Record<string, string> = {
  youtube: "process-youtube",
  pdf: "process-pdf",
  word: "process-word",
  video: "process-video",
  platejs: "process-platejs",
};

/** Statuses that indicate a document is stuck and should be retried. */
const STUCK_STATUSES = ["uploaded", "queued", "processing"] as const;

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

    // --- 1. Retry explicitly failed documents ---
    // Only retry documents that have been in "failed" state for at least
    // 5 minutes. This avoids re-triggering a document that JUST failed
    // and might still be in a Trigger.dev built-in retry cycle.
    const failedCutoff = new Date(Date.now() - 5 * 60 * 1000);

    const failedDocs = await db
      .select({
        id: documents.id,
        type: documents.type,
        title: documents.title,
        status: documents.status,
      })
      .from(documents)
      .where(
        and(
          eq(documents.status, "failed"),
          lt(documents.updatedAt, failedCutoff)
        )
      );

    // --- 2. Unstick documents stuck in a transient state for over an hour ---
    // These are documents that got stuck in "uploaded", "queued", or
    // "processing" — likely because the Trigger.dev worker crashed, the
    // task timed out without updating the DB, or deployment interrupted a
    // running job.
    const stuckCutoff = new Date(Date.now() - 60 * 60 * 1000);

    const stuckDocs = await db
      .select({
        id: documents.id,
        type: documents.type,
        title: documents.title,
        status: documents.status,
      })
      .from(documents)
      .where(
        and(
          inArray(documents.status, [...STUCK_STATUSES]),
          lt(documents.updatedAt, stuckCutoff)
        )
      );

    const allDocs = [...failedDocs, ...stuckDocs];

    if (allDocs.length === 0) {
      return {
        retriedCount: 0,
        unstuckCount: 0,
        deletedUnrecoverable: deletedUnrecoverable.length,
      };
    }

    let retriedCount = 0;
    let unstuckCount = 0;

    for (const doc of allDocs) {
      const taskId = DOC_TYPE_TO_TASK[doc.type];
      if (!taskId) continue;

      const wasFailed = doc.status === "failed";

      try {
        // Mark as queued BEFORE triggering so a concurrent run of this
        // same scheduled task won't pick it up again. The processing task
        // itself will set "processing" when it starts and "failed" if it
        // errors.
        //
        // The WHERE clause re-checks the current status to prevent a race
        // with a manual retry, another concurrent scheduled run, or the
        // document legitimately transitioning to a new state between our
        // SELECT and this UPDATE.
        const [updated] = await db
          .update(documents)
          .set({
            status: "queued",
            errorMessage: null,
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(documents.id, doc.id),
              eq(documents.status, doc.status)
            )
          )
          .returning({ id: documents.id });

        // If the row wasn't updated, another process already changed its
        // status — skip triggering to avoid a duplicate job.
        if (!updated) continue;

        await tasks.trigger(taskId, { documentId: doc.id });

        if (wasFailed) {
          retriedCount++;
        } else {
          unstuckCount++;
        }
      } catch (err) {
        console.error(
          `[retry-failed-documents] Failed to re-queue ${doc.type} document "${doc.title}" (${doc.id}, was ${doc.status}):`,
          err
        );
      }
    }

    return {
      retriedCount,
      unstuckCount,
      deletedUnrecoverable: deletedUnrecoverable.length,
      totalFound: allDocs.length,
    };
  },
});
