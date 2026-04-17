import { describe, it, expect } from "vitest";
import {
  chunkByTokens,
  chunkByHeadings,
  chunkTranscript,
} from "@/trigger/utils/chunking";

describe("chunkByTokens", () => {
  it("returns a single chunk for short input", () => {
    const out = chunkByTokens("Short text.", 300, 30);
    expect(out).toHaveLength(1);
  });

  it("splits long text into multiple chunks", () => {
    const sentence = "This is a reasonably long sentence that takes up some tokens.";
    const text = Array(40).fill(sentence).join(" ");
    const out = chunkByTokens(text, 100, 10);
    expect(out.length).toBeGreaterThan(1);
  });

  it("chunks overlap (last sentence of chunk N appears in chunk N+1)", () => {
    const sentences = [
      "Alpha sentence one.",
      "Bravo sentence two.",
      "Charlie sentence three.",
      "Delta sentence four.",
      "Echo sentence five.",
      "Foxtrot sentence six.",
    ];
    // ~5 tokens per sentence; maxTokens=12 forces splits; overlap=5 keeps ~1 sentence.
    const out = chunkByTokens(sentences.join(" "), 12, 5);
    expect(out.length).toBeGreaterThan(1);
    // The first sentence of chunk[1] should have appeared in chunk[0].
    const firstSentenceOfSecond = out[1].split(".")[0] + ".";
    expect(out[0]).toContain(firstSentenceOfSecond);
  });
});

describe("chunkByHeadings", () => {
  it("yields chunks per heading with heading label captured", () => {
    const md = `# Intro\nHello world.\n\n## Section A\nContent A.\n\n## Section B\nContent B.\n`;
    const out = chunkByHeadings(md);
    expect(out.map((c) => c.heading)).toEqual(["Intro", "Section A", "Section B"]);
    expect(out[0].content).toBe("Hello world.");
    expect(out[1].content).toBe("Content A.");
    expect(out[2].content).toBe("Content B.");
  });

  it("returns a single untitled chunk when no headings present", () => {
    const out = chunkByHeadings("Just body.\nMore body.");
    expect(out).toHaveLength(1);
    expect(out[0].heading).toBeNull();
    expect(out[0].content).toContain("Just body.");
  });
});

describe("chunkTranscript", () => {
  const seg = (text: string, start: number, end: number) => ({
    text,
    start,
    end,
  });

  it("returns [] for empty input", () => {
    expect(chunkTranscript([])).toEqual([]);
  });

  it("groups segments into ~maxDuration-second chunks", () => {
    const segments = Array.from({ length: 20 }, (_, i) =>
      seg(`word${i}`, i * 10, i * 10 + 10)
    );
    const chunks = chunkTranscript(segments, 60);
    // 200s of content at 60s per chunk → ≥3 chunks
    expect(chunks.length).toBeGreaterThanOrEqual(3);
    // First chunk starts at 0
    expect(chunks[0].startTime).toBe(0);
    // Times strictly increase
    for (let i = 1; i < chunks.length; i++) {
      expect(chunks[i].startTime).toBeGreaterThanOrEqual(chunks[i - 1].endTime);
    }
  });

  it("rounds start/end times to integers", () => {
    const out = chunkTranscript(
      [seg("a", 0.4, 1.8), seg("b", 1.8, 3.3)],
      120
    );
    expect(Number.isInteger(out[0].startTime)).toBe(true);
    expect(Number.isInteger(out[0].endTime)).toBe(true);
  });
});
