import { describe, it, expect } from "vitest";
import {
  findClosedEditFences,
  parseEditBody,
} from "@/lib/sermons/diff-parser";

describe("parseEditBody", () => {
  it("parses a single hunk with one removal and one addition", () => {
    const body = "@@ 3 @@\n-old\n+new";
    const parsed = parseEditBody(body);
    expect(parsed.hunks).toHaveLength(1);
    expect(parsed.hunks[0]).toMatchObject({
      startLine: 3,
      removals: ["old"],
      additions: ["new"],
    });
  });

  it("parses multiple hunks per fence", () => {
    const body = "@@ 1 @@\n-a\n+A\n@@ 5 @@\n-b\n+B";
    const parsed = parseEditBody(body);
    expect(parsed.hunks).toHaveLength(2);
    expect(parsed.hunks[0].startLine).toBe(1);
    expect(parsed.hunks[1].startLine).toBe(5);
  });

  it("captures context lines (leading space)", () => {
    const body = "@@ 2 @@\n context-line\n-old\n+new";
    const parsed = parseEditBody(body);
    expect(parsed.hunks[0].context).toEqual(["context-line"]);
  });

  it("captures preamble text before the first hunk", () => {
    const body = "some commentary\n@@ 1 @@\n-x\n+y";
    const parsed = parseEditBody(body);
    expect(parsed.preamble).toContain("some commentary");
  });

  it("handles empty body", () => {
    const parsed = parseEditBody("");
    expect(parsed.hunks).toHaveLength(0);
  });

  it("handles additions only (pure insert)", () => {
    const body = "@@ 4 @@\n+freshly inserted";
    const parsed = parseEditBody(body);
    expect(parsed.hunks[0].removals).toEqual([]);
    expect(parsed.hunks[0].additions).toEqual(["freshly inserted"]);
  });

  it("handles removals only (pure delete)", () => {
    const body = "@@ 7 @@\n-bye";
    const parsed = parseEditBody(body);
    expect(parsed.hunks[0].additions).toEqual([]);
    expect(parsed.hunks[0].removals).toEqual(["bye"]);
  });
});

describe("findClosedEditFences", () => {
  it("extracts a single closed fence", () => {
    const raw = "Hello.\n```edit\n@@ 1 @@\n-x\n+y\n```\nDone.";
    const { fences, textWithoutFences } = findClosedEditFences(raw);
    expect(fences).toHaveLength(1);
    expect(fences[0].parsed.hunks).toHaveLength(1);
    expect(textWithoutFences).toContain("Hello.");
    expect(textWithoutFences).toContain("Done.");
  });

  it("leaves unclosed fences at the tail untouched", () => {
    const raw = "```edit\n@@ 1 @@\n-x\n+y"; // no closing ```
    const { fences, textWithoutFences } = findClosedEditFences(raw);
    expect(fences).toHaveLength(0);
    expect(textWithoutFences).toContain("```edit");
  });

  it("extracts multiple fences in a stream", () => {
    const raw =
      "A\n```edit\n@@ 1 @@\n-a\n+A\n```\nB\n```edit\n@@ 5 @@\n-b\n+B\n```";
    const { fences } = findClosedEditFences(raw);
    expect(fences).toHaveLength(2);
  });

  it("works with CRLF line endings", () => {
    const raw = "```edit\r\n@@ 3 @@\r\n-x\r\n+y\r\n```";
    const { fences } = findClosedEditFences(raw);
    expect(fences).toHaveLength(1);
  });

  it("does not match other fence types", () => {
    const raw = "```\nplain code\n```";
    const { fences } = findClosedEditFences(raw);
    expect(fences).toHaveLength(0);
  });
});
