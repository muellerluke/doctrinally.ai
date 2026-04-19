"use client";

import {
  Play,
  FileText,
  BookOpen,
  ExternalLink,
  Video,
  Globe,
} from "lucide-react";
import type { Citation } from "@/lib/types/citations";

interface DocumentEmbedProps {
  citation: Citation;
}

function formatTimestamp(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function getYouTubeEmbedUrl(sourceUrl: string, startTime?: number): string {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&?#]+)/,
    /youtube\.com\/shorts\/([^&?#]+)/,
  ];
  let videoId = "";
  for (const pattern of patterns) {
    const match = sourceUrl.match(pattern);
    if (match) {
      videoId = match[1];
      break;
    }
  }
  if (!videoId) return sourceUrl;
  const start = startTime ? `&start=${startTime}` : "";
  return `https://www.youtube.com/embed/${videoId}?autoplay=0${start}`;
}

export function DocumentEmbed({ citation }: DocumentEmbedProps) {
  const { documentType, documentTitle, sourceUrl } = citation;

  // YouTube: inline iframe
  if (documentType === "youtube" && sourceUrl) {
    return (
      <div className="my-3 max-w-lg overflow-hidden rounded-lg border shadow-sm">
        <div className="aspect-video">
          <iframe
            src={getYouTubeEmbedUrl(sourceUrl, citation.startTime)}
            className="h-full w-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            title={documentTitle}
          />
        </div>
        <div className="flex items-center gap-2 border-t bg-card px-3 py-2">
          <Video className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          <span className="flex-1 truncate text-xs font-medium">
            {documentTitle}
          </span>
          {citation.startTime != null && (
            <span className="text-[10px] text-muted-foreground">
              {formatTimestamp(citation.startTime)}
            </span>
          )}
        </div>
      </div>
    );
  }

  // Uploaded video: video player
  if (documentType === "video" && sourceUrl) {
    return (
      <div className="my-3 max-w-lg overflow-hidden rounded-lg border shadow-sm">
        <video
          src={
            citation.startTime
              ? `${sourceUrl}#t=${citation.startTime}`
              : sourceUrl
          }
          controls
          className="w-full"
        >
          Your browser does not support video playback.
        </video>
        <div className="flex items-center gap-2 border-t bg-card px-3 py-2">
          <Play className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          <span className="flex-1 truncate text-xs font-medium">
            {documentTitle}
          </span>
          {citation.startTime != null && (
            <span className="text-[10px] text-muted-foreground">
              {formatTimestamp(citation.startTime)}
            </span>
          )}
        </div>
      </div>
    );
  }

  // PDF or Word: document card
  if (documentType === "pdf" || documentType === "word") {
    return (
      <div className="my-3 max-w-md overflow-hidden rounded-lg border shadow-sm">
        <div className="flex items-center gap-3 bg-card px-4 py-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
            <FileText className="h-5 w-5 text-primary" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{documentTitle}</p>
            <p className="text-xs text-muted-foreground">
              {documentType === "pdf" ? "PDF Document" : "Word Document"}
              {citation.pageNumber != null &&
                ` — Page ${citation.pageNumber}`}
            </p>
          </div>
          {sourceUrl && (
            <a
              href={sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="shrink-0 rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <ExternalLink className="h-4 w-4" />
            </a>
          )}
        </div>
      </div>
    );
  }

  // Website page: link card with hostname
  if (documentType === "website_page" && sourceUrl) {
    let hostname: string | null = null;
    try {
      hostname = new URL(sourceUrl).hostname;
    } catch {
      hostname = null;
    }
    return (
      <a
        href={sourceUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="my-3 flex max-w-md items-center gap-3 overflow-hidden rounded-lg border bg-card px-4 py-3 shadow-sm transition-colors hover:bg-muted/40"
      >
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
          <Globe className="h-5 w-5 text-primary" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{documentTitle}</p>
          {hostname && (
            <p className="truncate text-xs text-muted-foreground">{hostname}</p>
          )}
        </div>
        <ExternalLink className="h-4 w-4 shrink-0 text-muted-foreground" />
      </a>
    );
  }

  // Platejs document: content card
  if (documentType === "platejs") {
    return (
      <div className="my-3 max-w-md overflow-hidden rounded-lg border shadow-sm">
        <div className="flex items-center gap-3 bg-card px-4 py-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
            <BookOpen className="h-5 w-5 text-primary" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{documentTitle}</p>
            {citation.heading && (
              <p className="truncate text-xs text-muted-foreground">
                {citation.heading}
              </p>
            )}
          </div>
        </div>
        {citation.chunkContent && (
          <div className="border-t px-4 py-2">
            <p className="line-clamp-3 text-xs leading-relaxed text-muted-foreground">
              {citation.chunkContent}
            </p>
          </div>
        )}
      </div>
    );
  }

  // Fallback
  return null;
}
