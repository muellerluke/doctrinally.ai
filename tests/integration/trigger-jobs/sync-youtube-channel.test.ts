import { describe, it, expect, vi, beforeEach } from "vitest";

// Stub the Supadata channel fetcher + the Trigger.dev `tasks` API at the
// module boundary. We're testing the orchestration in sync-youtube-channel
// (dedup, folder routing, idempotency), not the HTTP transport.
const fetchChannelVideos = vi.fn();
const resolveChannel = vi.fn();
const resolvePlaylist = vi.fn();
const batchTrigger = vi.fn().mockResolvedValue(undefined);

vi.mock("@/trigger/utils/youtube-channel", async () => {
  const actual = await vi.importActual<
    typeof import("@/trigger/utils/youtube-channel")
  >("@/trigger/utils/youtube-channel");
  return {
    ...actual,
    fetchChannelVideos,
    resolveChannel,
    resolvePlaylist,
  };
});

vi.mock("@trigger.dev/sdk/v3", () => ({
  task: (opts: { run: unknown }) => opts.run,
  tasks: {
    batchTrigger,
    trigger: vi.fn(),
  },
}));

const { syncYouTubeChannelBody } = await import(
  "@/trigger/jobs/sync-youtube-channel"
);
const { getTestDb } = await import("../../helpers/db");
const {
  makeChurch,
  makeDocument,
} = await import("../../helpers/factories");
const { youtubeChannelSyncs, youtubeSyncPlaylists, folders } = await import(
  "@/db/schema"
);
const { eq } = await import("drizzle-orm");

async function makeSync(churchId: string) {
  const db = getTestDb();
  const [row] = await db
    .insert(youtubeChannelSyncs)
    .values({
      churchId,
      channelUrl: "https://www.youtube.com/@testchurch",
      channelId: "UC1234567890123456789012",
      channelTitle: "Test Church",
    })
    .returning();
  return row;
}

beforeEach(() => {
  fetchChannelVideos.mockReset();
  resolveChannel.mockReset();
  resolvePlaylist.mockReset();
  batchTrigger.mockClear();
});

describe("syncYouTubeChannelBody", () => {
  it("creates YouTube folder tree on first run and imports new videos into the right folders", async () => {
    const church = await makeChurch();
    const sync = await makeSync(church.id);

    fetchChannelVideos.mockResolvedValueOnce([
      { videoId: "aaaaaaaaaaa", kind: "video" },
      { videoId: "bbbbbbbbbbb", kind: "short" },
      { videoId: "ccccccccccc", kind: "live" },
    ]);

    const result = await syncYouTubeChannelBody({
      syncId: sync.id,
      mode: "initial",
    });

    expect(result).toMatchObject({
      success: true,
      imported: 3,
      skipped: 0,
    });

    const db = getTestDb();

    // Folder tree exists under "YouTube"
    const root = await db.query.folders.findFirst({
      where: (f, { eq, and, isNull }) =>
        and(eq(f.churchId, church.id), isNull(f.parentId), eq(f.name, "YouTube")),
    });
    expect(root).toBeTruthy();

    const children = await db
      .select()
      .from(folders)
      .where(eq(folders.parentId, root!.id));
    const names = children.map((c) => c.name).sort();
    expect(names).toEqual(["Live Streams", "Playlists", "Shorts", "Videos"]);

    // Docs landed in the correct kind-based folders.
    const docs = await db.query.documents.findMany({
      where: (d, { eq }) => eq(d.churchId, church.id),
    });
    expect(docs).toHaveLength(3);

    const byId = Object.fromEntries(
      docs.map((d) => [d.youtubeVideoId, d])
    ) as Record<string, typeof docs[number]>;

    const videosFolder = children.find((c) => c.name === "Videos")!;
    const shortsFolder = children.find((c) => c.name === "Shorts")!;
    const liveFolder = children.find((c) => c.name === "Live Streams")!;

    expect(byId["aaaaaaaaaaa"].folderId).toBe(videosFolder.id);
    expect(byId["bbbbbbbbbbb"].folderId).toBe(shortsFolder.id);
    expect(byId["ccccccccccc"].folderId).toBe(liveFolder.id);

    // Every doc queued for processing.
    expect(batchTrigger).toHaveBeenCalledWith(
      "process-youtube",
      expect.arrayContaining([
        expect.objectContaining({
          payload: expect.objectContaining({ documentId: byId["aaaaaaaaaaa"].id }),
        }),
      ])
    );

    // Sync row reflects completion.
    const final = await db.query.youtubeChannelSyncs.findFirst({
      where: eq(youtubeChannelSyncs.id, sync.id),
    });
    expect(final!.status).toBe("active");
    expect(final!.lastSyncStats).toMatchObject({ imported: 3, skipped: 0 });
    expect(final!.rootFolderId).toBe(root!.id);
  });

  it("skips videos already in the library (manual or prior sync) and imports only net-new", async () => {
    const church = await makeChurch();
    const sync = await makeSync(church.id);

    // Pretend a pastor manually uploaded one of these videos before the
    // channel was connected. Auto-sync must treat it as a duplicate.
    await makeDocument(church.id, {
      type: "youtube",
      status: "indexed",
      sourceUrl: "https://www.youtube.com/watch?v=preexist123",
      youtubeVideoId: "preexist123",
      title: "Manually uploaded sermon",
    });

    fetchChannelVideos.mockResolvedValueOnce([
      { videoId: "preexist123", kind: "video" },
      { videoId: "newvideo456", kind: "video" },
    ]);

    const result = await syncYouTubeChannelBody({
      syncId: sync.id,
      mode: "scheduled",
    });

    expect(result).toMatchObject({
      success: true,
      imported: 1,
      skipped: 1,
    });

    const db = getTestDb();
    const docs = await db.query.documents.findMany({
      where: (d, { eq }) => eq(d.churchId, church.id),
    });
    expect(docs).toHaveLength(2);
    const byId = docs.map((d) => d.youtubeVideoId).sort();
    expect(byId).toEqual(["newvideo456", "preexist123"]);
  });

  it("re-uses the existing folder tree on subsequent runs instead of creating a second set", async () => {
    const church = await makeChurch();
    const sync = await makeSync(church.id);

    fetchChannelVideos.mockResolvedValue([
      { videoId: "firstvideo1", kind: "video" },
    ]);

    await syncYouTubeChannelBody({ syncId: sync.id, mode: "initial" });
    await syncYouTubeChannelBody({ syncId: sync.id, mode: "scheduled" });

    const db = getTestDb();
    const rootsNamed = await db
      .select()
      .from(folders)
      .where(eq(folders.churchId, church.id));

    // Exactly one "YouTube" + one each of Videos, Shorts, Live Streams, Playlists.
    const names = rootsNamed.map((f) => f.name).sort();
    expect(names).toEqual([
      "Live Streams",
      "Playlists",
      "Shorts",
      "Videos",
      "YouTube",
    ]);
  });

  it("routes playlist videos into their playlist folder", async () => {
    const church = await makeChurch();
    const sync = await makeSync(church.id);

    // Attach a playlist to the sync.
    const db = getTestDb();
    await db.insert(youtubeSyncPlaylists).values({
      syncId: sync.id,
      playlistId: "PLephesians",
    });

    resolvePlaylist.mockResolvedValueOnce({
      playlistId: "PLephesians",
      title: "Ephesians Series",
      videoIds: ["playlistvid1", "playlistvid2"],
    });
    fetchChannelVideos.mockResolvedValueOnce([
      { videoId: "playlistvid1", kind: "video" },
      { videoId: "playlistvid2", kind: "video" },
      { videoId: "standalonevid", kind: "video" },
    ]);

    const result = await syncYouTubeChannelBody({
      syncId: sync.id,
      mode: "initial",
    });
    expect(result.imported).toBe(3);

    const playlistFolder = await db.query.folders.findFirst({
      where: (f, { eq, and }) =>
        and(eq(f.churchId, church.id), eq(f.name, "Ephesians Series")),
    });
    expect(playlistFolder).toBeTruthy();

    const docs = await db.query.documents.findMany({
      where: (d, { eq }) => eq(d.churchId, church.id),
    });
    const byVid = Object.fromEntries(
      docs.map((d) => [d.youtubeVideoId, d])
    ) as Record<string, typeof docs[number]>;

    expect(byVid["playlistvid1"].folderId).toBe(playlistFolder!.id);
    expect(byVid["playlistvid2"].folderId).toBe(playlistFolder!.id);
    // Standalone video lands in Videos, not the playlist folder.
    expect(byVid["standalonevid"].folderId).not.toBe(playlistFolder!.id);
  });

  it("skips scheduled runs when sync is disabled", async () => {
    const church = await makeChurch();
    const sync = await makeSync(church.id);

    const db = getTestDb();
    await db
      .update(youtubeChannelSyncs)
      .set({ enabled: false })
      .where(eq(youtubeChannelSyncs.id, sync.id));

    const result = await syncYouTubeChannelBody({
      syncId: sync.id,
      mode: "scheduled",
    });
    expect(result).toEqual({ skipped: true, reason: "sync disabled" });
    expect(fetchChannelVideos).not.toHaveBeenCalled();
  });
});
