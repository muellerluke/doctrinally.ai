"use client";

import { useState, useEffect, useRef } from "react";
import { MessageSquare, ArrowUp, Video } from "lucide-react";

const TYPING_SPEED = 30;
const RESPONSE_DELAY = 800;

const USER_QUESTION = "What does the Bible say about dealing with anxiety?";

const AI_RESPONSE_PARTS = [
  {
    type: "text" as const,
    content:
      "The Bible offers deep comfort for those struggling with anxiety. In **Philippians 4:6-7**, Paul writes:\n\n> *\"Be anxious for nothing, but in everything by prayer and supplication with thanksgiving let your requests be made known to God. And the peace of God, which surpasses all understanding, will guard your hearts and your minds in Christ Jesus.\"*\n\nThis passage reminds us that prayer is the antidote to worry — not because our circumstances change, but because God's peace guards us.\n\nPastor also addressed this topic in a recent sermon:",
  },
  {
    type: "embed" as const,
  },
  {
    type: "text" as const,
    content:
      "In **1 Peter 5:7**, we're told to cast all our anxieties on Him, because He cares for us. Anxiety isn't a sign of weak faith — it's an invitation to lean deeper into God's presence.",
  },
];

function TypingCursor() {
  return <span className="ml-0.5 inline-block h-3.5 w-0.5 animate-pulse bg-amber-800/60" />;
}

function YouTubeEmbed() {
  return (
    <div className="my-2.5 max-w-[320px] overflow-hidden rounded-lg border shadow-sm">
      <div className="aspect-video bg-black">
        <iframe
          src="https://www.youtube.com/embed/KqffYkjPzAA?autoplay=0"
          className="h-full w-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          title="Sermon on Anxiety"
          loading="lazy"
        />
      </div>
      <div className="flex items-center gap-2 border-t bg-white px-2.5 py-1.5 dark:bg-card">
        <Video className="h-3 w-3 shrink-0 text-muted-foreground" />
        <span className="truncate text-[10px] font-medium">
          Sunday Sermon — Overcoming Anxiety
        </span>
      </div>
    </div>
  );
}

function FormatText({ text }: { text: string }) {
  // Simple markdown-ish rendering for bold, italic, blockquote
  const lines = text.split("\n");
  return (
    <>
      {lines.map((line, i) => {
        if (line.startsWith("> ")) {
          const inner = line.slice(2);
          return (
            <blockquote
              key={i}
              className="my-1.5 border-l-2 border-amber-700/20 pl-2.5 text-[11px] italic text-amber-800/70 dark:text-amber-200/60"
            >
              <FormatInline text={inner} />
            </blockquote>
          );
        }
        if (line === "") return <br key={i} />;
        return (
          <span key={i}>
            <FormatInline text={line} />
            {i < lines.length - 1 && line !== "" && <br />}
          </span>
        );
      })}
    </>
  );
}

function FormatInline({ text }: { text: string }) {
  // Handle **bold** and *italic*
  const parts: React.ReactNode[] = [];
  let remaining = text;
  let key = 0;

  while (remaining.length > 0) {
    const boldMatch = remaining.match(/\*\*(.+?)\*\*/);
    const italicMatch = remaining.match(/\*(.+?)\*/);

    const match = boldMatch && (!italicMatch || (boldMatch.index ?? 0) <= (italicMatch.index ?? 0))
      ? boldMatch
      : italicMatch;

    if (!match || match.index === undefined) {
      parts.push(remaining);
      break;
    }

    if (match.index > 0) {
      parts.push(remaining.slice(0, match.index));
    }

    const isBold = match[0].startsWith("**");
    parts.push(
      isBold ? (
        <strong key={key++} className="font-semibold">
          {match[1]}
        </strong>
      ) : (
        <em key={key++}>{match[1]}</em>
      )
    );

    remaining = remaining.slice(match.index + match[0].length);
  }

  return <>{parts}</>;
}

export function HeroChatPreview() {
  const [mounted, setMounted] = useState(false);
  const [questionVisible, setQuestionVisible] = useState(0);
  const [showResponse, setShowResponse] = useState(false);
  const [responseVisible, setResponseVisible] = useState(0);
  const [showEmbed, setShowEmbed] = useState(false);
  const [showAfterEmbed, setShowAfterEmbed] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Defer animation start to after hydration
  useEffect(() => {
    const timer = setTimeout(() => setMounted(true), 500);
    return () => clearTimeout(timer);
  }, []);

  // Auto-scroll the messages container to bottom as content streams
  useEffect(() => {
    const container = scrollRef.current;
    if (container) {
      container.scrollTop = container.scrollHeight;
    }
  }, [questionVisible, responseVisible, showEmbed, showAfterEmbed]);

  // Type out the question (only after mount to avoid hydration mismatch)
  useEffect(() => {
    if (!mounted) return;
    if (questionVisible < USER_QUESTION.length) {
      const timer = setTimeout(
        () => setQuestionVisible((v) => v + 1),
        TYPING_SPEED
      );
      return () => clearTimeout(timer);
    }
    // After question is done, show response
    const timer = setTimeout(() => setShowResponse(true), RESPONSE_DELAY);
    return () => clearTimeout(timer);
  }, [mounted, questionVisible]);

  // Type out the response
  useEffect(() => {
    if (!showResponse) return;
    const fullText = AI_RESPONSE_PARTS[0].type === "text" ? AI_RESPONSE_PARTS[0].content : "";
    if (responseVisible < fullText.length) {
      const timer = setTimeout(
        () => setResponseVisible((v) => v + 2), // 2 chars at a time for speed
        TYPING_SPEED / 2
      );
      return () => clearTimeout(timer);
    }
    // After first text part, show embed
    const timer = setTimeout(() => setShowEmbed(true), 400);
    return () => clearTimeout(timer);
  }, [showResponse, responseVisible]);

  // After embed, show remaining text
  useEffect(() => {
    if (!showEmbed) return;
    const timer = setTimeout(() => setShowAfterEmbed(true), 600);
    return () => clearTimeout(timer);
  }, [showEmbed]);

  const firstTextContent = AI_RESPONSE_PARTS[0].type === "text" ? AI_RESPONSE_PARTS[0].content : "";
  const lastTextContent = AI_RESPONSE_PARTS[2].type === "text" ? AI_RESPONSE_PARTS[2].content : "";
  const visibleFirstText = firstTextContent.slice(0, responseVisible);

  return (
    <div className="mx-auto w-full max-w-lg overflow-hidden rounded-2xl border bg-white text-left shadow-2xl shadow-primary/[0.08] dark:bg-card">
      {/* Header */}
      <div className="flex items-center gap-2.5 border-b px-4 py-2.5">
        <img
          src="/logo-light-mode.png"
          alt=""
          className="h-6 w-6 rounded dark:hidden"
        />
        <img
          src="/logo-dark-mode.png"
          alt=""
          className="hidden h-6 w-6 rounded dark:block"
        />
        <span className="text-xs font-semibold text-foreground">
          Grace Community Church
        </span>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex h-[380px] flex-col gap-3 overflow-y-auto px-4 py-4">
        {/* User message */}
        {questionVisible > 0 && (
          <div className="flex justify-end">
            <div className="max-w-[80%] rounded-2xl rounded-br-sm bg-[#4A2C2A] px-3.5 py-2 text-xs text-[#F7F4F0]">
              {USER_QUESTION.slice(0, questionVisible)}
              {questionVisible < USER_QUESTION.length && <TypingCursor />}
            </div>
          </div>
        )}

        {/* AI response */}
        {showResponse && (
          <div className="text-left">
            <div className="text-left text-xs leading-relaxed text-foreground/80">
              <FormatText text={visibleFirstText} />
              {responseVisible < firstTextContent.length && <TypingCursor />}
            </div>

            {showEmbed && (
              <div className="animate-fade-up">
                <YouTubeEmbed />
              </div>
            )}

            {showAfterEmbed && (
              <div className="animate-fade-up text-left text-xs leading-relaxed text-foreground/80">
                <FormatText text={lastTextContent} />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Input bar */}
      <div className="border-t px-4 py-2.5">
        <div className="flex items-center gap-2 rounded-xl border bg-muted/30 px-3 py-2">
          <span className="flex-1 text-[11px] text-muted-foreground/50">
            What would you like to know?
          </span>
          <div className="flex h-5 w-5 items-center justify-center rounded-md bg-[#4A2C2A]">
            <ArrowUp className="h-3 w-3 text-[#F7F4F0]" />
          </div>
        </div>
      </div>
    </div>
  );
}
