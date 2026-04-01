"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { FileUp, Loader2, Upload } from "lucide-react";
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
  const router = useRouter();
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const [file, setFile] = React.useState<File | null>(null);
  const [dragOver, setDragOver] = React.useState(false);
  const [loading, setLoading] = React.useState(false);

  const [title, setTitle] = React.useState("");
  const [tags, setTags] = React.useState("");

  function resetForm() {
    setFile(null);
    setTitle("");
    setTags("");
    setDragOver(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function handleFileSelect(selectedFile: File) {
    setFile(selectedFile);
    if (!title) {
      setTitle(filenameWithoutExtension(selectedFile.name));
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) handleFileSelect(droppedFile);
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
    const selectedFile = e.target.files?.[0];
    if (selectedFile) handleFileSelect(selectedFile);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return;

    setLoading(true);

    const uploadId = crypto.randomUUID();
    const fileType = resolveFileType(file);
    const tagList = tags
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("churchId", churchId);
    formData.append("title", title);
    formData.append("type", fileType);
    if (folderId) formData.append("folderId", folderId);
    if (tagList.length > 0) formData.append("tags", tagList.join(","));

    onUploadStart?.({
      id: uploadId,
      filename: file.name,
      progress: 0,
      status: "uploading",
    });

    // Close dialog immediately so user can continue working
    resetForm();
    onOpenChange(false);

    const xhr = new XMLHttpRequest();

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        const percent = Math.round((event.loaded / event.total) * 100);
        onUploadProgress?.(uploadId, percent);
      }
    };

    xhr.onload = () => {
      setLoading(false);
      if (xhr.status >= 200 && xhr.status < 300) {
        onUploadComplete?.(uploadId);
        toast.success("File uploaded successfully");
        router.refresh();
      } else {
        let errorMsg = "Upload failed";
        try {
          const body = JSON.parse(xhr.responseText);
          if (body.error) errorMsg = body.error;
        } catch {
          // use default message
        }
        onUploadError?.(uploadId, errorMsg);
        toast.error(errorMsg);
      }
    };

    xhr.onerror = () => {
      setLoading(false);
      onUploadError?.(uploadId, "Network error during upload");
      toast.error("Network error during upload");
    };

    xhr.open("POST", "/api/documents/upload");
    xhr.send(formData);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileUp className="size-5 text-amber-600" />
            Upload File
          </DialogTitle>
          <DialogDescription>
            Upload a PDF, Word document, or video file. Content will be
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
                  : file
                    ? "border-green-500/50 bg-green-500/5"
                    : "border-muted-foreground/25 hover:border-muted-foreground/50"
              }
            `}
          >
            <Upload
              className={`size-8 ${
                file
                  ? "text-green-600"
                  : dragOver
                    ? "text-primary"
                    : "text-muted-foreground/50"
              }`}
            />
            {file ? (
              <div>
                <p className="text-sm font-medium">{file.name}</p>
                <p className="text-xs text-muted-foreground">
                  {(file.size / (1024 * 1024)).toFixed(1)} MB &middot; Click or
                  drop to replace
                </p>
              </div>
            ) : (
              <div>
                <p className="text-sm font-medium">
                  Drop your file here, or{" "}
                  <span className="text-primary underline underline-offset-2">
                    browse files
                  </span>
                </p>
                <p className="text-xs text-muted-foreground">
                  PDF, DOCX, or video files
                </p>
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept={ACCEPTED_TYPES}
              onChange={handleInputChange}
              className="hidden"
            />
          </div>

          {/* Metadata fields shown after file selection */}
          {file && (
            <>
              <div className="grid gap-2">
                <Label htmlFor="file-title">Title *</Label>
                <Input
                  id="file-title"
                  placeholder="Document title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="file-tags">Tags</Label>
                <Input
                  id="file-tags"
                  placeholder="sermon, faith, grace (comma-separated)"
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                  disabled={loading}
                />
              </div>
            </>
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
            <Button type="submit" disabled={loading || !file}>
              {loading && <Loader2 className="animate-spin" />}
              Upload
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
