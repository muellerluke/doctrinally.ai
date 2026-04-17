import { describe, it, expect } from "vitest";
import { getTestDb } from "../../helpers/db";
import { makeChurch, makeDocument } from "../../helpers/factories";
import { fakeEmbedding } from "../../helpers/msw/handlers";
import { chunks } from "@/db/schema";
import { hybridSearch } from "@/lib/retrieval";

describe("hybridSearch against real pgvector + FTS", () => {
  async function seedChunk(
    churchId: string,
    documentId: string,
    content: string,
    index: number
  ) {
    const db = getTestDb();
    await db.insert(chunks).values({
      churchId,
      documentId,
      content,
      chunkIndex: index,
      embedding: fakeEmbedding(content),
    });
  }

  it("returns the most semantically similar chunks first", async () => {
    const church = await makeChurch();
    const doc = await makeDocument(church.id, {
      type: "platejs",
      status: "indexed",
    });

    // The query and chunk-0 will have identical embeddings because
    // `fakeEmbedding` is pure-deterministic on the input string. Other
    // chunks get unrelated embeddings.
    const query = "baptism and the sacraments";
    await seedChunk(church.id, doc.id, query, 0);
    await seedChunk(church.id, doc.id, "children's ministry schedule", 1);
    await seedChunk(church.id, doc.id, "parking lot re-paving plans", 2);

    const results = await hybridSearch(church.id, query, 5);
    expect(results.length).toBeGreaterThanOrEqual(1);
    expect(results[0].content).toBe(query);
  });

  it("keyword search surfaces chunks that share query tokens", async () => {
    const church = await makeChurch();
    const doc = await makeDocument(church.id, {
      type: "platejs",
      status: "indexed",
    });

    const query = "baptism sacrament";
    // Seeded content contains both keywords but a totally different
    // embedding — the FTS path must pick it up even when semantic misses.
    await seedChunk(
      church.id,
      doc.id,
      "The church teaches baptism as a sacrament",
      0
    );
    await seedChunk(church.id, doc.id, "Unrelated topic about finance", 1);

    const results = await hybridSearch(church.id, query, 5);
    expect(
      results.some(
        (r) =>
          r.content.toLowerCase().includes("baptism") &&
          r.content.toLowerCase().includes("sacrament")
      )
    ).toBe(true);
  });

  it("scopes results to the requesting church", async () => {
    const myChurch = await makeChurch();
    const otherChurch = await makeChurch();
    const myDoc = await makeDocument(myChurch.id, {
      type: "platejs",
      status: "indexed",
    });
    const otherDoc = await makeDocument(otherChurch.id, {
      type: "platejs",
      status: "indexed",
    });

    const query = "tithe and giving";
    await seedChunk(myChurch.id, myDoc.id, query, 0);
    await seedChunk(otherChurch.id, otherDoc.id, query, 0); // same content

    const results = await hybridSearch(myChurch.id, query, 5);
    for (const r of results) {
      // Via the document table — the retrieved chunk's document must belong
      // to myChurch.
      expect(r.documentId).toBe(myDoc.id);
    }
  });
});
