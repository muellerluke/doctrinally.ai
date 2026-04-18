import type { DiffHunk, ParsedDiff } from "./diff-parser";

export interface HunkApplicationResult {
  applied: number;
  skipped: { hunk: DiffHunk; reason: string }[];
}

export interface DiffApplicationResult extends HunkApplicationResult {
  markdown: string;
}

/**
 * Apply a parsed diff to the given markdown string, returning the new
 * markdown and a report of which hunks were applied vs skipped.
 *
 * Conflict rule: if a hunk's `-` lines don't exactly match the current
 * content at the target line, the hunk is skipped (not force-applied). This
 * is safer than best-effort fuzzy matching when the user has edited while
 * the AI was composing.
 *
 * Hunks are applied in reverse line-number order so earlier applications
 * don't shift the addresses of later hunks.
 */
export function applyDiff(markdown: string, diff: ParsedDiff): DiffApplicationResult {
  const sorted = [...diff.hunks].sort((a, b) => b.startLine - a.startLine);
  let lines = markdown.replace(/\r\n?/g, "\n").split("\n");
  let applied = 0;
  const skipped: { hunk: DiffHunk; reason: string }[] = [];

  for (const hunk of sorted) {
    const result = applyHunk(lines, hunk);
    if (result.ok) {
      lines = result.lines;
      applied += 1;
    } else {
      skipped.push({ hunk, reason: result.reason });
    }
  }

  return {
    markdown: lines.join("\n"),
    applied,
    skipped,
  };
}

export function applyHunk(
  lines: string[],
  hunk: DiffHunk
): { ok: true; lines: string[] } | { ok: false; reason: string } {
  const { startLine, removals, additions } = hunk;
  // startLine is 1-based; array is 0-based
  const idx = startLine - 1;

  if (idx < 0 || idx > lines.length) {
    return { ok: false, reason: `line ${startLine} out of range` };
  }

  // Verify removals exactly match the current content at that position.
  for (let i = 0; i < removals.length; i++) {
    const actual = lines[idx + i];
    const expected = removals[i];
    if (actual === undefined) {
      return { ok: false, reason: `line ${startLine + i} does not exist` };
    }
    if (actual !== expected) {
      return {
        ok: false,
        reason: `conflict at line ${startLine + i}: expected "${truncate(expected)}", got "${truncate(actual)}"`,
      };
    }
  }

  const next = [
    ...lines.slice(0, idx),
    ...additions,
    ...lines.slice(idx + removals.length),
  ];

  return { ok: true, lines: next };
}

function truncate(s: string, n = 40): string {
  if (s.length <= n) return s;
  return s.slice(0, n - 1) + "…";
}

/**
 * Prefix every line of the given markdown with its 1-based line number
 * (zero-padded to 2 digits minimum) for display in the AI system prompt.
 * This is what the model references in `@@ N @@` hunk headers.
 */
export function numberLines(markdown: string): string {
  const lines = markdown.replace(/\r\n?/g, "\n").split("\n");
  const width = Math.max(2, String(lines.length).length);
  return lines
    .map((line, i) => `${String(i + 1).padStart(width, "0")}  ${line}`)
    .join("\n");
}
