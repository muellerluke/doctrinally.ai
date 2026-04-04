"use client";

import {
  FileText,
  Video,
  BookOpen,
  X,
  ExternalLink,
  Play,
} from "lucide-react";
import type { Citation } from "@/lib/types/citations";

interface CitationCardProps {
  citation: Citation;
  onClose: () => void;
}

function formatTimestamp(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function getYouTubeEmbedUrl(sourceUrl: string, startTime?: number): string {
  // Extract video ID from various YouTube URL formats
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

export function CitationCard({ citation, onClose }: CitationCardProps) {
  const typeIcons = {
    youtube: Video,
    video: Video,
    pdf: FileText,
    word: FileText,
    platejs: BookOpen,
  };
  const Icon = typeIcons[citation.documentType] || FileText;

  return (
    <div className="w-80 overflow-hidden rounded-lg border bg-card shadow-lg">
      {/* Header */}
      <div className="flex items-center gap-2 border-b px-3 py-2">
        <Icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        <span className="flex-1 truncate text-xs font-medium">
          {citation.documentTitle}
        </span>
        <button
          onClick={onClose}
          className="rounded p-0.5 text-muted-foreground hover:text-foreground"
        >
          <X className="h-3 w-3" />
        </button>
      </div>

      {/* Content based on type */}
      <div className="p-3">
        {/* YouTube embed */}
        {citation.documentType === "youtube" && citation.sourceUrl && (
          <div className="mb-2 aspect-video overflow-hidden rounded">
            <iframe
              src={getYouTubeEmbedUrl(citation.sourceUrl, citation.startTime)}
              className="h-full w-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              title={citation.documentTitle}
            />
          </div>
        )}

        {/* Video with timestamp */}
        {citation.documentType === "video" && citation.sourceUrl && (
          <div className="mb-2 flex items-center gap-2 rounded bg-muted/50 px-3 py-2">
            <Play className="h-4 w-4 text-primary" />
            <span className="text-xs">
              {citation.startTime != null
                ? `Jump to ${formatTimestamp(citation.startTime)}`
                : "View video"}
            </span>
          </div>
        )}

        {/* Timestamp info for video/youtube */}
        {(citation.documentType === "youtube" ||
          citation.documentType === "video") &&
          citation.startTime != null && (
            <div className="mb-2 text-[10px] text-muted-foreground">
              Timestamp: {formatTimestamp(citation.startTime)}
              {citation.endTime != null &&
                ` – ${formatTimestamp(citation.endTime)}`}
            </div>
          )}

        {/* Page number for PDFs */}
        {citation.pageNumber != null && (
          <div className="mb-2 text-[10px] text-muted-foreground">
            Page {citation.pageNumber}
          </div>
        )}

        {/* Section heading for Platejs docs */}
        {citation.heading && (
          <div className="mb-2 text-[10px] font-medium text-muted-foreground">
            Section: {citation.heading}
          </div>
        )}

        {/* Chunk content preview */}
        <p className="text-xs leading-relaxed text-muted-foreground line-clamp-4">
          {citation.chunkContent}
        </p>

        {/* Link to source */}
        {citation.sourceUrl && (
          <a
            href={citation.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 inline-flex items-center gap-1 text-[10px] font-medium text-primary hover:underline"
          >
            View source
            <ExternalLink className="h-2.5 w-2.5" />
          </a>
        )}
      </div>
    </div>
  );
}
