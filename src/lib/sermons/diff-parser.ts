/**
 * Parses the fenced `edit` blocks the sermon-writer AI emits. Format:
 *
 *   ```edit
 *   @@ <line> @@
 *   -<line to remove>
 *   +<line to add>
 *    <unchanged context line>
 *   @@ <line> @@
 *   ...
 *   ```
 *
 * Line numbers refer to the 1-based line numbering of the sermon markdown
 * the AI was shown. Multiple hunks per fence are allowed. The parser is
 * stream-safe: feed it partial strings via `findClosedEditFences` to extract
 * complete fences as they arrive.
 */

export interface DiffHunk {
  /** 1-based line number in the "before" view the hunk targets */
  startLine: number;
  /** Lines to remove, in order, starting at startLine */
  removals: string[];
  /** Lines to add, in order, replacing removals (or inserted at startLine) */
  additions: string[];
  /** Unchanged context lines (informational only; applier re-matches on text) */
  context: string[];
}

export interface ParsedDiff {
  hunks: DiffHunk[];
  /** Raw text between hunks — useful for surfacing AI commentary */
  preamble?: string;
}

const FENCE_OPEN = /```edit\s*\n/;
const FENCE_CLOSE = /\n```/;

/**
 * Extract every *closed* `\`\`\`edit ... \`\`\`` fence from the given text,
 * returning both the parsed diffs and the outer text with fences removed.
 *
 * Designed for streaming: call repeatedly on the accumulating raw stream and
 * apply newly-completed fences. Unclosed fences at the tail are left in place.
 */
export function findClosedEditFences(raw: string): {
  fences: { fence: string; start: number; end: number; parsed: ParsedDiff }[];
  textWithoutFences: string;
} {
  const fences: {
    fence: string;
    start: number;
    end: number;
    parsed: ParsedDiff;
  }[] = [];
  let cursor = 0;
  let out = "";

  while (cursor < raw.length) {
    const openMatch = raw.slice(cursor).match(FENCE_OPEN);
    if (!openMatch || openMatch.index == null) {
      out += raw.slice(cursor);
      break;
    }
    const openAt = cursor + openMatch.index;
    const afterOpen = openAt + openMatch[0].length;
    const closeMatch = raw.slice(afterOpen).match(FENCE_CLOSE);
    if (!closeMatch || closeMatch.index == null) {
      // Fence not yet closed — leave the tail untouched
      out += raw.slice(cursor);
      break;
    }
    const contentStart = afterOpen;
    const contentEnd = afterOpen + closeMatch.index;
    const fenceEnd = contentEnd + closeMatch[0].length;

    out += raw.slice(cursor, openAt);
    const fence = raw.slice(openAt, fenceEnd);
    const body = raw.slice(contentStart, contentEnd);
    fences.push({
      fence,
      start: openAt,
      end: fenceEnd,
      parsed: parseEditBody(body),
    });
    cursor = fenceEnd;
  }

  return { fences, textWithoutFences: out };
}

/**
 * Parse the body of a single `edit` fence (without the enclosing backticks).
 * Exposed for unit testing and for callers that have already extracted a
 * fence via another route.
 */
export function parseEditBody(body: string): ParsedDiff {
  const hunks: DiffHunk[] = [];
  const lines = body.replace(/\r\n?/g, "\n").split("\n");
  let current: DiffHunk | null = null;
  let preamble = "";
  let beforeAnyHunk = true;

  for (const line of lines) {
    const hunkHeader = line.match(/^@@\s+(\d+)\s+@@/);
    if (hunkHeader) {
      if (current) hunks.push(current);
      current = {
        startLine: parseInt(hunkHeader[1], 10),
        removals: [],
        additions: [],
        context: [],
      };
      beforeAnyHunk = false;
      continue;
    }
    if (!current) {
      if (beforeAnyHunk && line.trim()) preamble += (preamble ? "\n" : "") + line;
      continue;
    }
    if (line.startsWith("-")) current.removals.push(line.slice(1));
    else if (line.startsWith("+")) current.additions.push(line.slice(1));
    else if (line.startsWith(" ")) current.context.push(line.slice(1));
    else if (line === "") {
      // Treat bare blank lines inside a hunk as additions of a blank line
      // only if the most recent op was an addition — otherwise ignore, since
      // the AI often leaves stray blank lines between hunks.
      const last = current.additions[current.additions.length - 1];
      if (last != null) current.additions.push("");
    }
  }
  if (current) hunks.push(current);

  return { hunks, preamble: preamble || undefined };
}
