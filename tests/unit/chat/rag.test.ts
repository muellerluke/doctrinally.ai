import { describe, it, expect } from "vitest";
import { buildRagContext } from "@/lib/chat/rag";
import type { RetrievedChunk } from "@/lib/types/citations";

function chunk(overrides: Partial<RetrievedChunk> = {}): RetrievedChunk {
  return {
    chunkId: "c1",
    documentId: "d1",
    documentTitle: "Sermon on Grace",
    documentType: "platejs",
    content: "Grace is unmerited favor.",
    ...overrides,
  };
}

describe("buildRagContext", () => {
  it("returns empty string for empty input", () => {
    expect(buildRagContext([])).toBe("");
  });

  it("wraps content in <retrieved_context> with one <chunk> per entry", () => {
    const out = buildRagContext([chunk()]);
    expect(out).toContain("<retrieved_context>");
    expect(out).toContain("</retrieved_context>");
    expect(out).toContain('<chunk id="c1"');
    expect(out).toContain("Grace is unmerited favor.");
  });

  it("includes metadata attributes when present", () => {
    const out = buildRagContext([
      chunk({
        chunkId: "c1",
        heading: "Part II: Grace",
        startTime: 120,
        endTime: 180,
        pageNumber: 3,
        documentType: "video",
      }),
    ]);
    expect(out).toContain('heading="Part II: Grace"');
    expect(out).toContain('start="120"');
    expect(out).toContain('end="180"');
    expect(out).toContain('page="3"');
    expect(out).toContain('type="video"');
  });

  it("sorts chunks deterministically by chunkId (cache-friendly prefix)", () => {
    const a = chunk({ chunkId: "aaa", content: "alpha" });
    const b = chunk({ chunkId: "bbb", content: "bravo" });
    const c = chunk({ chunkId: "ccc", content: "charlie" });

    const outForward = buildRagContext([a, b, c]);
    const outReversed = buildRagContext([c, b, a]);
    const outShuffled = buildRagContext([b, a, c]);

    // All three input orderings produce the same serialized block —
    // this is the whole point of determinism for cache hits.
    expect(outForward).toBe(outReversed);
    expect(outForward).toBe(outShuffled);

    // And the order within the output is alpha, bravo, charlie
    const alphaIdx = outForward.indexOf("alpha");
    const bravoIdx = outForward.indexOf("bravo");
    const charlieIdx = outForward.indexOf("charlie");
    expect(alphaIdx).toBeLessThan(bravoIdx);
    expect(bravoIdx).toBeLessThan(charlieIdx);
  });

  it("escapes quotes and ampersands in attributes", () => {
    const out = buildRagContext([
      chunk({
        documentTitle: 'Sermon on "Grace" & Truth',
      }),
    ]);
    // Title attr is quoted via &quot; and &amp; entities
    expect(out).toContain('title="Sermon on &quot;Grace&quot; &amp; Truth"');
  });

  it("same chunk set produces byte-identical output across calls", () => {
    const chunks = [
      chunk({ chunkId: "c1" }),
      chunk({ chunkId: "c2", content: "second" }),
    ];
    expect(buildRagContext(chunks)).toBe(buildRagContext(chunks));
  });
});
