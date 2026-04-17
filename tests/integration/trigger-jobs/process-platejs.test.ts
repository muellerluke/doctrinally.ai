import { describe, it, expect } from "vitest";
import { getTestDb } from "../../helpers/db";
import { makeChurch, makeDocument } from "../../helpers/factories";
import { processPlatejsBody } from "@/trigger/jobs/process-platejs";

describe("processPlatejsBody", () => {
  it("chunks markdown by heading, creates embeddings, marks doc indexed", async () => {
    const church = await makeChurch();
    const doc = await makeDocument(church.id, {
      type: "platejs",
      status: "queued",
      content: [
        "# Intro",
        "Welcome to the sermon.",
        "",
        "## On Faith",
        "Faith is the substance of things hoped for.",
        "",
        "## On Hope",
        "Hope anchors the soul.",
      ].join("\n"),
    });

    const result = await processPlatejsBody({ documentId: doc.id });
    expect(result).toMatchObject({ success: true, chunkCount: 3 });

    const db = getTestDb();
    const chunks = await db.query.chunks.findMany({
      where: (c, { eq }) => eq(c.documentId, doc.id),
      orderBy: (c, { asc }) => asc(c.chunkIndex),
    });
    expect(chunks.map((c) => c.heading)).toEqual(["Intro", "On Faith", "On Hope"]);
    expect(chunks.every((c) => !!c.embedding && c.embedding.length === 1536)).toBe(
      true
    );

    const final = await db.query.documents.findFirst({
      where: (d, { eq }) => eq(d.id, doc.id),
    });
    expect(final!.status).toBe("indexed");
  });

  it("marks the document failed when content is empty", async () => {
    const church = await makeChurch();
    const doc = await makeDocument(church.id, {
      type: "platejs",
      status: "queued",
      content: "",
    });

    await expect(processPlatejsBody({ documentId: doc.id })).rejects.toThrow(
      /no content/i
    );

    const db = getTestDb();
    const final = await db.query.documents.findFirst({
      where: (d, { eq }) => eq(d.id, doc.id),
    });
    expect(final!.status).toBe("failed");
    expect(final!.errorMessage).toMatch(/no content/i);
  });

  it("replaces existing chunks on reprocess", async () => {
    const church = await makeChurch();
    const doc = await makeDocument(church.id, {
      type: "platejs",
      status: "queued",
      content: "# First\nOne.",
    });

    await processPlatejsBody({ documentId: doc.id });
    const db = getTestDb();
    const first = await db.query.chunks.findMany({
      where: (c, { eq }) => eq(c.documentId, doc.id),
    });
    expect(first).toHaveLength(1);

    // Change the content and reprocess.
    await db
      .update((await import("@/db/schema")).documents)
      .set({ content: "# Updated\nNew content.\n\n## Section B\nMore." })
      .where(
        (await import("drizzle-orm")).eq(
          (await import("@/db/schema")).documents.id,
          doc.id
        )
      );

    await processPlatejsBody({ documentId: doc.id });
    const second = await db.query.chunks.findMany({
      where: (c, { eq }) => eq(c.documentId, doc.id),
      orderBy: (c, { asc }) => asc(c.chunkIndex),
    });
    expect(second).toHaveLength(2);
    expect(second.map((c) => c.heading)).toEqual(["Updated", "Section B"]);
  });
});
