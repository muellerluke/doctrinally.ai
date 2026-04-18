"use client";

import Markdown from "react-markdown";
import { splitCitationSegments } from "@/lib/citations/parse";
import { DocumentEmbed } from "@/components/chat/document-embed";
import { SermonDiffCard } from "./sermon-diff-card";
import { parseEditBody, type ParsedDiff } from "@/lib/sermons/diff-parser";
import type { Citation } from "@/lib/types/citations";

export interface SermonMessageFence {
  /** Byte index in the raw message where the fence starts (for deduping) */
  start: number;
  /** Whether the fence has finished streaming */
  closed: boolean;
  /** Parsed diff (null while streaming) */
  diff: ParsedDiff | null;
  /** Post-apply result, populated once the fence is applied to the editor */
  applyResult?: { applied: number; skipped: { reason: string }[] };
}

export interface SermonMessageProps {
  role: "user" | "assistant";
  content: string;
  citations?: Citation[];
  isStreaming?: boolean;
  /** Indexed by the fence's raw text start offset in content. */
  fences?: Record<number, SermonMessageFence>;
}

/**
 * Render a sermon-writer chat message. Splits the raw content by:
 *   1. `\`\`\`edit … \`\`\`` fences (closed or in-progress) → `SermonDiffCard`
 *   2. `<document>DOC_ID</document>` tags → `DocumentEmbed`
 * Remaining text is rendered as markdown.
 */
export function SermonChatMessage({
  role,
  content,
  citations = [],
  isStreaming,
  fences = {},
}: SermonMessageProps) {
  if (role === "user") {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] rounded-2xl rounded-br-sm bg-primary px-4 py-2.5 text-sm text-primary-foreground">
          {content}
        </div>
      </div>
    );
  }

  const segments = splitByFences(content);

  return (
    <div className="text-sm leading-relaxed">
      {segments.map((seg, i) => {
        if (seg.kind === "fence") {
          const fence = fences[seg.start];
          if (!seg.closed) {
            return <SermonDiffCard key={`fence-${i}`} inProgress />;
          }
          const diff = fence?.diff ?? parseEditBody(seg.body);
          return (
            <SermonDiffCard
              key={`fence-${i}`}
              diff={diff}
              applyResult={fence?.applyResult}
            />
          );
        }
        return (
          <TextWithCitations
            key={`text-${i}`}
            text={seg.text}
            citations={citations}
          />
        );
      })}
      {isStreaming && !content && (
        <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-muted-foreground/40" />
      )}
    </div>
  );
}

function TextWithCitations({
  text,
  citations,
}: {
  text: string;
  citations: Citation[];
}) {
  const parts = splitCitationSegments(text, citations);
  return (
    <>
      {parts.map((seg, i) =>
        seg.kind === "text" ? (
          <Markdown
            key={`md-${i}`}
            components={{
              p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
              strong: ({ children }) => (
                <strong className="font-semibold">{children}</strong>
              ),
              em: ({ children }) => <em>{children}</em>,
              ul: ({ children }) => (
                <ul className="mb-2 list-disc space-y-0.5 pl-5 last:mb-0">
                  {children}
                </ul>
              ),
              ol: ({ children }) => (
                <ol className="mb-2 list-decimal space-y-0.5 pl-5 last:mb-0">
                  {children}
                </ol>
              ),
              li: ({ children }) => <li>{children}</li>,
              h1: ({ children }) => (
                <h3 className="mb-1.5 mt-3 text-sm font-semibold first:mt-0">
                  {children}
                </h3>
              ),
              h2: ({ children }) => (
                <h4 className="mb-1.5 mt-3 text-sm font-semibold first:mt-0">
                  {children}
                </h4>
              ),
              code: ({ children, className }) => {
                const isBlock = className?.includes("language-");
                if (isBlock) {
                  return (
                    <code className="block overflow-x-auto rounded-md bg-muted p-2 text-xs">
                      {children}
                    </code>
                  );
                }
                return (
                  <code className="rounded bg-muted px-1 py-0.5 text-xs">
                    {children}
                  </code>
                );
              },
              blockquote: ({ children }) => (
                <blockquote className="mb-2 border-l-2 border-primary/30 pl-3 italic text-muted-foreground last:mb-0">
                  {children}
                </blockquote>
              ),
              a: ({ href, children }) => (
                <a
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-primary underline decoration-primary/30 underline-offset-2 hover:decoration-primary/60"
                >
                  {children}
                </a>
              ),
            }}
          >
            {seg.value}
          </Markdown>
        ) : (
          <DocumentEmbed key={`embed-${i}`} citation={seg.citation} />
        )
      )}
    </>
  );
}

type FenceSegment =
  | { kind: "text"; text: string }
  | { kind: "fence"; start: number; closed: boolean; body: string };

/**
 * Split a raw assistant message into alternating text and ```edit``` fence
 * segments. Unclosed fences at the tail become in-progress segments.
 *
 * Exported for testing.
 */
export function splitByFences(content: string): FenceSegment[] {
  const segs: FenceSegment[] = [];
  let cursor = 0;

  while (cursor < content.length) {
    const openIdx = content.indexOf("```edit", cursor);
    if (openIdx === -1) {
      if (cursor < content.length)
        segs.push({ kind: "text", text: content.slice(cursor) });
      break;
    }
    if (openIdx > cursor) {
      segs.push({ kind: "text", text: content.slice(cursor, openIdx) });
    }
    // Find newline after ```edit
    const headerEnd = content.indexOf("\n", openIdx);
    if (headerEnd === -1) {
      // Still streaming the header itself
      segs.push({ kind: "fence", start: openIdx, closed: false, body: "" });
      cursor = content.length;
      break;
    }
    const closeIdx = content.indexOf("\n```", headerEnd);
    if (closeIdx === -1) {
      segs.push({
        kind: "fence",
        start: openIdx,
        closed: false,
        body: content.slice(headerEnd + 1),
      });
      cursor = content.length;
      break;
    }
    segs.push({
      kind: "fence",
      start: openIdx,
      closed: true,
      body: content.slice(headerEnd + 1, closeIdx),
    });
    cursor = closeIdx + 4; // skip "\n```"
  }

  return segs;
}
