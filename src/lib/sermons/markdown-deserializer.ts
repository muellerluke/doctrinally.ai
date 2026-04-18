import { BIBLE_PASSAGE_TYPE } from "@/components/documents/bible-passage-element";

type Node = {
  type?: string;
  text?: string;
  children?: Node[];
  [key: string]: unknown;
};

const BIBLE_TAG_RE =
  /<bible-passage\s+([^>]*?)\s*\/?\s*>(?:\s*<\/bible-passage>)?/gi;

/**
 * Parse the sermon-flavored markdown produced by the serializer (or authored
 * by the AI) back into a Plate JSON node tree.
 *
 * This is NOT a general-purpose markdown parser. It recognizes the subset our
 * serializer emits plus the `<bible-passage>` extension:
 *
 *   - `# / ## / ###` headings (up to h6)
 *   - `> ` blockquotes
 *   - `!> ` callouts (serializer convention)
 *   - ``` fenced code blocks
 *   - `- ` / `* ` bullet list items (rendered as individual `li` blocks)
 *   - `<bible-passage ref="Book C:V[-V]" version="BSB" />` void elements
 *   - Inline bold/italic/underline/strikethrough/code
 *
 * Blocks are separated by one or more blank lines. Unknown lines fall back to
 * paragraphs so the editor never rejects AI output.
 */
export function sermonMarkdownToPlate(markdown: string): Node[] {
  const nodes: Node[] = [];
  const blocks = splitBlocks(markdown);

  for (const block of blocks) {
    const parsed = parseBlock(block);
    if (Array.isArray(parsed)) {
      nodes.push(...parsed);
    } else if (parsed) {
      nodes.push(parsed);
    }
  }

  if (nodes.length === 0) {
    nodes.push({ type: "p", children: [{ text: "" }] });
  }

  return nodes;
}

function splitBlocks(markdown: string): string[] {
  const lines = markdown.replace(/\r\n?/g, "\n").split("\n");
  const blocks: string[] = [];
  let current: string[] = [];

  let inFence = false;

  for (const line of lines) {
    if (/^```/.test(line.trim())) {
      inFence = !inFence;
      current.push(line);
      continue;
    }
    if (!inFence && line.trim() === "") {
      if (current.length > 0) {
        blocks.push(current.join("\n"));
        current = [];
      }
    } else {
      current.push(line);
    }
  }
  if (current.length > 0) blocks.push(current.join("\n"));
  return blocks;
}

function parseBlock(block: string): Node | Node[] | null {
  const trimmed = block.trim();
  if (!trimmed) return null;

  // Bible passage void (possibly multiple per block if the AI stacked them)
  if (BIBLE_TAG_RE.test(trimmed)) {
    BIBLE_TAG_RE.lastIndex = 0;
    const segments: Node[] = [];
    let lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = BIBLE_TAG_RE.exec(trimmed)) !== null) {
      const before = trimmed.slice(lastIndex, match.index).trim();
      if (before) {
        const parsed = parseNonBibleBlock(before);
        if (Array.isArray(parsed)) segments.push(...parsed);
        else if (parsed) segments.push(parsed);
      }
      const biblePassage = parseBiblePassageAttrs(match[1] ?? "");
      if (biblePassage) segments.push(biblePassage);
      lastIndex = match.index + match[0].length;
    }
    const tail = trimmed.slice(lastIndex).trim();
    if (tail) {
      const parsed = parseNonBibleBlock(tail);
      if (Array.isArray(parsed)) segments.push(...parsed);
      else if (parsed) segments.push(parsed);
    }
    return segments.length === 0 ? null : segments;
  }

  return parseNonBibleBlock(trimmed);
}

function parseNonBibleBlock(block: string): Node | Node[] | null {
  // Horizontal rule
  if (/^---+$/.test(block.trim())) {
    return { type: "hr", children: [{ text: "" }] };
  }

  // Fenced code block
  const fence = block.match(/^```[^\n]*\n([\s\S]*?)\n```$/);
  if (fence) {
    return {
      type: "code_block",
      children: [{ text: fence[1] }],
    };
  }

  // Headings
  const heading = block.match(/^(#{1,6})\s+(.*)$/);
  if (heading && !block.includes("\n")) {
    const level = heading[1].length;
    return {
      type: `h${level}`,
      children: parseInline(heading[2]),
    };
  }

  // Callout (serializer convention: first line starts with "!> ", rest with "> ")
  if (/^!>\s/.test(block)) {
    const lines = block.split("\n").map((line, i) =>
      i === 0 ? line.replace(/^!>\s?/, "") : line.replace(/^>\s?/, "")
    );
    return {
      type: "callout",
      children: parseInline(lines.join("\n")),
    };
  }

  // Blockquote (every line starts with ">")
  if (block.split("\n").every((line) => /^>/.test(line))) {
    const stripped = block
      .split("\n")
      .map((line) => line.replace(/^>\s?/, ""))
      .join("\n");
    return {
      type: "blockquote",
      children: parseInline(stripped),
    };
  }

  // List items (multiple bullets → multiple li blocks)
  if (block.split("\n").every((line) => /^(-|\*)\s+/.test(line))) {
    return block.split("\n").map((line) => ({
      type: "li",
      children: parseInline(line.replace(/^(-|\*)\s+/, "")),
    }));
  }

  // Fallback: paragraph
  return {
    type: "p",
    children: parseInline(block),
  };
}

function parseBiblePassageAttrs(attrs: string): Node | null {
  const refMatch = attrs.match(/ref\s*=\s*"([^"]*)"/i);
  const versionMatch = attrs.match(/version\s*=\s*"([^"]*)"/i);
  const ref = refMatch ? refMatch[1].trim() : "";
  const version = (versionMatch ? versionMatch[1] : "BSB") || "BSB";

  const parsed = parseReference(ref);
  if (!parsed) {
    // Unresolvable reference — emit a placeholder node so edits round-trip.
    return {
      type: BIBLE_PASSAGE_TYPE,
      book: "",
      chapter: 0,
      verse: "",
      version,
      children: [{ text: "" }],
    };
  }

  return {
    type: BIBLE_PASSAGE_TYPE,
    book: parsed.book,
    chapter: parsed.chapter,
    verse: parsed.verse,
    version,
    children: [{ text: "" }],
  };
}

/**
 * Parse a human-written Bible reference: "Romans 5:1", "1 Corinthians 13:4-7",
 * "Song of Solomon 2:1". Returns null if we can't interpret it.
 */
export function parseReference(reference: string): {
  book: string;
  chapter: number;
  verse: string;
} | null {
  const trimmed = reference.trim();
  if (!trimmed) return null;
  const match = trimmed.match(/^(.+?)\s+(\d+):(\d+(?:-\d+)?)$/);
  if (!match) return null;
  const chapter = parseInt(match[2], 10);
  if (isNaN(chapter) || chapter <= 0) return null;
  return {
    book: match[1].trim(),
    chapter,
    verse: match[3],
  };
}

function parseInline(text: string): Node[] {
  if (!text) return [{ text: "" }];
  const nodes: Node[] = [];
  let i = 0;

  while (i < text.length) {
    const remaining = text.slice(i);

    const bold = remaining.match(/^\*\*([^*]+)\*\*/);
    if (bold) {
      nodes.push({ text: bold[1], bold: true });
      i += bold[0].length;
      continue;
    }

    const italic = remaining.match(/^\*([^*]+)\*/) || remaining.match(/^_([^_]+)_/);
    if (italic) {
      nodes.push({ text: italic[1], italic: true });
      i += italic[0].length;
      continue;
    }

    const underline = remaining.match(/^__([^_]+)__/);
    if (underline) {
      nodes.push({ text: underline[1], underline: true });
      i += underline[0].length;
      continue;
    }

    const strike = remaining.match(/^~~([^~]+)~~/);
    if (strike) {
      nodes.push({ text: strike[1], strikethrough: true });
      i += strike[0].length;
      continue;
    }

    const code = remaining.match(/^`([^`]+)`/);
    if (code) {
      nodes.push({ text: code[1], code: true });
      i += code[0].length;
      continue;
    }

    // Default: consume one char into the last plain-text node or a new one
    const last = nodes[nodes.length - 1];
    if (last && typeof last.text === "string" && !last.bold && !last.italic && !last.underline && !last.strikethrough && !last.code) {
      last.text += text[i];
    } else {
      nodes.push({ text: text[i] });
    }
    i += 1;
  }

  return nodes.length === 0 ? [{ text: "" }] : nodes;
}
