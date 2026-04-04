"use client";

import Markdown from "react-markdown";
import type { Citation } from "@/lib/types/citations";
import { DocumentEmbed } from "@/components/chat/document-embed";

interface ChatMessageProps {
  role: "user" | "assistant";
  content: string;
  citations?: Citation[];
  isStreaming?: boolean;
}

type Segment =
  | { kind: "text"; value: string }
  | { kind: "embed"; node: React.ReactNode };

/**
 * Parse <document>DOCUMENT_ID</document> tags and split content into
 * text segments and DocumentEmbed components.
 */
function splitDocumentEmbeds(
  content: string,
  citations: Citation[]
): Segment[] {
  const citationByDocId = new Map(citations.map((c) => [c.documentId, c]));
  const segments: Segment[] = [];
  const regex = /<document>([^<]+)<\/document>/g;
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(content)) !== null) {
    if (match.index > lastIndex) {
      segments.push({
        kind: "text",
        value: content.slice(lastIndex, match.index),
      });
    }

    const docId = match[1].trim();
    const citation = citationByDocId.get(docId);

    if (citation) {
      segments.push({
        kind: "embed",
        node: (
          <DocumentEmbed key={`embed-${match.index}`} citation={citation} />
        ),
      });
    }

    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < content.length) {
    segments.push({ kind: "text", value: content.slice(lastIndex) });
  }

  return segments;
}

// Bible reference regex
const BIBLE_REGEX =
  /\b((?:Genesis|Exodus|Leviticus|Numbers|Deuteronomy|Joshua|Judges|Ruth|1\s*Samuel|2\s*Samuel|1\s*Kings|2\s*Kings|1\s*Chronicles|2\s*Chronicles|Ezra|Nehemiah|Esther|Job|Psalms?|Proverbs|Ecclesiastes|Song\s*of\s*Solomon|Isaiah|Jeremiah|Lamentations|Ezekiel|Daniel|Hosea|Joel|Amos|Obadiah|Jonah|Micah|Nahum|Habakkuk|Zephaniah|Haggai|Zechariah|Malachi|Matthew|Mark|Luke|John|Acts|Romans|1\s*Corinthians|2\s*Corinthians|Galatians|Ephesians|Philippians|Colossians|1\s*Thessalonians|2\s*Thessalonians|1\s*Timothy|2\s*Timothy|Titus|Philemon|Hebrews|James|1\s*Peter|2\s*Peter|1\s*John|2\s*John|3\s*John|Jude|Revelation)\s+\d+(?::\d+(?:-\d+)?)?)\b/gi;

/**
 * Process a text string for Bible references.
 * Also strips any leftover [citation:N] markers from the text.
 */
function processInlineText(
  text: string,
): React.ReactNode[] {
  // Strip any leftover [citation:N] markers the LLM might still produce
  const cleaned = text.replace(/\[citation:\d+\]/g, "");
  return processBibleRefs(cleaned);
}

function processBibleRefs(text: string): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  let lastIdx = 0;
  let m;
  // Reset regex state
  BIBLE_REGEX.lastIndex = 0;

  while ((m = BIBLE_REGEX.exec(text)) !== null) {
    if (m.index > lastIdx) {
      parts.push(text.slice(lastIdx, m.index));
    }
    const ref = m[1];
    parts.push(
      <a
        key={`b-${m.index}`}
        href={`https://www.biblegateway.com/passage/?search=${encodeURIComponent(ref)}&version=ESV`}
        target="_blank"
        rel="noopener noreferrer"
        className="font-medium text-primary underline decoration-primary/30 underline-offset-2 hover:decoration-primary/60"
      >
        {ref}
      </a>
    );
    lastIdx = m.index + m[0].length;
  }

  if (lastIdx < text.length) {
    parts.push(text.slice(lastIdx));
  }

  return parts.length > 0 ? parts : [text];
}

/**
 * Recursively process React children to inject Bible links into text nodes.
 */
function processChildren(
  children: React.ReactNode,
): React.ReactNode {
  if (typeof children === "string") {
    const processed = processInlineText(children);
    return processed.length === 1 ? processed[0] : <>{processed}</>;
  }
  if (Array.isArray(children)) {
    return children.map((child, i) =>
      typeof child === "string" ? (
        <span key={i}>{processInlineText(child)}</span>
      ) : (
        child
      )
    );
  }
  return children;
}

/**
 * Render a markdown text segment with citation and Bible link injection.
 */
function MarkdownSegment({
  text,
  citations,
}: {
  text: string;
  citations: Citation[];
}) {
  // Strip any [citation:N] from being rendered literally by markdown
  // (they'll be processed as inline elements in custom renderers)
  return (
    <Markdown
      components={{
        p: ({ children }) => (
          <p className="mb-3 last:mb-0">
            {processChildren(children)}
          </p>
        ),
        strong: ({ children }) => (
          <strong className="font-semibold">
            {processChildren(children)}
          </strong>
        ),
        em: ({ children }) => (
          <em>{processChildren(children)}</em>
        ),
        li: ({ children }) => (
          <li className="mb-1">
            {processChildren(children)}
          </li>
        ),
        ul: ({ children }) => (
          <ul className="mb-3 list-disc space-y-1 pl-5 last:mb-0">
            {children}
          </ul>
        ),
        ol: ({ children }) => (
          <ol className="mb-3 list-decimal space-y-1 pl-5 last:mb-0">
            {children}
          </ol>
        ),
        h1: ({ children }) => (
          <h3 className="mb-2 mt-4 text-base font-semibold first:mt-0">
            {processChildren(children)}
          </h3>
        ),
        h2: ({ children }) => (
          <h4 className="mb-2 mt-3 text-sm font-semibold first:mt-0">
            {processChildren(children)}
          </h4>
        ),
        h3: ({ children }) => (
          <h5 className="mb-1.5 mt-3 text-sm font-semibold first:mt-0">
            {processChildren(children)}
          </h5>
        ),
        blockquote: ({ children }) => (
          <blockquote className="mb-3 border-l-2 border-primary/30 pl-3 italic text-muted-foreground last:mb-0">
            {children}
          </blockquote>
        ),
        code: ({ children, className }) => {
          const isBlock = className?.includes("language-");
          if (isBlock) {
            return (
              <code className="block overflow-x-auto rounded-lg bg-muted p-3 text-xs">
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
        pre: ({ children }) => (
          <pre className="mb-3 last:mb-0">{children}</pre>
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
        hr: () => <hr className="my-4 border-border" />,
      }}
    >
      {text}
    </Markdown>
  );
}

export function ChatMessage({
  role,
  content,
  citations = [],
  isStreaming,
}: ChatMessageProps) {
  if (role === "user") {
    return (
      <div className="flex justify-end">
        <div className="max-w-[75%] rounded-2xl rounded-br-sm bg-primary px-4 py-2.5 text-sm text-primary-foreground">
          {content}
        </div>
      </div>
    );
  }

  // Split out <document> embeds first, then render text as markdown
  const segments = splitDocumentEmbeds(content, citations);

  return (
    <div>
      <div className="text-sm leading-relaxed">
        {segments.map((segment, i) =>
          segment.kind === "text" ? (
            <MarkdownSegment
              key={`md-${i}`}
              text={segment.value}
              citations={citations}
            />
          ) : (
            segment.node
          )
        )}
        {isStreaming && (
          <span className="ml-0.5 inline-block h-4 w-1 animate-pulse bg-primary/60" />
        )}
      </div>
    </div>
  );
}
