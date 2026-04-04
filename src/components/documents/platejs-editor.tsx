"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import {
  Plate,
  PlateContent,
  createPlateEditor,
} from "platejs/react";
import {
  ArrowLeft,
  Check,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  savePlatejsDocument,
  publishPlatejsDocument,
} from "@/lib/actions/documents";
import { editorPlugins } from "./platejs-plugins";

// ---- Save status indicator ----

type SaveStatus = "saved" | "saving" | "unsaved";

function SaveIndicator({ status }: { status: SaveStatus }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 text-xs font-medium transition-colors",
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
          Saving...
        </>
      )}
      {status === "unsaved" && <>Unsaved changes</>}
    </span>
  );
}

// ---- Main editor component ----

interface PlatejsEditorProps {
  documentId: string;
  initialContent: string;
  title: string;
}

export function PlatejsEditor({
  documentId,
  initialContent,
  title,
}: PlatejsEditorProps) {
  const router = useRouter();
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("saved");
  const [publishing, setPublishing] = useState(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const editor = useMemo(() => {
    const e = createPlateEditor({
      plugins: editorPlugins,
    });

    if (initialContent.trim()) {
      try {
        // Try JSON first (preserves custom elements like Bible passages)
        const parsed = JSON.parse(initialContent);
        if (Array.isArray(parsed) && parsed.length > 0) {
          e.tf.setValue(parsed);
        }
      } catch {
        // Fallback: treat as markdown (legacy content)
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

  const handleChange = useCallback(
    ({ value }: { value: any[] }) => {
      setSaveStatus("unsaved");

      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }

      saveTimerRef.current = setTimeout(async () => {
        setSaveStatus("saving");
        try {
          const serialized = JSON.stringify(value);
          const result = await savePlatejsDocument(documentId, serialized);
          if (result?.error) {
            console.error("Save failed:", result.error);
            setSaveStatus("unsaved");
          } else {
            setSaveStatus("saved");
          }
        } catch (err) {
          console.error("Save failed:", err);
          setSaveStatus("unsaved");
        }
      }, 2000);
    },
    [documentId, editor]
  );

  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, []);

  const handlePublish = async () => {
    setPublishing(true);
    try {
      const serialized = JSON.stringify(editor.children);
      await savePlatejsDocument(documentId, serialized);

      const result = await publishPlatejsDocument(documentId);
      if (result?.error) {
        console.error("Publish failed:", result.error);
      } else {
        setSaveStatus("saved");
        router.push("/documents");
      }
    } catch (err) {
      console.error("Publish failed:", err);
    } finally {
      setPublishing(false);
    }
  };

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="flex h-full flex-col">
        {/* Sticky header bar */}
        <div className="sticky top-0 z-40 flex items-center justify-between border-b border-border bg-background/95 px-4 py-3 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push("/documents")}
              className="gap-1.5"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
            <div className="h-5 w-px bg-border" />
            <h1 className="font-heading text-lg font-semibold tracking-tight truncate max-w-[300px]">
              {title}
            </h1>
          </div>
          <div className="flex items-center gap-4">
            <SaveIndicator status={saveStatus} />
            <Button
              onClick={handlePublish}
              disabled={publishing}
              size="sm"
              className="min-w-[90px]"
            >
              {publishing ? (
                <>
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                  Publishing
                </>
              ) : (
                "Publish"
              )}
            </Button>
          </div>
        </div>

        {/* Editor area */}
        <div className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-3xl px-6 py-10">
            <p className="mb-2 text-xs text-muted-foreground">
              Type{" "}
              <kbd className="rounded border border-border bg-muted px-1 py-0.5 font-mono text-[10px]">
                /
              </kbd>{" "}
              for commands
            </p>

            <Plate editor={editor} onChange={handleChange}>
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
                  "[&_.slate-placeholder]:text-muted-foreground/50 [&_.slate-placeholder]:italic"
                )}
                placeholder="Start writing your document..."
              />
            </Plate>
          </div>
        </div>
      </div>
    </DndProvider>
  );
}
