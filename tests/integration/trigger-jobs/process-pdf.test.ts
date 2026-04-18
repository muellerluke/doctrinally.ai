import { describe, it, expect, vi } from "vitest";
import { getTestDb } from "../../helpers/db";
import { makeChurch, makeDocument } from "../../helpers/factories";

// Short-text PDFs now delegate to the process-pdf-ocr task. Stub
// tasks.trigger so the delegation path doesn't call Trigger.dev's real
// API during tests.
vi.mock("@trigger.dev/sdk/v3", async () => {
  const actual = await vi.importActual<typeof import("@trigger.dev/sdk/v3")>(
    "@trigger.dev/sdk/v3"
  );
  return {
    ...actual,
    tasks: { ...actual.tasks, trigger: vi.fn(async () => ({ id: "mock-run" })) },
  };
});

const { processPdfBody } = await import("@/trigger/jobs/process-pdf");

describe("processPdfBody (real unpdf + MSW blob fixture)", () => {
  it("downloads from blob and either indexes or delegates to OCR", async () => {
    const church = await makeChurch();
    const doc = await makeDocument(church.id, {
      type: "pdf",
      status: "queued",
      blobPath: "https://blob.test/sample.pdf",
    });

    const result = (await processPdfBody({ documentId: doc.id })) as {
      success: true;
      chunkCount?: number;
      delegated?: "ocr";
    };
    expect(result.success).toBe(true);

    const db = getTestDb();
    const final = await db.query.documents.findFirst({
      where: (d, { eq }) => eq(d.id, doc.id),
    });

    if (result.delegated === "ocr") {
      // Short-text PDF fixture — delegated to process-pdf-ocr, which
      // would flip status to indexed/failed in a separate task run.
      expect(final!.status).toBe("processing");
    } else {
      // Text-layer extraction succeeded — we wrote chunks ourselves.
      expect(result.chunkCount).toBeGreaterThan(0);
      const chunks = await db.query.chunks.findMany({
        where: (c, { eq }) => eq(c.documentId, doc.id),
      });
      expect(chunks.length).toBeGreaterThan(0);
      expect(chunks[0].content).toMatch(/sample sermon/i);
      expect(
        chunks.every((c) => !!c.embedding && c.embedding.length === 1536)
      ).toBe(true);
      expect(final!.status).toBe("indexed");
    }
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
