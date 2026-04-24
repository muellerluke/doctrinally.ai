import { task, tasks } from "@trigger.dev/sdk/v3";
import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  churches,
  documents,
  memberships,
  users,
  youtubeChannelSyncs,
} from "@/db/schema";
import { buildYouTubeUrl } from "../utils/youtube-channel";
import { sendCaptionScanReportEmail } from "@/lib/email";

type ScanPayload = {
  syncId: string;
  documentIds: string[];
};

// Trigger.dev's batch.triggerAndWait caps out at 500 items per call.
// Chunk the document list so large church channels still work.
const BATCH_LIMIT = 500;

/**
 * Orchestrates transcript processing for a batch of YouTube documents and
 * then reports caption coverage to the church owner. Invoked by:
 *   - `sync-youtube-channel` after discovering new videos
 *   - `rescanChannelCaptions` server action (manual "Rescan now" button)
 *
 * Runs `process-youtube` for each doc (single Supadata fetch — either
 * indexes or marks `skipped_no_captions`), waits for all to finish, then
 * computes church-wide coverage, writes `last_caption_scan` on the sync
 * row, and notifies owners if any videos were missing captions.
 *
 * This was previously a two-stage flow (`check-video-captions` probe then
 * `process-youtube`) which cost 2 Supadata credits per video. Collapsing
 * to a single `process-youtube` call halves credit usage because the
 * transcript fetch itself is the only reliable caption-availability probe.
 */
export async function scanChannelCaptionsBody(payload: ScanPayload) {
  const { syncId, documentIds } = payload;

  const sync = await db.query.youtubeChannelSyncs.findFirst({
    where: eq(youtubeChannelSyncs.id, syncId),
  });
  if (!sync) {
    throw new Error(`YouTube sync ${syncId} not found`);
  }

  if (documentIds.length > 0) {
    for (let i = 0; i < documentIds.length; i += BATCH_LIMIT) {
      const chunk = documentIds.slice(i, i + BATCH_LIMIT);
      await tasks.batchTriggerAndWait(
        "process-youtube",
        chunk.map((id) => ({ payload: { documentId: id } }))
      );
    }
  }

  // Church-wide coverage snapshot. Counts every YouTube doc — indexed rows
  // stay in the "with captions" bucket (by the time a row is indexed we
  // know captions were available, even if `has_captions` is null on legacy
  // Supadata-ingested docs).
  const [countsRow] = await db
    .select({
      total: sql<number>`count(*)::int`,
      withCaptions: sql<number>`count(*) filter (
        where ${documents.hasCaptions} = true
           or ${documents.status} = 'indexed'
      )::int`,
      withoutCaptions: sql<number>`count(*) filter (
        where ${documents.status} = 'skipped_no_captions'
      )::int`,
    })
    .from(documents)
    .where(
      and(
        eq(documents.churchId, sync.churchId),
        eq(documents.type, "youtube")
      )
    );

  const total = countsRow?.total ?? 0;
  const withCaptions = countsRow?.withCaptions ?? 0;
  const withoutCaptions = countsRow?.withoutCaptions ?? 0;

  const missingSampleRows = await db
    .select({
      id: documents.id,
      title: documents.title,
      youtubeVideoId: documents.youtubeVideoId,
      sourceUrl: documents.sourceUrl,
    })
    .from(documents)
    .where(
      and(
        eq(documents.churchId, sync.churchId),
        eq(documents.type, "youtube"),
        eq(documents.status, "skipped_no_captions")
      )
    )
    .limit(10);

  const missingSample = missingSampleRows.map((row) => ({
    documentId: row.id,
    title: row.title,
    url:
      row.sourceUrl ??
      (row.youtubeVideoId ? buildYouTubeUrl(row.youtubeVideoId, "video") : ""),
  }));

  await db
    .update(youtubeChannelSyncs)
    .set({
      lastCaptionScan: {
        scannedAt: new Date().toISOString(),
        total,
        withCaptions,
        withoutCaptions,
        missingSample,
        notified: false,
      },
      updatedAt: new Date(),
    })
    .where(eq(youtubeChannelSyncs.id, syncId));

  let notified = false;
  if (withoutCaptions > 0) {
    try {
      const owners = await db
        .select({ email: users.email, name: users.name })
        .from(memberships)
        .innerJoin(users, eq(users.id, memberships.userId))
        .where(
          and(
            eq(memberships.churchId, sync.churchId),
            eq(memberships.role, "owner")
          )
        );

      const [church] = await db
        .select({ name: churches.name })
        .from(churches)
        .where(eq(churches.id, sync.churchId))
        .limit(1);

      for (const owner of owners) {
        if (!owner.email) continue;
        await sendCaptionScanReportEmail(owner.email, {
          churchName: church?.name ?? "your church",
          channelTitle: sync.channelTitle ?? "your YouTube channel",
          total,
          withCaptions,
          withoutCaptions,
          missingSample,
        });
      }

      notified = owners.length > 0;
    } catch (err) {
      console.error(
        `[scan-channel-captions] notification email failed for sync ${syncId}:`,
        err
      );
    }

    if (notified) {
      await db
        .update(youtubeChannelSyncs)
        .set({
          lastCaptionScan: {
            scannedAt: new Date().toISOString(),
            total,
            withCaptions,
            withoutCaptions,
            missingSample,
            notified: true,
          },
          updatedAt: new Date(),
        })
        .where(eq(youtubeChannelSyncs.id, syncId));
    }
  }

  return {
    success: true,
    total,
    withCaptions,
    withoutCaptions,
    processed: documentIds.length,
    notified,
  };
}

export const scanChannelCaptions = task({
  id: "scan-channel-captions",
  machine: "small-1x",
  retry: { maxAttempts: 1 },
  // Large enough to cover batchTriggerAndWait on hundreds of process-youtube
  // runs; v3 checkpoints waiting tasks so the machine isn't pinned the
  // whole time.
  maxDuration: 1800,
  run: scanChannelCaptionsBody,
});
