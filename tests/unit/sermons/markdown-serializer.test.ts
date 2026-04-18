import { describe, it, expect } from "vitest";
import { plateToSermonMarkdown } from "@/lib/sermons/markdown-serializer";

const H = (level: number, text: string) => ({
  type: `h${level}`,
  children: [{ text }],
});
const P = (text: string) => ({ type: "p", children: [{ text }] });
const BIBLE = (
  book: string,
  chapter: number,
  verse: string,
  version = "BSB"
) => ({
  type: "bible_passage",
  book,
  chapter,
  verse,
  version,
  children: [{ text: "" }],
});

describe("plateToSermonMarkdown", () => {
  it("serializes a heading and paragraph", () => {
    const md = plateToSermonMarkdown([H(1, "Hello"), P("World.")]);
    expect(md).toBe("# Hello\n\nWorld.");
  });

  it("serializes h2/h3", () => {
    const md = plateToSermonMarkdown([H(2, "Sub"), H(3, "Sub sub")]);
    expect(md).toBe("## Sub\n\n### Sub sub");
  });

  it("emits a <bible-passage> self-closing tag for scripture voids", () => {
    const md = plateToSermonMarkdown([
      P("See:"),
      BIBLE("Romans", 5, "1-2"),
    ]);
    expect(md).toContain('<bible-passage ref="Romans 5:1-2" version="BSB" />');
  });

  it("defaults version to BSB when the node has none", () => {
    const md = plateToSermonMarkdown([
      BIBLE("John", 3, "16", ""),
    ]);
    expect(md).toContain('version="BSB"');
  });

  it("serializes bold and italic inline marks", () => {
    const md = plateToSermonMarkdown([
      {
        type: "p",
        children: [
          { text: "Grace is " },
          { text: "amazing", bold: true },
          { text: " and " },
          { text: "sufficient", italic: true },
          { text: "." },
        ],
      },
    ]);
    expect(md).toBe("Grace is **amazing** and *sufficient*.");
  });

  it("serializes blockquotes with a leading '> ' on each line", () => {
    const md = plateToSermonMarkdown([
      { type: "blockquote", children: [{ text: "Line one\nLine two" }] },
    ]);
    expect(md).toBe("> Line one\n> Line two");
  });

  it("serializes callouts with '!> ' first line and '> ' continuation", () => {
    const md = plateToSermonMarkdown([
      { type: "callout", children: [{ text: "Note\nmore" }] },
    ]);
    expect(md).toBe("!> Note\n> more");
  });

  it("serializes code blocks with fences", () => {
    const md = plateToSermonMarkdown([
      { type: "code_block", children: [{ text: "const x = 1;" }] },
    ]);
    expect(md).toContain("```");
    expect(md).toContain("const x = 1;");
  });

  it("serializes bullet lists as individual li blocks", () => {
    const md = plateToSermonMarkdown([
      { type: "li", children: [{ text: "first" }] },
      { type: "li", children: [{ text: "second" }] },
    ]);
    expect(md).toBe("- first\n\n- second");
  });

  it("escapes attribute quotes in bible refs", () => {
    const md = plateToSermonMarkdown([BIBLE('Jo"hn', 3, "16")]);
    expect(md).toContain("&quot;");
  });

  it("ignores empty inputs safely", () => {
    expect(plateToSermonMarkdown([])).toBe("");
    expect(plateToSermonMarkdown(null as never)).toBe("");
  });

  it("renders horizontal rule", () => {
    const md = plateToSermonMarkdown([
      P("Before"),
      { type: "hr", children: [{ text: "" }] },
      P("After"),
    ]);
    expect(md).toBe("Before\n\n---\n\nAfter");
  });

  it("serializes inline code", () => {
    const md = plateToSermonMarkdown([
      {
        type: "p",
        children: [
          { text: "Use " },
          { text: "grace()", code: true },
          { text: " often." },
        ],
      },
    ]);
    expect(md).toBe("Use `grace()` often.");
  });

  it("handles multiple bible passages in sequence", () => {
    const md = plateToSermonMarkdown([
      BIBLE("Romans", 5, "1"),
      BIBLE("Ephesians", 2, "14"),
    ]);
    expect(md.match(/<bible-passage/g)?.length).toBe(2);
  });

  it("does not leak hydrated verse text", () => {
    const md = plateToSermonMarkdown([BIBLE("John", 3, "16")]);
    // Should never include the actual verse text — AI sees only the reference.
    expect(md).not.toMatch(/For God so loved/);
  });

  it("treats unknown block types as paragraphs (graceful fallback)", () => {
    const md = plateToSermonMarkdown([
      { type: "weird_unknown_block", children: [{ text: "hello" }] },
    ]);
    expect(md).toBe("hello");
  });

  it("serializes an h2 followed by a bible passage with no duplicate blank lines", () => {
    const md = plateToSermonMarkdown([
      H(2, "Section"),
      BIBLE("Psalm", 23, "1"),
    ]);
    expect(md).not.toMatch(/\n{3,}/);
  });
});
