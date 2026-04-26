"use client";

import * as React from "react";
import { Check, ChevronDown, ChevronUp, Clock, Upload, X } from "lucide-react";

import { useUploads } from "@/components/documents/upload-provider";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export function UploadProgress() {
  const { uploads, removeUpload } = useUploads();
  const [minimized, setMinimized] = React.useState(false);

  // Auto-remove completed uploads after 5 seconds
  React.useEffect(() => {
    const completed = uploads.filter((u) => u.status === "complete");
    if (completed.length === 0) return;

    const timers = completed.map((u) =>
      setTimeout(() => removeUpload(u.id), 5000)
    );
    return () => timers.forEach(clearTimeout);
  }, [uploads, removeUpload]);

  if (uploads.length === 0) return null;

  const activeCount = uploads.filter((u) => u.status === "uploading").length;
  const queuedCount = uploads.filter((u) => u.status === "queued").length;
  const errorCount = uploads.filter((u) => u.status === "error").length;

  return (
    <div className="fixed bottom-4 left-4 z-50 w-80 overflow-hidden rounded-xl border border-border bg-popover shadow-lg">
      {/* Header */}
      <button
        type="button"
        onClick={() => setMinimized((v) => !v)}
        className="flex w-full items-center justify-between gap-2 border-b border-border bg-muted/50 px-3 py-2 text-left text-sm font-medium transition-colors hover:bg-muted"
      >
        <span className="flex items-center gap-2">
          <Upload className="size-4 text-primary" />
          {activeCount > 0
            ? `Uploading ${activeCount}${
                queuedCount > 0 ? ` (${queuedCount} queued)` : ""
              }...`
            : queuedCount > 0
              ? `${queuedCount} queued`
              : errorCount > 0
                ? `${errorCount} upload${errorCount > 1 ? "s" : ""} failed`
                : "Uploads complete"}
        </span>
        <span className="flex items-center gap-1">
          {errorCount > 0 && (
            <Badge variant="destructive" className="text-[10px]">
              {errorCount}
            </Badge>
          )}
          {minimized ? (
            <ChevronUp className="size-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="size-4 text-muted-foreground" />
          )}
        </span>
      </button>

      {/* Upload rows */}
      {!minimized && (
        <div className="max-h-64 overflow-y-auto">
          {uploads.map((upload) => (
            <div
              key={upload.id}
              className="flex items-center gap-2 border-b border-border/50 px-3 py-2 last:border-0"
            >
              {/* Status icon */}
              {upload.status === "complete" ? (
                <Check className="size-4 shrink-0 text-green-600" />
              ) : upload.status === "error" ? (
                <X className="size-4 shrink-0 text-destructive" />
              ) : upload.status === "queued" ? (
                <Clock className="size-4 shrink-0 text-muted-foreground" />
              ) : (
                <Upload className="size-4 shrink-0 animate-pulse text-primary" />
              )}

              {/* Filename + progress */}
              <div className="min-w-0 flex-1">
                <p
                  className={`truncate text-xs font-medium ${
                    upload.status === "queued" ? "text-muted-foreground" : ""
                  }`}
                >
                  {upload.filename}
                </p>

                {upload.status === "queued" && (
                  <p className="mt-0.5 text-[10px] text-muted-foreground">
                    Queued
                  </p>
                )}

                {upload.status === "uploading" && (
                  <div className="mt-1 flex items-center gap-2">
                    <Progress value={upload.progress} className="h-1 flex-1" />
                    <span className="shrink-0 text-[10px] tabular-nums text-muted-foreground">
                      {upload.progress === 0
                        ? "Preparing…"
                        : `${upload.progress}%`}
                    </span>
                  </div>
                )}

                {upload.status === "error" && upload.error && (
                  <p className="mt-0.5 truncate text-[10px] text-destructive">
                    {upload.error}
                  </p>
                )}
              </div>

              {/* Dismiss */}
              {upload.status !== "uploading" && upload.status !== "queued" && (
                <Button
                  variant="ghost"
                  size="icon-xs"
                  onClick={() => removeUpload(upload.id)}
                  className="shrink-0"
                >
                  <X className="size-3" />
                  <span className="sr-only">Dismiss</span>
                </Button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
