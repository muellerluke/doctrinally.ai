"use client";

import {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { Check, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  PlatejsEditorCore,
  type PlatejsEditorCoreHandle,
} from "@/components/documents/platejs-editor-core";
import { plateToSermonMarkdown } from "@/lib/sermons/markdown-serializer";
import { sermonMarkdownToPlate } from "@/lib/sermons/markdown-deserializer";
import { saveSermon } from "@/lib/actions/sermons";

export interface SermonEditorHandle {
  /** Current sermon serialized to markdown (for the chat prompt + export) */
  getMarkdown: () => string;
  /** Replace the document from new markdown (used after applying AI diffs) */
  setFromMarkdown: (markdown: string) => void;
  /** Undo the most recent transaction */
  undo: () => void;
}

interface SermonEditorProps {
  documentId: string;
  initialContent: string;
  onContentChange?: () => void;
}

type SaveStatus = "saved" | "saving" | "unsaved";

export const SermonEditor = forwardRef<SermonEditorHandle, SermonEditorProps>(
  function SermonEditor({ documentId, initialContent, onContentChange }, ref) {
    const coreRef = useRef<PlatejsEditorCoreHandle | null>(null);
    const [saveStatus, setSaveStatus] = useState<SaveStatus>("saved");
    const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const handleChange = useCallback(
      (value: unknown[]) => {
        onContentChange?.();
        setSaveStatus("unsaved");
        if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
        saveTimerRef.current = setTimeout(async () => {
          setSaveStatus("saving");
          try {
            const serialized = JSON.stringify(value);
            const result = await saveSermon(documentId, serialized);
            if (result?.error) {
              setSaveStatus("unsaved");
            } else {
              setSaveStatus("saved");
            }
          } catch {
            setSaveStatus("unsaved");
          }
        }, 1500);
      },
      [documentId, onContentChange]
    );

    useImperativeHandle(ref, () => ({
      getMarkdown: () => {
        const children = coreRef.current?.getChildren() ?? [];
        return plateToSermonMarkdown(children as never);
      },
      setFromMarkdown: (markdown: string) => {
        const nodes = sermonMarkdownToPlate(markdown);
        coreRef.current?.setContent(nodes);
      },
      undo: () => {
        coreRef.current?.undo();
      },
    }));

    return (
      <div className="flex min-h-0 flex-1 flex-col">
        <div className="flex shrink-0 items-center justify-end border-b border-border bg-background/95 px-4 py-2 backdrop-blur">
          <SaveIndicator status={saveStatus} />
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">
          <div className="mx-auto max-w-3xl px-6 py-8">
            <p className="mb-2 text-xs text-muted-foreground">
              Type{" "}
              <kbd className="rounded border border-border bg-muted px-1 py-0.5 font-mono text-[10px]">
                /
              </kbd>{" "}
              for commands
            </p>
            <PlatejsEditorCore
              ref={coreRef}
              initialContent={initialContent}
              placeholder="Start your sermon here, or ask the assistant to draft one for you."
              onChange={handleChange}
            />
          </div>
        </div>
      </div>
    );
  }
);

function SaveIndicator({ status }: { status: SaveStatus }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 text-xs font-medium",
        status === "saved" && "text-emerald-600 dark:text-emerald-400",
        status === "saving" && "text-amber-600 dark:text-amber-400",
        status === "unsaved" && "text-muted-foreground"
      )}
    >
      {status === "saved" && (
        <>
          <Check className="h-3.5 w-3.5" />
          Saved
        </>
      )}
      {status === "saving" && (
        <>
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          Saving…
        </>
      )}
      {status === "unsaved" && <>Unsaved changes</>}
    </span>
  );
}
