import type { Citation } from "@/lib/types/citations";

export type CitationSegment =
  | { kind: "text"; value: string }
  | { kind: "embed"; docId: string; citation: Citation };

/**
 * Parse `<document>DOC_ID</document>` tags out of assistant content and
 * return a flat list of text + embed segments. Unknown doc ids (no matching
 * citation) are silently dropped — we prefer missing a citation to rendering
 * a broken one.
 *
 * Extracted from the member-facing chat message so the sermon-writer chat
 * can reuse the same format without duplicating logic.
 */
export function splitCitationSegments(
  content: string,
  citations: Citation[]
): CitationSegment[] {
  const byId = new Map(citations.map((c) => [c.documentId, c]));
  const segments: CitationSegment[] = [];
  const regex = /<document>([^<]+)<\/document>/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(content)) !== null) {
    if (match.index > lastIndex) {
      segments.push({
        kind: "text",
        value: content.slice(lastIndex, match.index),
      });
    }
    const docId = match[1].trim();
    const citation = byId.get(docId);
    if (citation) {
      segments.push({ kind: "embed", docId, citation });
    }
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < content.length) {
    segments.push({ kind: "text", value: content.slice(lastIndex) });
  }

  return segments;
}

/** Remove all `<document>…</document>` tags from a string, leaving plain text. */
export function stripCitationTags(content: string): string {
  return content.replace(/<document>[^<]*<\/document>/g, "");
}
