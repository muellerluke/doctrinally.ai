import { BIBLE_PASSAGE_TYPE } from "@/components/documents/bible-passage-element";

type Node = {
  type?: string;
  text?: string;
  children?: Node[];
  [key: string]: unknown;
};

/**
 * Serialize a Plate JSON node tree to sermon-flavored markdown.
 *
 * Why this exists: the Vercel AI SDK round-trips text, so we need a compact
 * textual representation of the sermon for the system prompt. We use plain
 * markdown for normal blocks and a single extension — `<bible-passage ref="...">`
 * — for scripture voids so the AI never sees hydrated verse text.
 *
 * The output is deliberately simple so the line-based diff parser can operate
 * on it safely. One Plate top-level block becomes one or more lines; lines
 * inside a block never cross block boundaries.
 */
export function plateToSermonMarkdown(nodes: Node[]): string {
  if (!Array.isArray(nodes)) return "";
  const chunks: string[] = [];
  for (const node of nodes) {
    const rendered = renderBlock(node);
    if (rendered != null) chunks.push(rendered);
  }
  // Join blocks with a single blank line so the diff parser can address each
  // block's content by line number cleanly.
  return chunks.join("\n\n").replace(/\n{3,}/g, "\n\n").trimEnd();
}

function renderBlock(node: Node): string | null {
  const type = (node.type as string) || "p";

  if (type === BIBLE_PASSAGE_TYPE) {
    const book = String(node.book ?? "");
    const chapter = String(node.chapter ?? "");
    const verse = String(node.verse ?? "");
    const version = String(node.version ?? "BSB") || "BSB";
    const ref = formatReference(book, chapter, verse);
    if (!ref) return `<bible-passage ref="" version="${escapeAttr(version)}" />`;
    return `<bible-passage ref="${escapeAttr(ref)}" version="${escapeAttr(version)}" />`;
  }

  const inline = renderInline(node.children ?? []);

  switch (type) {
    case "h1":
      return `# ${inline}`;
    case "h2":
      return `## ${inline}`;
    case "h3":
      return `### ${inline}`;
    case "h4":
      return `#### ${inline}`;
    case "h5":
      return `##### ${inline}`;
    case "h6":
      return `###### ${inline}`;
    case "blockquote":
      return inline
        .split("\n")
        .map((line) => `> ${line}`)
        .join("\n");
    case "code_block":
    case "code":
      return "```\n" + inline + "\n```";
    case "callout":
      // Callouts serialize as blockquotes with a leading marker so the AI can
      // recognize them. Deserializer treats leading "!> " as a callout.
      return inline
        .split("\n")
        .map((line, i) => (i === 0 ? `!> ${line}` : `> ${line}`))
        .join("\n");
    case "hr":
      return "---";
    case "li":
      // Standalone `li` nodes are rendered as bullets; nested list structures
      // are reconstructed by Plate's markdown plugin on deserialize.
      return `- ${inline}`;
    case "p":
    default:
      return inline;
  }
}

function renderInline(children: Node[]): string {
  return children
    .map((child) => {
      if (typeof child.text === "string") {
        let text = child.text;
        if (child.code) text = "`" + text + "`";
        if (child.bold) text = "**" + text + "**";
        if (child.italic) text = "*" + text + "*";
        if (child.underline) text = "__" + text + "__";
        if (child.strikethrough) text = "~~" + text + "~~";
        return text;
      }
      // Inline element (link, bible passage inline, etc.). For sermons we only
      // expect inline text — nested elements are flattened to their text.
      if (Array.isArray(child.children)) {
        return renderInline(child.children);
      }
      return "";
    })
    .join("");
}

function formatReference(book: string, chapter: string, verse: string): string {
  if (!book || !chapter || !verse) return "";
  return `${book} ${chapter}:${verse}`;
}

function escapeAttr(value: string): string {
  return value.replace(/"/g, "&quot;");
}
