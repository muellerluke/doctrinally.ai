"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { SendHorizonal, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { SermonChatMessage, type SermonMessageFence } from "./sermon-chat-message";
import { SermonBudgetIndicator } from "./sermon-budget-indicator";
import type { Citation } from "@/lib/types/citations";
import { findClosedEditFences } from "@/lib/sermons/diff-parser";

export interface SermonChatUiMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  citations?: Citation[];
  fences?: Record<number, SermonMessageFence>;
}

interface SermonChatPanelProps {
  documentId: string;
  sermonTitle: string;
  initialMessages: SermonChatUiMessage[];
  getSermonMarkdown: () => string;
  onFenceReady: (diff: ReturnType<typeof findClosedEditFences>["fences"][number]["parsed"]) =>
    | { applied: number; skipped: { reason: string }[] }
    | null;
  budgetCents: number;
  initialSpentCents: number;
  onSpendUpdate: (cents: number) => void;
  budgetEnabled: boolean;
}

const CITATION_SENTINEL = "\n__CITATIONS__";
const COST_SENTINEL = "\n__COST__";

let counter = 0;
const nextId = () => `sm_${Date.now()}_${++counter}`;

export function SermonChatPanel({
  documentId,
  sermonTitle,
  initialMessages,
  getSermonMarkdown,
  onFenceReady,
  budgetCents,
  initialSpentCents,
  onSpendUpdate,
  budgetEnabled,
}: SermonChatPanelProps) {
  const [messages, setMessages] = useState<SermonChatUiMessage[]>(initialMessages);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [spent, setSpent] = useState(initialSpentCents);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const bodyRef = useRef<HTMLDivElement | null>(null);

  const exhausted = budgetEnabled && budgetCents > 0 && spent >= budgetCents;

  useEffect(() => {
    if (bodyRef.current) {
      bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
    }
  }, [messages.length]);

  const handleSend = useCallback(
    async (override?: string) => {
      const text = (override ?? input).trim();
      if (!text || isLoading || exhausted) return;
      setError(null);
      setInput("");

      const userMsg: SermonChatUiMessage = {
        id: nextId(),
        role: "user",
        content: text,
      };
      const assistantMsg: SermonChatUiMessage = {
        id: nextId(),
        role: "assistant",
        content: "",
        fences: {},
      };
      setMessages((prev) => [...prev, userMsg, assistantMsg]);
      setIsLoading(true);

      const wireMessages = [...messages, userMsg].map((m) => ({
        role: m.role,
        content: m.content,
      }));

      try {
        abortRef.current = new AbortController();
        const response = await fetch("/api/sermons/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            documentId,
            sermonTitle,
            sermonMarkdown: getSermonMarkdown(),
            messages: wireMessages,
          }),
          signal: abortRef.current.signal,
        });

        if (!response.ok) {
          const contentType = response.headers.get("content-type") ?? "";
          let message = `Chat request failed (${response.status})`;
          if (contentType.includes("application/json")) {
            try {
              const body = await response.json();
              if (body.message) message = body.message;
            } catch {}
          }
          setError(message);
          setMessages((prev) => prev.slice(0, -1));
          return;
        }

        const reader = response.body?.getReader();
        if (!reader) throw new Error("No response body");
        const decoder = new TextDecoder();
        let fullText = "";
        const appliedFenceStarts = new Set<number>();

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          fullText += decoder.decode(value, { stream: true });

          // During streaming, strip sentinels from display text
          let displayText = fullText;
          const citIdx = displayText.indexOf(CITATION_SENTINEL);
          if (citIdx !== -1) displayText = displayText.slice(0, citIdx);
          const costIdx = displayText.indexOf(COST_SENTINEL);
          if (costIdx !== -1) displayText = displayText.slice(0, costIdx);

          // Apply any newly-closed fences to the editor
          const { fences } = findClosedEditFences(displayText);
          const fenceMap: Record<number, SermonMessageFence> = {};
          for (const f of fences) {
            fenceMap[f.start] = {
              start: f.start,
              closed: true,
              diff: f.parsed,
            };
            if (!appliedFenceStarts.has(f.start)) {
              const result = onFenceReady(f.parsed);
              if (result) fenceMap[f.start].applyResult = result;
              appliedFenceStarts.add(f.start);
            }
          }

          setMessages((prev) => {
            const next = [...prev];
            const last = next[next.length - 1];
            if (last?.role === "assistant") {
              next[next.length - 1] = {
                ...last,
                content: displayText,
                fences: { ...(last.fences ?? {}), ...fenceMap },
              };
            }
            return next;
          });
        }

        // Parse trailing sentinels
        let finalText = fullText;
        let citations: Citation[] = [];
        const citIdx = finalText.indexOf(CITATION_SENTINEL);
        if (citIdx !== -1) {
          const afterCit = finalText.slice(citIdx + CITATION_SENTINEL.length);
          const costIdx = afterCit.indexOf(COST_SENTINEL);
          const citJson = costIdx === -1 ? afterCit : afterCit.slice(0, costIdx);
          try {
            citations = JSON.parse(citJson) as Citation[];
          } catch {}
          finalText = finalText.slice(0, citIdx);
        }

        const costIdxFinal = fullText.indexOf(COST_SENTINEL);
        if (costIdxFinal !== -1) {
          const after = fullText.slice(costIdxFinal + COST_SENTINEL.length);
          const cents = parseInt(after.trim(), 10);
          if (!isNaN(cents)) {
            setSpent((prev) => {
              const next = prev + cents;
              onSpendUpdate(next);
              return next;
            });
          }
        }

        setMessages((prev) => {
          const next = [...prev];
          const last = next[next.length - 1];
          if (last?.role === "assistant") {
            next[next.length - 1] = {
              ...last,
              content: finalText,
              citations,
            };
          }
          return next;
        });
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          setError((err as Error).message);
        }
      } finally {
        setIsLoading(false);
        abortRef.current = null;
      }
    },
    [input, isLoading, exhausted, messages, documentId, sermonTitle, getSermonMarkdown, onFenceReady, onSpendUpdate]
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex shrink-0 items-center justify-between border-b border-border px-4 py-3">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <Sparkles className="h-4 w-4 text-primary" />
          Sermon assistant
        </div>
        {budgetEnabled && (
          <SermonBudgetIndicator
            budgetCents={budgetCents}
            spentCents={spent}
          />
        )}
      </div>

      <div ref={bodyRef} className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4">
        {messages.length === 0 && (
          <div className="rounded-lg border border-dashed border-border bg-muted/30 px-4 py-6 text-center text-sm text-muted-foreground">
            Ask the assistant to draft an outline, tighten a section, or find a supporting passage.
            It will edit the sermon on the right as you chat.
          </div>
        )}
        {messages.map((msg) => (
          <SermonChatMessage
            key={msg.id}
            role={msg.role}
            content={msg.content}
            citations={msg.citations ?? []}
            isStreaming={isLoading && msg === messages[messages.length - 1]}
            fences={msg.fences}
          />
        ))}
        {error && (
          <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
            {error}
          </div>
        )}
      </div>

      <div className="shrink-0 border-t border-border p-3">
        <div className="flex items-end gap-2">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder={
              exhausted
                ? "Sermon budget reached — resets next period."
                : "Try: \u201CDraft a sermon on Romans 8\u201D, \u201CTighten the opening\u201D, \u201CCheck for doctrinal alignment\u201D"
            }
            disabled={exhausted || isLoading}
            rows={3}
            className="resize-none text-sm"
          />
          <Button
            size="icon"
            onClick={() => handleSend()}
            disabled={!input.trim() || isLoading || exhausted}
            aria-label="Send"
          >
            <SendHorizonal className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
