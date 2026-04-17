import { describe, it, expect } from "vitest";
import { getTestDb } from "../../helpers/db";
import { makeChurch, makeDocument } from "../../helpers/factories";
import { processWordBody } from "@/trigger/jobs/process-word";

describe("processWordBody (real mammoth + MSW blob fixture)", () => {
  it("downloads the .docx, extracts text, chunks, embeds, indexes", async () => {
    const church = await makeChurch();
    const doc = await makeDocument(church.id, {
      type: "word",
      status: "queued",
      blobPath: "https://blob.test/sample.docx",
    });

    const result = await processWordBody({ documentId: doc.id });
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

  it("marks failed when .docx is missing", async () => {
    const church = await makeChurch();
    const doc = await makeDocument(church.id, {
      type: "word",
      status: "queued",
      blobPath: null,
    });

    await expect(processWordBody({ documentId: doc.id })).rejects.toThrow();

    const db = getTestDb();
    const final = await db.query.documents.findFirst({
      where: (d, { eq }) => eq(d.id, doc.id),
    });
    expect(final!.status).toBe("failed");
  });
});
