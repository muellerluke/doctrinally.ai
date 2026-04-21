import { task, tasks } from "@trigger.dev/sdk/v3";
import { and, eq, inArray, isNotNull } from "drizzle-orm";
import { db } from "@/db";
import {
  documents,
  youtubeChannelSyncs,
  youtubeSyncPlaylists,
} from "@/db/schema";
import {
  fetchChannelVideos,
  resolveChannel,
  resolvePlaylist,
  buildYouTubeUrl,
  type ChannelKind,
} from "../utils/youtube-channel";
import { ensurePlaylistFolder, ensureSyncFolders } from "@/lib/youtube-sync/folders";
import {
  formatProcessingError,
  logProcessingError,
} from "../utils/error-logging";

type SyncMode = "initial" | "scheduled" | "manual";

export async function syncYouTubeChannelBody(payload: {
  syncId: string;
  mode?: SyncMode;
}) {
  const { syncId, mode = "scheduled" } = payload;

  const sync = await db.query.youtubeChannelSyncs.findFirst({
    where: eq(youtubeChannelSyncs.id, syncId),
  });

  if (!sync) {
    throw new Error(`YouTube sync ${syncId} not found`);
  }

  // Scheduled runs respect the enabled toggle. Manual/initial runs push
  // through so the user-triggered "Sync now" button always works.
  if (!sync.enabled && mode === "scheduled") {
    return { skipped: true, reason: "sync disabled" };
  }

  await db
    .update(youtubeChannelSyncs)
    .set({
      status: "syncing",
      lastSyncStartedAt: new Date(),
      lastSyncError: null,
      updatedAt: new Date(),
    })
    .where(eq(youtubeChannelSyncs.id, syncId));

  try {
    // Resolve channel metadata if we don't have it yet.
    let channelId = sync.channelId;
    if (!channelId) {
      const resolved = await resolveChannel(sync.channelUrl);
      channelId = resolved.channelId;
      await db
        .update(youtubeChannelSyncs)
        .set({
          channelId: resolved.channelId,
          channelHandle: resolved.handle ?? null,
          channelTitle: resolved.title,
          channelThumbnail: resolved.thumbnail ?? null,
          updatedAt: new Date(),
        })
        .where(eq(youtubeChannelSyncs.id, syncId));
    }

    const folderIds = await ensureSyncFolders(syncId);

    // Fetch all videos on the channel + any playlists the admin explicitly
    // attached to this sync. Supadata has no channel→playlists listing
    // endpoint, so playlists are opt-in via `youtube_sync_playlists` rows.
    const channelVideos = await fetchChannelVideos(channelId);

    const playlistRows = await db.query.youtubeSyncPlaylists.findMany({
      where: eq(youtubeSyncPlaylists.syncId, syncId),
    });

    // videoId -> target folderId. Playlist membership wins over kind.
    const targetFolderByVideoId = new Map<string, string>();
    let playlistsDiscovered = 0;

    for (const row of playlistRows) {
      try {
        const resolved = await resolvePlaylist(row.playlistId);
        const folderId = await ensurePlaylistFolder(
          syncId,
          { id: resolved.playlistId, title: resolved.title },
          folderIds.playlistsRootId,
          sync.churchId
        );
        for (const id of resolved.videoIds) {
          if (!targetFolderByVideoId.has(id)) {
            targetFolderByVideoId.set(id, folderId);
          }
        }
        playlistsDiscovered++;
      } catch (err) {
        console.warn(
          `[sync-youtube-channel] Failed to resolve playlist ${row.playlistId}:`,
          err instanceof Error ? err.message : err
        );
      }
    }

    const kindByVideoId = new Map<string, ChannelKind>();
    for (const v of channelVideos) kindByVideoId.set(v.videoId, v.kind);

    // Dedup: pull every existing YouTube video id for this church in one query.
    const allIds = [
      ...new Set([
        ...channelVideos.map((v) => v.videoId),
        ...[...targetFolderByVideoId.keys()],
      ]),
    ];

    let skipped = 0;
    let imported = 0;

    // Previously-skipped rows are re-checked every sync so that captions
    // turned on after initial ingestion flow back into processing without
    // any manual intervention.
    const skippedRecheckRows = await db
      .select({ id: documents.id })
      .from(documents)
      .where(
        and(
          eq(documents.churchId, sync.churchId),
          eq(documents.type, "youtube"),
          eq(documents.status, "skipped_no_captions")
        )
      );
    const skippedRecheckIds = skippedRecheckRows.map((r) => r.id);

    if (allIds.length === 0 && skippedRecheckIds.length === 0) {
      await db
        .update(youtubeChannelSyncs)
        .set({
          status: "active",
          lastSyncEndedAt: new Date(),
          lastSyncStats: { imported: 0, skipped: 0, playlistsDiscovered },
          updatedAt: new Date(),
        })
        .where(eq(youtubeChannelSyncs.id, syncId));
      return { success: true, imported: 0, skipped: 0, playlistsDiscovered };
    }

    const existingRows =
      allIds.length > 0
        ? await db
            .select({ youtubeVideoId: documents.youtubeVideoId })
            .from(documents)
            .where(
              and(
                eq(documents.churchId, sync.churchId),
                isNotNull(documents.youtubeVideoId),
                inArray(documents.youtubeVideoId, allIds)
              )
            )
        : [];

    const existing = new Set(
      existingRows.map((r) => r.youtubeVideoId).filter((v): v is string => !!v)
    );
    skipped += existing.size;

    const toInsert: Array<{
      videoId: string;
      kind: ChannelKind;
      folderId: string;
    }> = [];
    for (const id of allIds) {
      if (existing.has(id)) continue;
      const kind = kindByVideoId.get(id) ?? "video";
      const folderId =
        targetFolderByVideoId.get(id) ??
        (kind === "short"
          ? folderIds.shortsId
          : kind === "live"
            ? folderIds.liveId
            : folderIds.videosId);
      toInsert.push({ videoId: id, kind, folderId });
    }

    // Insert new rows (status "queued" pending caption check) in batches.
    // Unlike the old pipeline, we do NOT trigger process-youtube here —
    // scan-channel-captions fans out caption probes first and only enqueues
    // processing for rows we know have captions available.
    const BATCH = 100;
    const insertedIds: string[] = [];
    for (let i = 0; i < toInsert.length; i += BATCH) {
      const slice = toInsert.slice(i, i + BATCH);

      // Pre-select above dedups against existing rows, so a unique violation
      // here only happens under a concurrent sync race — rare because the
      // `status = "syncing"` guard + the `lastSyncStartedAt` watchdog in
      // retry-failed-documents prevent overlapping runs for the same church.
      // If one still slips through we let the insert throw and Trigger
      // retries the whole batch.
      const inserted = await db
        .insert(documents)
        .values(
          slice.map((v) => ({
            churchId: sync.churchId,
            uploadedBy: sync.createdBy ?? null,
            title: buildYouTubeUrl(v.videoId, v.kind),
            type: "youtube" as const,
            status: "queued" as const,
            sourceUrl: buildYouTubeUrl(v.videoId, v.kind),
            youtubeVideoId: v.videoId,
            folderId: v.folderId,
            metadata: {
              autoSync: true,
              syncId,
              kind: v.kind,
            },
          }))
        )
        .returning({ id: documents.id });

      imported += inserted.length;
      for (const row of inserted) insertedIds.push(row.id);
    }

    const scanDocIds = [...insertedIds, ...skippedRecheckIds];

    await db
      .update(youtubeChannelSyncs)
      .set({
        status: "active",
        lastSyncEndedAt: new Date(),
        lastSyncStats: {
          imported,
          skipped,
          playlistsDiscovered,
          recoveredFromSkipped: skippedRecheckIds.length,
        },
        updatedAt: new Date(),
      })
      .where(eq(youtubeChannelSyncs.id, syncId));

    if (scanDocIds.length > 0) {
      await tasks.trigger("scan-channel-captions", {
        syncId,
        documentIds: scanDocIds,
      });
    }

    return {
      success: true,
      imported,
      skipped,
      playlistsDiscovered,
      queuedForCaptionScan: scanDocIds.length,
    };
  } catch (error) {
    logProcessingError("sync-youtube-channel", error);
    const message = formatProcessingError(error);
    await db
      .update(youtubeChannelSyncs)
      .set({
        status: "failed",
        lastSyncError: message,
        lastSyncEndedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(youtubeChannelSyncs.id, syncId));
    throw error;
  }
}

export const syncYouTubeChannel = task({
  id: "sync-youtube-channel",
  machine: "small-1x",
  retry: { maxAttempts: 2 },
  run: syncYouTubeChannelBody,
});
