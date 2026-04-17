import { describe, it, expect } from "vitest";
import { getTestDb } from "../../helpers/db";
import { makeChurch, makeDocument } from "../../helpers/factories";
import { processPdfBody } from "@/trigger/jobs/process-pdf";

describe("processPdfBody (real unpdf + MSW blob fixture)", () => {
  it("downloads from blob, extracts text, chunks, embeds, indexes", async () => {
    const church = await makeChurch();
    const doc = await makeDocument(church.id, {
      type: "pdf",
      status: "queued",
      blobPath: "https://blob.test/sample.pdf",
    });

    const result = await processPdfBody({ documentId: doc.id });
    expect(result).toMatchObject({
      success: true,
      chunkCount: expect.any(Number),
    });
    expect(result.chunkCount).toBeGreaterThan(0);

    const db = getTestDb();
    const chunks = await db.query.chunks.findMany({
      where: (c, { eq }) => eq(c.documentId, doc.id),
    });
    expect(chunks.length).toBeGreaterThan(0);
    expect(chunks[0].content).toMatch(/sample sermon/i);
    expect(chunks.every((c) => !!c.embedding && c.embedding.length === 1536)).toBe(
      true
    );

    const final = await db.query.documents.findFirst({
      where: (d, { eq }) => eq(d.id, doc.id),
    });
    expect(final!.status).toBe("indexed");
  });

  it("marks failed when blob path is missing", async () => {
    const church = await makeChurch();
    const doc = await makeDocument(church.id, {
      type: "pdf",
      status: "queued",
      blobPath: null,
    });

    await expect(processPdfBody({ documentId: doc.id })).rejects.toThrow();

    const db = getTestDb();
    const final = await db.query.documents.findFirst({
      where: (d, { eq }) => eq(d.id, doc.id),
    });
    expect(final!.status).toBe("failed");
  });

  it("marks failed when blob URL returns 404", async () => {
    const church = await makeChurch();
    const doc = await makeDocument(church.id, {
      type: "pdf",
      status: "queued",
      blobPath: "https://blob.test/does-not-exist.pdf",
    });

    await expect(processPdfBody({ documentId: doc.id })).rejects.toThrow();

    const db = getTestDb();
    const final = await db.query.documents.findFirst({
      where: (d, { eq }) => eq(d.id, doc.id),
    });
    expect(final!.status).toBe("failed");
  });
});
