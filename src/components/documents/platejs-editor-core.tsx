"use client";

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
} from "react";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { Plate, PlateContent, createPlateEditor } from "platejs/react";
import type { PlateEditor } from "platejs/react";
import { cn } from "@/lib/utils";
import { editorPlugins } from "./platejs-plugins";

export interface PlatejsEditorCoreHandle {
  /** Current Plate node array (use for serialization) */
  getChildren: () => unknown[];
  /** Replace the entire document, recording a single undo checkpoint */
  setContent: (nodes: unknown[]) => void;
  /** Undo the most recent transaction */
  undo: () => void;
  /** Raw editor reference for advanced callers */
  editor: PlateEditor;
}

interface PlatejsEditorCoreProps {
  initialContent: string;
  placeholder?: string;
  onChange?: (value: unknown[]) => void;
  className?: string;
}

/**
 * Headless editor core — no toolbar, no save/publish chrome. Wrapper components
 * (`PlatejsEditor`, `SermonEditor`) add their own header bars around this.
 *
 * The core exposes an imperative handle so outer components can dispatch
 * programmatic edits (like the sermon-writer's diff applier) without
 * reaching into Plate internals.
 */
export const PlatejsEditorCore = forwardRef<
  PlatejsEditorCoreHandle,
  PlatejsEditorCoreProps
>(function PlatejsEditorCore(
  { initialContent, placeholder, onChange, className },
  ref
) {
  const editor = useMemo(() => {
    const e = createPlateEditor({ plugins: editorPlugins });

    if (initialContent.trim()) {
      try {
        const parsed = JSON.parse(initialContent);
        if (Array.isArray(parsed) && parsed.length > 0) {
          e.tf.setValue(parsed);
        }
      } catch {
        try {
          const value = e.api.markdown.deserialize(initialContent);
          if (value && value.length > 0) {
            e.tf.setValue(value);
          }
        } catch {
          e.tf.setValue([
            { type: "p", children: [{ text: initialContent }] },
          ]);
        }
      }
    }

    return e;
  }, [initialContent]);

  // Latest onChange in a ref so the `handleChange` closure is stable but
  // always calls the freshest callback.
  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useImperativeHandle(
    ref,
    () => ({
      getChildren: () => editor.children,
      setContent: (nodes) => {
        editor.tf.withoutNormalizing(() => {
          editor.tf.setValue(nodes as never[]);
        });
      },
      undo: () => {
        editor.undo();
      },
      editor,
    }),
    [editor]
  );

  return (
    <DndProvider backend={HTML5Backend}>
      <Plate
        editor={editor}
        onChange={({ value }) => onChangeRef.current?.(value)}
      >
        <PlateContent
          className={cn(
            "min-h-[400px] outline-none",
            "[&_h1]:mb-4 [&_h1]:mt-8 [&_h1]:font-heading [&_h1]:text-3xl [&_h1]:font-bold [&_h1]:tracking-tight",
            "[&_h2]:mb-3 [&_h2]:mt-6 [&_h2]:font-heading [&_h2]:text-2xl [&_h2]:font-semibold [&_h2]:tracking-tight",
            "[&_h3]:mb-2 [&_h3]:mt-5 [&_h3]:font-heading [&_h3]:text-xl [&_h3]:font-semibold",
            "[&_p]:mb-3 [&_p]:leading-7 [&_p]:text-foreground",
            "[&_strong]:font-bold",
            "[&_em]:italic",
            "[&_blockquote]:border-l-4 [&_blockquote]:border-muted-foreground/30 [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:text-muted-foreground",
            "[&_[data-slate-node='element'][style*='list-style-type']]:ml-6 [&_[data-slate-node='element'][style*='list-style-type']]:list-item",
            "[&_[data-slate-type='callout']]:my-4 [&_[data-slate-type='callout']]:rounded-lg [&_[data-slate-type='callout']]:border [&_[data-slate-type='callout']]:border-border [&_[data-slate-type='callout']]:bg-muted/50 [&_[data-slate-type='callout']]:px-4 [&_[data-slate-type='callout']]:py-3",
            "[&_.slate-placeholder]:text-muted-foreground/50 [&_.slate-placeholder]:italic",
            className
          )}
          placeholder={placeholder ?? "Start writing..."}
        />
      </Plate>
    </DndProvider>
  );
});
