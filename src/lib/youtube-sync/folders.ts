import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import { folders, youtubeChannelSyncs, youtubeSyncPlaylists } from "@/db/schema";

/**
 * Looks up a folder by exact (churchId, parentId, name) triple. `parentId`
 * of `null` explicitly matches the top-level folders so `IS NULL` is used
 * instead of `= null`.
 */
async function findFolder(
  churchId: string,
  parentId: string | null,
  name: string
) {
  const where = parentId
    ? and(
        eq(folders.churchId, churchId),
        eq(folders.parentId, parentId),
        eq(folders.name, name)
      )
    : and(
        eq(folders.churchId, churchId),
        isNull(folders.parentId),
        eq(folders.name, name)
      );

  return db.query.folders.findFirst({ where });
}

async function getOrCreateFolder(
  churchId: string,
  parentId: string | null,
  name: string
): Promise<string> {
  const existing = await findFolder(churchId, parentId, name);
  if (existing) return existing.id;

  // Race-safe insert: if another concurrent sync just created the same
  // folder, the (churchId, parentId, name) unique constraint raises and
  // we re-read to return the winner's id.
  try {
    const [row] = await db
      .insert(folders)
      .values({ churchId, parentId, name })
      .returning({ id: folders.id });
    return row.id;
  } catch {
    const reread = await findFolder(churchId, parentId, name);
    if (reread) return reread.id;
    throw new Error(
      `Failed to create or resolve folder "${name}" for church ${churchId}`
    );
  }
}

export type SyncFolderIds = {
  rootId: string;
  videosId: string;
  shortsId: string;
  liveId: string;
  playlistsRootId: string;
};

/**
 * Idempotently creates the "YouTube" folder tree for a church and persists
 * the folder ids on the sync row so re-runs are a single lookup. Respects
 * manual renames: if the sync already has folder ids saved, those are used
 * verbatim even if the admin renamed them in the library UI.
 */
export async function ensureSyncFolders(
  syncId: string
): Promise<SyncFolderIds> {
  const sync = await db.query.youtubeChannelSyncs.findFirst({
    where: eq(youtubeChannelSyncs.id, syncId),
  });
  if (!sync) throw new Error(`YouTube sync ${syncId} not found`);

  const churchId = sync.churchId;

  // If everything is already saved, short-circuit.
  if (
    sync.rootFolderId &&
    sync.videosFolderId &&
    sync.shortsFolderId &&
    sync.liveFolderId &&
    sync.playlistsRootFolderId
  ) {
    return {
      rootId: sync.rootFolderId,
      videosId: sync.videosFolderId,
      shortsId: sync.shortsFolderId,
      liveId: sync.liveFolderId,
      playlistsRootId: sync.playlistsRootFolderId,
    };
  }

  const rootId =
    sync.rootFolderId ?? (await getOrCreateFolder(churchId, null, "YouTube"));
  const videosId =
    sync.videosFolderId ??
    (await getOrCreateFolder(churchId, rootId, "Videos"));
  const shortsId =
    sync.shortsFolderId ??
    (await getOrCreateFolder(churchId, rootId, "Shorts"));
  const liveId =
    sync.liveFolderId ??
    (await getOrCreateFolder(churchId, rootId, "Live Streams"));
  const playlistsRootId =
    sync.playlistsRootFolderId ??
    (await getOrCreateFolder(churchId, rootId, "Playlists"));

  await db
    .update(youtubeChannelSyncs)
    .set({
      rootFolderId: rootId,
      videosFolderId: videosId,
      shortsFolderId: shortsId,
      liveFolderId: liveId,
      playlistsRootFolderId: playlistsRootId,
      updatedAt: new Date(),
    })
    .where(eq(youtubeChannelSyncs.id, syncId));

  return { rootId, videosId, shortsId, liveId, playlistsRootId };
}

/**
 * Idempotently creates a folder under "YouTube/Playlists" for a specific
 * playlist, and upserts the `youtube_sync_playlists` row that ties the
 * playlist id to the folder. Returns the folder id.
 */
export async function ensurePlaylistFolder(
  syncId: string,
  playlist: { id: string; title: string },
  playlistsRootId: string,
  churchId: string
): Promise<string> {
  const existing = await db.query.youtubeSyncPlaylists.findFirst({
    where: and(
      eq(youtubeSyncPlaylists.syncId, syncId),
      eq(youtubeSyncPlaylists.playlistId, playlist.id)
    ),
  });

  if (existing?.folderId) {
    if (existing.playlistTitle !== playlist.title) {
      await db
        .update(youtubeSyncPlaylists)
        .set({ playlistTitle: playlist.title, updatedAt: new Date() })
        .where(eq(youtubeSyncPlaylists.id, existing.id));
    }
    return existing.folderId;
  }

  const folderId = await getOrCreateFolder(
    churchId,
    playlistsRootId,
    playlist.title || playlist.id
  );

  if (existing) {
    await db
      .update(youtubeSyncPlaylists)
      .set({
        playlistTitle: playlist.title,
        folderId,
        updatedAt: new Date(),
      })
      .where(eq(youtubeSyncPlaylists.id, existing.id));
  } else {
    await db.insert(youtubeSyncPlaylists).values({
      syncId,
      playlistId: playlist.id,
      playlistTitle: playlist.title,
      folderId,
    });
  }

  return folderId;
}
