"use client";

import * as React from "react";
import { upload } from "@vercel/blob/client";
import { FileUp, Loader2, Upload, X } from "lucide-react";
import { toast } from "sonner";

import type { UploadItem } from "@/components/documents/upload-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const ACCEPTED_TYPES =
  ".pdf,.docx,video/mp4,video/webm,video/quicktime,video/*";

const ACCEPT_MAP: Record<string, string> = {
  "application/pdf": "pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
    "word",
};

function resolveFileType(file: File): "pdf" | "word" | "video" {
  if (ACCEPT_MAP[file.type]) return ACCEPT_MAP[file.type] as "pdf" | "word";
  if (file.type.startsWith("video/")) return "video";
  if (file.name.endsWith(".pdf")) return "pdf";
  if (file.name.endsWith(".docx")) return "word";
  return "video";
}

function filenameWithoutExtension(name: string) {
  const dotIndex = name.lastIndexOf(".");
  return dotIndex > 0 ? name.substring(0, dotIndex) : name;
}

function formatSize(bytes: number) {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / 1024).toFixed(0)} KB`;
}

interface FileEntry {
  file: File;
  title: string;
}

interface FileUploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  churchId: string;
  folderId?: string | null;
  onUploadStart?: (upload: UploadItem) => void;
  onUploadProgress?: (id: string, progress: number) => void;
  onUploadComplete?: (id: string) => void;
  onUploadError?: (id: string, error: string) => void;
}

export function FileUploadDialog({
  open,
  onOpenChange,
  churchId,
  folderId,
  onUploadStart,
  onUploadProgress,
  onUploadComplete,
  onUploadError,
}: FileUploadDialogProps) {
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const [entries, setEntries] = React.useState<FileEntry[]>([]);
  const [dragOver, setDragOver] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [tags, setTags] = React.useState("");

  function resetForm() {
    setEntries([]);
    setTags("");
    setDragOver(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function addFiles(fileList: FileList) {
    const newEntries: FileEntry[] = Array.from(fileList).map((f) => ({
      file: f,
      title: filenameWithoutExtension(f.name),
    }));
    setEntries((prev) => [...prev, ...newEntries]);
  }

  function removeEntry(index: number) {
    setEntries((prev) => prev.filter((_, i) => i !== index));
  }

  function updateTitle(index: number, title: string) {
    setEntries((prev) =>
      prev.map((entry, i) => (i === index ? { ...entry, title } : entry))
    );
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files.length > 0) {
      addFiles(e.dataTransfer.files);
    }
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(true);
  }

  function handleDragLeave(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files && e.target.files.length > 0) {
      addFiles(e.target.files);
    }
    // Reset input so the same file(s) can be selected again
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (entries.length === 0) return;

    setLoading(true);

    const tagList = tags
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    // Snapshot the entries and close immediately so user can keep working
    const batch = [...entries];
    resetForm();
    onOpenChange(false);

    // Fire all uploads concurrently
    for (const entry of batch) {
      const uploadId = crypto.randomUUID();
      const fileType = resolveFileType(entry.file);

      onUploadStart?.({
        id: uploadId,
        filename: entry.file.name,
        progress: 0,
        status: "uploading",
      });

      // Don't await — let uploads run in parallel
      upload(`documents/${churchId}/${entry.file.name}`, entry.file, {
        access: "public",
        handleUploadUrl: "/api/documents/upload",
        multipart: true,
        clientPayload: JSON.stringify({
          title: entry.title,
          tags: tagList.join(","),
          folderId: folderId ?? null,
          fileType: entry.file.type,
          fileSize: entry.file.size,
        }),
        onUploadProgress: (event) => {
          onUploadProgress?.(uploadId, Math.round(event.percentage));
        },
      })
        .then(() => {
          onUploadComplete?.(uploadId);
          window.plausible?.("Document Upload", { props: { type: "file" } });
          toast.success(`Uploaded: ${entry.file.name}`);
        })
        .catch((err) => {
          const errorMsg =
            err instanceof Error ? err.message : "Upload failed";
          onUploadError?.(uploadId, errorMsg);
          toast.error(`${entry.file.name}: ${errorMsg}`);
        });
    }

    setLoading(false);
  }

  const hasFiles = entries.length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileUp className="size-5 text-amber-600" />
            Upload {entries.length > 1 ? `${entries.length} Files` : "Files"}
          </DialogTitle>
          <DialogDescription>
            Upload PDFs, Word documents, or video files. Content will be
            processed and indexed for AI retrieval.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="grid gap-4">
          {/* Drop zone */}
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={() => fileInputRef.current?.click()}
            className={`
              flex cursor-pointer flex-col items-center justify-center gap-2
              rounded-lg border-2 border-dashed px-4 py-8
              text-center transition-colors
              ${
                dragOver
                  ? "border-primary bg-primary/5"
                  : hasFiles
                    ? "border-green-500/50 bg-green-500/5 py-4"
                    : "border-muted-foreground/25 hover:border-muted-foreground/50"
              }
            `}
          >
            <Upload
              className={`size-8 ${
                hasFiles
                  ? "size-5 text-green-600"
                  : dragOver
                    ? "text-primary"
                    : "text-muted-foreground/50"
              }`}
            />
            {hasFiles ? (
              <p className="text-xs text-muted-foreground">
                Click or drop to add more files
              </p>
            ) : (
              <div>
                <p className="text-sm font-medium">
                  Drop your files here, or{" "}
                  <span className="text-primary underline underline-offset-2">
                    browse files
                  </span>
                </p>
                <p className="text-xs text-muted-foreground">
                  PDF or DOCX up to 50 MB &middot; video up to 2 GB
                </p>
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept={ACCEPTED_TYPES}
              onChange={handleInputChange}
              className="hidden"
              multiple
            />
          </div>

          {/* File list with per-file titles */}
          {hasFiles && (
            <div className="max-h-[240px] space-y-3 overflow-y-auto">
              {entries.map((entry, i) => (
                <div
                  key={`${entry.file.name}-${i}`}
                  className="flex items-start gap-2 rounded-lg border bg-muted/30 p-3"
                >
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <Input
                      value={entry.title}
                      onChange={(e) => updateTitle(i, e.target.value)}
                      placeholder="Document title"
                      required
                      disabled={loading}
                      className="h-8 text-sm"
                    />
                    <p className="truncate text-[11px] text-muted-foreground">
                      {entry.file.name} &middot; {formatSize(entry.file.size)}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeEntry(i);
                    }}
                    className="mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Shared tags */}
          {hasFiles && (
            <div className="grid gap-2">
              <Label htmlFor="file-tags">
                Tags{" "}
                {entries.length > 1 && (
                  <span className="text-xs font-normal text-muted-foreground">
                    (applied to all files)
                  </span>
                )}
              </Label>
              <Input
                id="file-tags"
                placeholder="sermon, faith, grace (comma-separated)"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                disabled={loading}
              />
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                resetForm();
                onOpenChange(false);
              }}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading || !hasFiles}>
              {loading && <Loader2 className="animate-spin" />}
              Upload{entries.length > 1 ? ` ${entries.length} files` : ""}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
