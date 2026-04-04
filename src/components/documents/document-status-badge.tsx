"use client";

import { Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const statusConfig: Record<
  string,
  { label: string; className: string; dot?: string; pulse?: boolean }
> = {
  draft: {
    label: "Draft",
    className: "bg-muted text-muted-foreground",
    dot: "bg-muted-foreground/50",
  },
  uploaded: {
    label: "Waiting to process",
    className:
      "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    dot: "bg-blue-500",
  },
  queued: {
    label: "In queue",
    className:
      "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
    dot: "bg-amber-500",
    pulse: true,
  },
  processing: {
    label: "Processing",
    className:
      "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
    dot: "bg-amber-500",
    pulse: true,
  },
  indexed: {
    label: "Ready",
    className:
      "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
    dot: "bg-emerald-500",
  },
  failed: {
    label: "Failed",
    className: "bg-destructive/10 text-destructive",
    dot: "bg-destructive",
  },
};

interface DocumentStatusBadgeProps {
  status: string;
  className?: string;
}

export function DocumentStatusBadge({
  status,
  className,
}: DocumentStatusBadgeProps) {
  const config = statusConfig[status] ?? {
    label: status,
    className: "bg-muted text-muted-foreground",
    dot: "bg-muted-foreground/50",
  };

  return (
    <Badge
      variant="secondary"
      className={cn(
        "gap-1.5 border-none font-medium",
        config.className,
        className
      )}
    >
      {config.pulse ? (
        <Loader2 className="h-2.5 w-2.5 animate-spin" />
      ) : (
        <span
          className={cn("h-1.5 w-1.5 rounded-full", config.dot)}
        />
      )}
      {config.label}
    </Badge>
  );
}
