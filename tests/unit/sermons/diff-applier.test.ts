import { describe, it, expect } from "vitest";
import { applyDiff, applyHunk, numberLines } from "@/lib/sermons/diff-applier";
import type { ParsedDiff, DiffHunk } from "@/lib/sermons/diff-parser";

function hunk(
  startLine: number,
  removals: string[],
  additions: string[]
): DiffHunk {
  return { startLine, removals, additions, context: [] };
}

describe("applyHunk", () => {
  it("replaces a matching line", () => {
    const lines = ["one", "two", "three"];
    const result = applyHunk(lines, hunk(2, ["two"], ["TWO"]));
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.lines).toEqual(["one", "TWO", "three"]);
  });

  it("inserts when removals empty", () => {
    const lines = ["one", "two"];
    const result = applyHunk(lines, hunk(2, [], ["inserted"]));
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.lines).toEqual(["one", "inserted", "two"]);
  });

  it("deletes when additions empty", () => {
    const lines = ["one", "two", "three"];
    const result = applyHunk(lines, hunk(2, ["two"], []));
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.lines).toEqual(["one", "three"]);
  });

  it("rejects on mismatched removal", () => {
    const lines = ["one", "two", "three"];
    const result = applyHunk(lines, hunk(2, ["wrong"], ["X"]));
    expect(result.ok).toBe(false);
  });

  it("rejects out-of-range", () => {
    const lines = ["one"];
    const result = applyHunk(lines, hunk(99, ["nope"], ["X"]));
    expect(result.ok).toBe(false);
  });

  it("supports multi-line removals", () => {
    const lines = ["a", "b", "c", "d"];
    const result = applyHunk(lines, hunk(2, ["b", "c"], ["BC"]));
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.lines).toEqual(["a", "BC", "d"]);
  });
});

describe("applyDiff", () => {
  it("applies multiple hunks in reverse line order without address drift", () => {
    const md = ["A", "B", "C", "D"].join("\n");
    const diff: ParsedDiff = {
      hunks: [hunk(1, ["A"], ["Aa"]), hunk(3, ["C"], ["Cc"])],
    };
    const result = applyDiff(md, diff);
    expect(result.applied).toBe(2);
    expect(result.markdown).toBe(["Aa", "B", "Cc", "D"].join("\n"));
  });

  it("skips conflicting hunks but applies others", () => {
    const md = ["A", "B", "C"].join("\n");
    const diff: ParsedDiff = {
      hunks: [hunk(1, ["A"], ["Aa"]), hunk(2, ["MISMATCH"], ["X"])],
    };
    const result = applyDiff(md, diff);
    expect(result.applied).toBe(1);
    expect(result.skipped).toHaveLength(1);
    expect(result.markdown.split("\n")[0]).toBe("Aa");
  });

  it("handles a mix of inserts, replaces, deletes", () => {
    const md = ["a", "b", "c"].join("\n");
    const diff: ParsedDiff = {
      hunks: [
        hunk(1, [], ["PRE"]),
        hunk(3, ["c"], []),
      ],
    };
    const result = applyDiff(md, diff);
    expect(result.applied).toBe(2);
    expect(result.markdown).toBe(["PRE", "a", "b"].join("\n"));
  });

  it("works on empty input when inserting at line 1", () => {
    const result = applyDiff("", { hunks: [hunk(1, [""], ["hello"])] });
    expect(result.applied).toBe(1);
    expect(result.markdown).toBe("hello");
  });
});

describe("numberLines", () => {
  it("prefixes each line with a zero-padded line number", () => {
    const numbered = numberLines("first\nsecond\nthird");
    expect(numbered.split("\n")).toEqual([
      "01  first",
      "02  second",
      "03  third",
    ]);
  });

  it("widens the number column for longer files", () => {
    const lines = Array.from({ length: 100 }, (_, i) => `line ${i + 1}`).join("\n");
    const first = numberLines(lines).split("\n")[0];
    // 100 lines → 3-digit width → "001  line 1"
    expect(first.startsWith("001")).toBe(true);
  });
});
