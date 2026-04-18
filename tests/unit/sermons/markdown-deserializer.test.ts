import { describe, it, expect } from "vitest";
import {
  sermonMarkdownToPlate,
  parseReference,
} from "@/lib/sermons/markdown-deserializer";
import { plateToSermonMarkdown } from "@/lib/sermons/markdown-serializer";
import { BIBLE_PASSAGE_TYPE } from "@/components/documents/bible-passage-element";

describe("parseReference", () => {
  it("parses a simple reference", () => {
    expect(parseReference("Romans 5:1")).toEqual({
      book: "Romans",
      chapter: 5,
      verse: "1",
    });
  });
  it("parses a range", () => {
    expect(parseReference("Romans 5:1-2")).toEqual({
      book: "Romans",
      chapter: 5,
      verse: "1-2",
    });
  });
  it("parses a multi-word book name", () => {
    expect(parseReference("1 Corinthians 13:4-7")?.book).toBe("1 Corinthians");
  });
  it("returns null on garbage", () => {
    expect(parseReference("not a ref")).toBeNull();
    expect(parseReference("")).toBeNull();
  });
});

describe("sermonMarkdownToPlate", () => {
  it("parses a heading and paragraph", () => {
    const nodes = sermonMarkdownToPlate("# Hello\n\nWorld.");
    expect(nodes[0]).toMatchObject({ type: "h1" });
    expect(nodes[1]).toMatchObject({ type: "p" });
  });

  it("parses self-closing bible-passage tags", () => {
    const nodes = sermonMarkdownToPlate(
      '<bible-passage ref="Romans 5:1-2" version="BSB" />'
    );
    expect(nodes[0]).toMatchObject({
      type: BIBLE_PASSAGE_TYPE,
      book: "Romans",
      chapter: 5,
      verse: "1-2",
      version: "BSB",
    });
  });

  it("round-trips through the serializer", () => {
    const original = [
      { type: "h1", children: [{ text: "Grace" }] },
      { type: "p", children: [{ text: "Peace." }] },
      {
        type: BIBLE_PASSAGE_TYPE,
        book: "Romans",
        chapter: 5,
        verse: "1",
        version: "BSB",
        children: [{ text: "" }],
      },
    ];
    const md = plateToSermonMarkdown(original);
    const restored = sermonMarkdownToPlate(md);
    expect(restored.length).toBe(3);
    expect(restored[0]).toMatchObject({ type: "h1" });
    expect(restored[2]).toMatchObject({
      type: BIBLE_PASSAGE_TYPE,
      book: "Romans",
      chapter: 5,
      verse: "1",
    });
  });

  it("preserves bold in inline text", () => {
    const nodes = sermonMarkdownToPlate("This is **important** text.");
    expect(nodes[0]).toMatchObject({ type: "p" });
    const children = (nodes[0] as { children: unknown[] }).children as {
      text: string;
      bold?: boolean;
    }[];
    const bolded = children.find((c) => c.bold);
    expect(bolded?.text).toBe("important");
  });

  it("parses blockquotes", () => {
    const nodes = sermonMarkdownToPlate("> Wisdom begins in wonder.");
    expect(nodes[0]).toMatchObject({ type: "blockquote" });
  });

  it("parses callouts (serializer convention)", () => {
    const nodes = sermonMarkdownToPlate("!> Important note");
    expect(nodes[0]).toMatchObject({ type: "callout" });
  });

  it("parses code fences", () => {
    const nodes = sermonMarkdownToPlate("```\nconst x = 1;\n```");
    expect(nodes[0]).toMatchObject({ type: "code_block" });
    const inner = (
      (nodes[0] as { children: { text: string }[] }).children[0]
    ).text;
    expect(inner).toBe("const x = 1;");
  });

  it("parses multiple bullets as separate li blocks", () => {
    const nodes = sermonMarkdownToPlate("- one\n- two\n- three");
    expect(nodes.length).toBe(3);
    for (const n of nodes) expect(n).toMatchObject({ type: "li" });
  });

  it("handles empty input by emitting a blank paragraph", () => {
    const nodes = sermonMarkdownToPlate("");
    expect(nodes.length).toBe(1);
    expect(nodes[0]).toMatchObject({ type: "p" });
  });

  it("handles unicode", () => {
    const nodes = sermonMarkdownToPlate("# ἀγάπη");
    const heading = nodes[0] as { type: string; children: { text: string }[] };
    expect(heading.type).toBe("h1");
    expect(heading.children[0].text).toBe("ἀγάπη");
  });

  it("emits a placeholder bible-passage node for an unparsable ref", () => {
    const nodes = sermonMarkdownToPlate('<bible-passage ref="garbage" />');
    expect(nodes[0]).toMatchObject({
      type: BIBLE_PASSAGE_TYPE,
      chapter: 0,
    });
  });

  it("recovers from a bible-passage embedded mid-paragraph", () => {
    const nodes = sermonMarkdownToPlate(
      'Before <bible-passage ref="Romans 5:1" version="BSB" /> after'
    );
    // Should split into paragraph, bible_passage, paragraph
    expect(nodes.length).toBeGreaterThanOrEqual(2);
    const hasBible = nodes.some(
      (n) => (n as { type: string }).type === BIBLE_PASSAGE_TYPE
    );
    expect(hasBible).toBe(true);
  });

  it("parses underlined and strikethrough marks", () => {
    const nodes = sermonMarkdownToPlate("__underlined__ and ~~gone~~");
    const children = (nodes[0] as { children: unknown[] }).children as {
      text: string;
      underline?: boolean;
      strikethrough?: boolean;
    }[];
    expect(children.some((c) => c.underline)).toBe(true);
    expect(children.some((c) => c.strikethrough)).toBe(true);
  });

  it("parses nested blocks separated by blank lines", () => {
    const md = "# Title\n\nPara one.\n\nPara two.";
    const nodes = sermonMarkdownToPlate(md);
    expect(nodes.length).toBe(3);
    expect(nodes[0]).toMatchObject({ type: "h1" });
    expect(nodes[1]).toMatchObject({ type: "p" });
    expect(nodes[2]).toMatchObject({ type: "p" });
  });

  it("treats a line of dashes as a horizontal rule", () => {
    const nodes = sermonMarkdownToPlate("Before\n\n---\n\nAfter");
    expect(nodes[1]).toMatchObject({ type: "hr" });
  });

  it("handles CRLF line endings", () => {
    const nodes = sermonMarkdownToPlate("# Hello\r\n\r\nWorld.");
    expect(nodes[0]).toMatchObject({ type: "h1" });
    expect(nodes[1]).toMatchObject({ type: "p" });
  });

  it("never leaves AI-facing verse text hydrated", () => {
    const md =
      '<bible-passage ref="John 3:16" version="BSB" />\n\nCommentary.';
    const nodes = sermonMarkdownToPlate(md);
    const bible = nodes.find(
      (n) => (n as { type: string }).type === BIBLE_PASSAGE_TYPE
    ) as { children: [{ text: string }] } | undefined;
    expect(bible?.children[0].text).toBe("");
  });
});
