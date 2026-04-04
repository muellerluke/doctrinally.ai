"use client";

import { ExternalLink, FileText } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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

function capitalizeType(type: string) {
  if (type === "youtube") return "YouTube";
  if (type === "platejs") return "Document";
  if (type === "pdf") return "PDF";
  return type.charAt(0).toUpperCase() + type.slice(1);
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
  const isPdfOrWord = doc.type === "pdf" || doc.type === "word";
  const fileUrl = doc.blobPath || doc.sourceUrl;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={
          isPlatejs
            ? "max-h-[90vh] max-w-4xl overflow-hidden p-0"
            : "max-h-[90vh] max-w-2xl"
        }
      >
        {!isPlatejs && (
          <DialogHeader className="px-6 pt-6">
            <div className="flex items-center gap-3">
              <DialogTitle className="flex-1 text-lg">
                {doc.title}
              </DialogTitle>
              <Badge variant="outline" className="shrink-0 font-normal">
                {capitalizeType(doc.type)}
              </Badge>
              <DocumentStatusBadge status={doc.status} />
            </div>
          </DialogHeader>
        )}

        <div className={isPlatejs ? "h-[85vh]" : "px-6 pb-6"}>
          {/* Video player */}
          {isVideo && fileUrl && (
            <div className="space-y-3">
              <div className="overflow-hidden rounded-lg bg-black">
                <video
                  src={fileUrl}
                  controls
                  className="mx-auto max-h-[60vh] w-full"
                >
                  Your browser does not support the video element.
                </video>
              </div>
              <div className="flex justify-end">
                <a
                  href={fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Button variant="outline" size="sm">
                    <ExternalLink className="mr-2 h-3.5 w-3.5" />
                    Open in new tab
                  </Button>
                </a>
              </div>
            </div>
          )}

          {/* PDF / Word — iframe preview or download link */}
          {isPdfOrWord && fileUrl && (
            <div className="space-y-3">
              {doc.type === "pdf" ? (
                <iframe
                  src={fileUrl}
                  className="h-[60vh] w-full rounded-lg border"
                  title={doc.title}
                />
              ) : (
                <div className="flex flex-col items-center gap-4 rounded-lg border bg-muted/30 py-12">
                  <FileText className="h-12 w-12 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    Word documents cannot be previewed in the browser.
                  </p>
                </div>
              )}
              <div className="flex justify-end">
                <a
                  href={fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Button variant="outline" size="sm">
                    <ExternalLink className="mr-2 h-3.5 w-3.5" />
                    {doc.type === "pdf" ? "Open in new tab" : "Download"}
                  </Button>
                </a>
              </div>
            </div>
          )}

          {/* Platejs rich text editor */}
          {isPlatejs && (
            <PlatejsEditor
              documentId={doc.id}
              initialContent={doc.content || ""}
              title={doc.title}
            />
          )}

          {/* Fallback for types without a viewer */}
          {!isVideo && !isPdfOrWord && !isPlatejs && (
            <div className="flex flex-col items-center gap-4 py-8">
              <FileText className="h-12 w-12 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                No preview available for this document type.
              </p>
              {fileUrl && (
                <a
                  href={fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Button variant="outline" size="sm">
                    <ExternalLink className="mr-2 h-3.5 w-3.5" />
                    Open source
                  </Button>
                </a>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
