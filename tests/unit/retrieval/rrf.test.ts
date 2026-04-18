import { describe, it, expect } from "vitest";
import { fuseRankings } from "@/lib/retrieval";
import type { RetrievedChunk } from "@/lib/types/citations";

const chunk = (id: string, extra: Partial<RetrievedChunk> = {}): RetrievedChunk => ({
  chunkId: id,
  documentId: `doc-${id}`,
  documentTitle: `Doc ${id}`,
  documentType: "pdf",
  content: `content ${id}`,
  semanticSimilarity: 0.8,
  ...extra,
});

describe("fuseRankings (reciprocal rank fusion)", () => {
  it("returns an empty list when both inputs are empty", () => {
    expect(fuseRankings([], [], 10)).toEqual([]);
  });

  it("preserves ordering when only semantic results are provided", () => {
    const s = [chunk("a"), chunk("b"), chunk("c")];
    const out = fuseRankings(s, [], 10);
    expect(out.map((r) => r.chunk.chunkId)).toEqual(["a", "b", "c"]);
  });

  it("boosts chunks that appear in BOTH ranked lists", () => {
    const semantic = [chunk("a"), chunk("b"), chunk("c")]; // ranks 0,1,2
    const keyword = [chunk("c"), chunk("d"), chunk("e")]; // ranks 0,1,2
    const out = fuseRankings(semantic, keyword, 10);
    // c appears in both → should outrank a/b/d/e which appear in only one list.
    expect(out[0].chunk.chunkId).toBe("c");
  });

  it("respects the limit", () => {
    const semantic = [chunk("a"), chunk("b"), chunk("c"), chunk("d")];
    const keyword = [chunk("e"), chunk("f"), chunk("g")];
    const out = fuseRankings(semantic, keyword, 3);
    expect(out).toHaveLength(3);
  });

  it("uses 1/(k+rank+1) with the provided k", () => {
    const semantic = [chunk("a"), chunk("b")];
    // With k=0: rank 0 → 1/(0+0+1)=1, rank 1 → 1/(0+1+1)=0.5
    const out = fuseRankings(semantic, [], 2, 0);
    expect(out[0].score).toBeCloseTo(1, 5);
    expect(out[1].score).toBeCloseTo(0.5, 5);
  });

  it("dedupes chunks appearing in both lists and sums their scores", () => {
    const shared = chunk("x");
    const semantic = [shared];
    const keyword = [shared];
    const out = fuseRankings(semantic, keyword, 10, 59);
    // Both at rank 0 → 1/60 each → summed to 2/60.
    expect(out).toHaveLength(1);
    expect(out[0].score).toBeCloseTo(2 / 60, 6);
  });
});
