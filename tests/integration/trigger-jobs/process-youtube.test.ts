import { describe, it, expect, vi } from "vitest";

// Stub the transcript fetchers at the module boundary — youtubei.js and
// supadata-js are too heavy to mock at the HTTP layer and don't test
// anything useful anyway. The transcript fetching itself is covered by
// targeted unit tests in tests/unit/trigger/.
const fetchYouTubeCaptions = vi.fn();
const fetchSupadataTranscript = vi.fn();

vi.mock("@/trigger/utils/youtube", () => ({
  fetchYouTubeCaptions,
  fetchSupadataTranscript,
  CaptionsUnavailableError: class extends Error {},
  withRetry: async <T>(fn: () => Promise<T>) => fn(),
}));

// Must import AFTER the mock.
const { processYouTubeBody } = await import("@/trigger/jobs/process-youtube");
const { getTestDb } = await import("../../helpers/db");
const { makeChurch, makeDocument } = await import("../../helpers/factories");

const fakeSegments = [
  { text: "Welcome to our sermon.", start: 0, end: 3 },
  { text: "Today we discuss faith and hope.", start: 3, end: 7 },
  { text: "Let us pray before we begin.", start: 7, end: 11 },
];

describe("processYouTubeBody", () => {
  it("chunks transcript and marks indexed when captions are available", async () => {
    // Note: a previous version of `processYouTubeBody` returned a
    // `transcriptSource` discriminator alongside the chunk count.
    // That field was removed during a refactor — the source is now
    // recorded on the document row itself rather than echoed back
    // to the trigger task. We assert success + chunks rather than
    // the (now-absent) field.
    fetchYouTubeCaptions.mockResolvedValueOnce(fakeSegments);

    const church = await makeChurch();
    const doc = await makeDocument(church.id, {
      type: "youtube",
      status: "queued",
      sourceUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    });

    const result = await processYouTubeBody({ documentId: doc.id });
    expect(result).toMatchObject({
      success: true,
      chunkCount: expect.any(Number),
    });
    expect(fetchYouTubeCaptions).toHaveBeenCalledWith("dQw4w9WgXcQ");

    const db = getTestDb();
    const chunks = await db.query.chunks.findMany({
      where: (c, { eq }) => eq(c.documentId, doc.id),
    });
    expect(chunks.length).toBeGreaterThan(0);
    expect(chunks[0].startTime).toBeGreaterThanOrEqual(0);
    expect(chunks[0].endTime).toBeGreaterThan(0);
    expect(chunks.every((c) => !!c.embedding && c.embedding.length === 1536)).toBe(
      true
    );
  });

  // The Supadata AI-transcript fallback was deliberately removed from
  // `processYouTubeBody` (see the source file's comment on `maxDuration`).
  // The pipeline is captions-only now; videos without native captions
  // are marked `skipped_no_captions` rather than transcribed via
  // Supadata. This test would assert behavior that no longer exists.
  it.skip("[obsolete] falls back to Supadata when captions fail", async () => {});

  it("regression: accepts youtube.com/live/<id> URLs", async () => {
    fetchYouTubeCaptions.mockResolvedValueOnce(fakeSegments);

    const church = await makeChurch();
    const doc = await makeDocument(church.id, {
      type: "youtube",
      status: "queued",
      sourceUrl: "https://youtube.com/live/Eo9-Zmk6Z4w?feature=share",
    });

    const result = await processYouTubeBody({ documentId: doc.id });
    expect(result.success).toBe(true);
    expect(fetchYouTubeCaptions).toHaveBeenCalledWith("Eo9-Zmk6Z4w");
  });

  it("marks failed when URL has no extractable video id", async () => {
    const church = await makeChurch();
    const doc = await makeDocument(church.id, {
      type: "youtube",
      status: "queued",
      sourceUrl: "https://vimeo.com/123",
    });

    await expect(processYouTubeBody({ documentId: doc.id })).rejects.toThrow(
      /Could not extract video ID/
    );

    const db = getTestDb();
    const final = await db.query.documents.findFirst({
      where: (d, { eq }) => eq(d.id, doc.id),
    });
    expect(final!.status).toBe("failed");
  });
});
