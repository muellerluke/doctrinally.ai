"use client";

import {
  ExternalLink,
  FileText,
  Play,
  Video,
  FileEdit,
  Calendar,
  User,
  Tag,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DocumentStatusBadge } from "./document-status-badge";
import { PlatejsEditor } from "./platejs-editor";
import type { DocumentRow } from "./document-columns";

interface DocumentViewerModalProps {
  document: DocumentRow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave?: () => void;
}

const typeConfig: Record<
  string,
  { label: string; icon: typeof FileText; accent: string }
> = {
  youtube: {
    label: "YouTube",
    icon: Play,
    accent: "text-red-500 bg-red-500/10",
  },
  video: {
    label: "Video",
    icon: Video,
    accent: "text-blue-500 bg-blue-500/10",
  },
  pdf: {
    label: "PDF",
    icon: FileText,
    accent: "text-amber-500 bg-amber-500/10",
  },
  word: {
    label: "Word",
    icon: FileText,
    accent: "text-blue-600 bg-blue-600/10",
  },
  platejs: {
    label: "Document",
    icon: FileEdit,
    accent: "text-emerald-500 bg-emerald-500/10",
  },
};

function formatModalDate(date: Date) {
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function DocumentViewerModal({
  document: doc,
  open,
  onOpenChange,
  onSave,
}: DocumentViewerModalProps) {
  if (!doc) return null;

  const isPlatejs = doc.type === "platejs";
  const isVideo = doc.type === "video";
  const isYouTube = doc.type === "youtube";
  const isPdfOrWord = doc.type === "pdf" || doc.type === "word";
  const fileUrl = doc.blobPath || doc.sourceUrl;

  const config = typeConfig[doc.type] ?? {
    label: doc.type,
    icon: FileText,
    accent: "text-muted-foreground bg-muted",
  };
  const TypeIcon = config.icon;

  const metadata = doc.metadata as Record<string, string> | null;
  const speaker = metadata?.speaker || metadata?.author;
  const tags = metadata?.tags;
  const description = metadata?.description;

  // Extract YouTube video ID for embed
  const youtubeId = isYouTube && doc.sourceUrl
    ? doc.sourceUrl.match(
        /(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([^&?#]+)/
      )?.[1]
    : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={!isPlatejs}
        className={
          isPlatejs
            ? "max-h-[90vh] max-w-4xl overflow-hidden p-0"
            : "max-h-[90vh] max-w-3xl overflow-y-auto p-0 sm:max-w-3xl"
        }
      >
        {isPlatejs ? (
          <div className="h-[85vh]">
            <PlatejsEditor
              documentId={doc.id}
              initialContent={doc.content || ""}
              title={doc.title}
            />
          </div>
        ) : (
          <>
            {/* Media area */}
            {(isVideo || isYouTube) && (
              <div className="relative w-full overflow-hidden rounded-t-xl bg-black">
                {isYouTube && youtubeId ? (
                  <div className="relative pt-[56.25%]">
                    <iframe
                      src={`https://www.youtube.com/embed/${youtubeId}`}
                      title={doc.title}
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                      className="absolute inset-0 h-full w-full"
                    />
                  </div>
                ) : isVideo && fileUrl ? (
                  <div className="relative pt-[56.25%]">
                    <video
                      src={fileUrl}
                      controls
                      className="absolute inset-0 h-full w-full object-contain"
                    >
                      Your browser does not support the video element.
                    </video>
                  </div>
                ) : (
                  <div className="flex items-center justify-center py-20">
                    <div className="flex flex-col items-center gap-3 text-muted-foreground">
                      <Video className="h-12 w-12 opacity-40" />
                      <p className="text-sm">No video source available</p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* PDF preview */}
            {doc.type === "pdf" && fileUrl && (
              <div className="w-full overflow-hidden rounded-t-xl">
                <iframe
                  src={fileUrl}
                  className="h-[55vh] w-full"
                  title={doc.title}
                />
              </div>
            )}

            {/* Word fallback */}
            {doc.type === "word" && (
              <div className="flex flex-col items-center gap-4 rounded-t-xl bg-muted/20 py-16">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-600/10">
                  <FileText className="h-8 w-8 text-blue-600" />
                </div>
                <p className="text-sm text-muted-foreground">
                  Word documents cannot be previewed in the browser.
                </p>
              </div>
            )}

            {/* Fallback for other unknown types */}
            {!isVideo && !isYouTube && !isPdfOrWord && (
              <div className="flex flex-col items-center gap-4 rounded-t-xl bg-muted/20 py-16">
                <div
                  className={`flex h-16 w-16 items-center justify-center rounded-2xl ${config.accent}`}
                >
                  <TypeIcon className="h-8 w-8" />
                </div>
                <p className="text-sm text-muted-foreground">
                  No preview available for this document type.
                </p>
              </div>
            )}

            {/* Content info */}
            <div className="space-y-5 px-6 pb-6 pt-5">
              {/* Type + Status row */}
              <div className="flex items-center gap-2">
                <div
                  className={`flex h-7 w-7 items-center justify-center rounded-lg ${config.accent}`}
                >
                  <TypeIcon className="h-3.5 w-3.5" />
                </div>
                <Badge
                  variant="outline"
                  className="border-none bg-muted/60 font-normal"
                >
                  {config.label}
                </Badge>
                <DocumentStatusBadge status={doc.status} />
              </div>

              {/* Title */}
              <h2 className="font-heading text-2xl leading-tight tracking-tight">
                {doc.title}
              </h2>

              {/* Description */}
              {description && (
                <p className="text-[0.9rem] leading-relaxed text-muted-foreground">
                  {description}
                </p>
              )}

              {/* Metadata row */}
              <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5 opacity-60" />
                  {formatModalDate(doc.createdAt)}
                </span>
                {speaker && (
                  <span className="flex items-center gap-1.5">
                    <User className="h-3.5 w-3.5 opacity-60" />
                    {speaker}
                  </span>
                )}
                {tags && (
                  <span className="flex items-center gap-1.5">
                    <Tag className="h-3.5 w-3.5 opacity-60" />
                    {tags}
                  </span>
                )}
              </div>

              {/* Divider + actions */}
              <div className="flex items-center justify-end gap-3 border-t pt-4">
                {fileUrl && (
                  <a
                    href={fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Button variant="outline" size="sm">
                      <ExternalLink className="mr-2 h-3.5 w-3.5" />
                      {doc.type === "word" ? "Download" : "Open in new tab"}
                    </Button>
                  </a>
                )}
                {isYouTube && doc.sourceUrl && (
                  <a
                    href={doc.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Button variant="outline" size="sm">
                      <ExternalLink className="mr-2 h-3.5 w-3.5" />
                      Open on YouTube
                    </Button>
                  </a>
                )}
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
