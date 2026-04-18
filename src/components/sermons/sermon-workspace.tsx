"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, GripVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { SermonEditor, type SermonEditorHandle } from "./sermon-editor";
import { SermonChatPanel, type SermonChatUiMessage } from "./sermon-chat-panel";
import { AppliedEditsBar } from "./applied-edits-bar";
import { SermonExportMenu } from "./sermon-export-menu";
import { applyDiff } from "@/lib/sermons/diff-applier";
import { renameSermon } from "@/lib/actions/sermons";

const CHAT_PCT_KEY = "sermon-workspace-chat-pct";
const MIN_CHAT_PCT = 25;
const MAX_CHAT_PCT = 70;

interface SermonWorkspaceProps {
  documentId: string;
  initialTitle: string;
  initialContent: string;
  initialMessages: SermonChatUiMessage[];
  budget: {
    enabled: boolean;
    budgetCents: number;
    spentCents: number;
  };
}

export function SermonWorkspace({
  documentId,
  initialTitle,
  initialContent,
  initialMessages,
  budget,
}: SermonWorkspaceProps) {
  const router = useRouter();
  const editorRef = useRef<SermonEditorHandle | null>(null);
  const [title, setTitle] = useState(initialTitle);
  const [lastAppliedCount, setLastAppliedCount] = useState(0);

  // Split-pane width in %. Default 40% chat / 60% editor; loaded from
  // localStorage after mount so SSR is stable.
  const splitRef = useRef<HTMLDivElement | null>(null);
  const [chatPct, setChatPct] = useState(40);
  const [dragging, setDragging] = useState(false);
  const draggingRef = useRef(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(CHAT_PCT_KEY);
      if (!raw) return;
      const saved = parseFloat(raw);
      if (Number.isFinite(saved) && saved >= MIN_CHAT_PCT && saved <= MAX_CHAT_PCT) {
        setChatPct(saved);
      }
    } catch {
      // localStorage may be unavailable (private mode, SSR) — keep the default.
    }
  }, []);

  const handleDividerPointerDown = useCallback((e: React.PointerEvent) => {
    draggingRef.current = true;
    setDragging(true);
    e.preventDefault();
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
  }, []);

  useEffect(() => {
    function onMove(e: PointerEvent) {
      if (!draggingRef.current || !splitRef.current) return;
      const rect = splitRef.current.getBoundingClientRect();
      if (rect.width <= 0) return;
      const pct = ((e.clientX - rect.left) / rect.width) * 100;
      const clamped = Math.max(MIN_CHAT_PCT, Math.min(MAX_CHAT_PCT, pct));
      setChatPct(clamped);
    }
    function onUp() {
      if (!draggingRef.current) return;
      draggingRef.current = false;
      setDragging(false);
      try {
        window.localStorage.setItem(CHAT_PCT_KEY, String(chatPct));
      } catch {
        // ignore quota / privacy-mode errors
      }
    }
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
  }, [chatPct]);

  const getSermonMarkdown = useCallback(() => {
    return editorRef.current?.getMarkdown() ?? "";
  }, []);

  const handleFenceReady = useCallback<
    NonNullable<
      React.ComponentProps<typeof SermonChatPanel>["onFenceReady"]
    >
  >((diff) => {
    const current = editorRef.current?.getMarkdown() ?? "";
    const result = applyDiff(current, diff);
    if (result.applied > 0) {
      editorRef.current?.setFromMarkdown(result.markdown);
      setLastAppliedCount(result.applied);
    }
    return {
      applied: result.applied,
      skipped: result.skipped.map((s) => ({ reason: s.reason })),
    };
  }, []);

  async function handleTitleBlur() {
    const trimmed = title.trim();
    if (trimmed === initialTitle || !trimmed) return;
    // Rename only — does NOT touch the editor content column. The editor's own
    // debounced auto-save is the only writer to `documents.content`.
    await renameSermon(documentId, trimmed);
    router.refresh();
  }

  function handleUndoAi() {
    editorRef.current?.undo();
    setLastAppliedCount(0);
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-border bg-background">
      <header className="flex shrink-0 items-center gap-3 border-b border-border bg-background/95 px-4 py-2.5 backdrop-blur">
        <Button
          variant="ghost"
          size="sm"
          render={<Link href="/sermons" />}
          className="gap-1.5"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
        <div className="h-5 w-px bg-border" />
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={handleTitleBlur}
          className="h-8 max-w-xs border-none bg-transparent font-heading text-base font-semibold shadow-none focus-visible:ring-0"
          placeholder="Sermon title"
        />
        <div className="flex-1" />
        <SermonExportMenu documentId={documentId} title={title} />
      </header>

      <div
        ref={splitRef}
        className={cn(
          "flex min-h-0 flex-1",
          dragging && "select-none [&_*]:!cursor-col-resize"
        )}
      >
        <div
          className="flex min-h-0 min-w-[320px] flex-col"
          style={{ width: `${chatPct}%` }}
        >
          <SermonChatPanel
            documentId={documentId}
            sermonTitle={title}
            initialMessages={initialMessages}
            getSermonMarkdown={getSermonMarkdown}
            onFenceReady={handleFenceReady}
            budgetCents={budget.budgetCents}
            initialSpentCents={budget.spentCents}
            onSpendUpdate={() => {}}
            budgetEnabled={budget.enabled}
          />
        </div>
        <div
          role="separator"
          aria-orientation="vertical"
          aria-label="Resize chat panel"
          tabIndex={0}
          onPointerDown={handleDividerPointerDown}
          onKeyDown={(e) => {
            if (e.key === "ArrowLeft") {
              setChatPct((p) => Math.max(MIN_CHAT_PCT, p - 2));
            } else if (e.key === "ArrowRight") {
              setChatPct((p) => Math.min(MAX_CHAT_PCT, p + 2));
            }
          }}
          className={cn(
            "group relative flex w-1 shrink-0 cursor-col-resize items-center justify-center bg-border transition-colors hover:bg-primary/50",
            dragging && "bg-primary/60"
          )}
        >
          <span className="pointer-events-none absolute flex h-8 w-3 items-center justify-center rounded-sm bg-transparent opacity-0 transition-opacity group-hover:opacity-100">
            <GripVertical className="h-3 w-3 text-muted-foreground" />
          </span>
        </div>
        <div className="relative flex min-h-0 min-w-[320px] flex-1 flex-col">
          <SermonEditor
            ref={editorRef}
            documentId={documentId}
            initialContent={initialContent}
            onContentChange={() => {
              // The user typed in the editor — drop any floating AI undo chip
              // so it doesn't masquerade as their change.
              if (lastAppliedCount > 0) setLastAppliedCount(0);
            }}
          />
          {lastAppliedCount > 0 && (
            <div className="pointer-events-none absolute bottom-4 left-1/2 z-30 -translate-x-1/2">
              <AppliedEditsBar
                count={lastAppliedCount}
                onUndo={handleUndoAi}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
