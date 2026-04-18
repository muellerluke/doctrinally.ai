"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight, Loader2, Pencil } from "lucide-react";
import type { ParsedDiff } from "@/lib/sermons/diff-parser";
import { cn } from "@/lib/utils";

interface SermonDiffCardProps {
  /** When true, the fence is still streaming — show a shimmer, no hunks yet. */
  inProgress?: boolean;
  /** Parsed diff. Omit or pass null during streaming. */
  diff?: ParsedDiff | null;
  /** Info from the applier: which hunks were skipped (for conflict notice). */
  applyResult?: {
    applied: number;
    skipped: { reason: string }[];
  };
}

export function SermonDiffCard({ inProgress, diff, applyResult }: SermonDiffCardProps) {
  const [open, setOpen] = useState(false);

  if (inProgress) {
    return (
      <div className="my-3 flex items-center gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
        <span>Composing edits…</span>
      </div>
    );
  }

  if (!diff) return null;
  const hunkCount = diff.hunks.length;

  return (
    <div className="my-3 rounded-lg border border-border bg-muted/20 text-xs">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-2 rounded-t-lg px-3 py-2 text-left font-medium text-foreground hover:bg-muted/40"
      >
        <span className="flex items-center gap-2">
          {open ? (
            <ChevronDown className="h-3.5 w-3.5" />
          ) : (
            <ChevronRight className="h-3.5 w-3.5" />
          )}
          <Pencil className="h-3.5 w-3.5 text-primary" />
          {hunkCount} edit{hunkCount === 1 ? "" : "s"} applied
          {applyResult && applyResult.skipped.length > 0 && (
            <span className="font-normal text-amber-600 dark:text-amber-400">
              — {applyResult.skipped.length} skipped (conflict)
            </span>
          )}
        </span>
      </button>
      {open && (
        <div className="border-t border-border px-3 py-2 font-mono">
          {diff.hunks.map((hunk, i) => (
            <div key={i} className={cn("mb-3 last:mb-0", i > 0 && "mt-3 border-t pt-3")}>
              <div className="mb-1 text-[10px] uppercase tracking-wide text-muted-foreground">
                line {hunk.startLine}
              </div>
              {hunk.removals.map((line, j) => (
                <div
                  key={`r-${j}`}
                  className="whitespace-pre-wrap rounded-sm bg-red-500/10 px-1.5 py-0.5 text-red-700 dark:text-red-300"
                >
                  {line ? `- ${line}` : <span className="italic opacity-60">(empty line)</span>}
                </div>
              ))}
              {hunk.additions.map((line, j) => (
                <div
                  key={`a-${j}`}
                  className="whitespace-pre-wrap rounded-sm bg-emerald-500/10 px-1.5 py-0.5 text-emerald-700 dark:text-emerald-300"
                >
                  {line ? `+ ${line}` : <span className="italic opacity-60">(empty line)</span>}
                </div>
              ))}
            </div>
          ))}
          {applyResult && applyResult.skipped.length > 0 && (
            <div className="mt-2 rounded border border-amber-500/30 bg-amber-500/10 px-2 py-1.5 text-[11px] text-amber-700 dark:text-amber-300">
              <div className="font-semibold">Skipped edits:</div>
              <ul className="list-disc pl-4">
                {applyResult.skipped.map((s, i) => (
                  <li key={i}>{s.reason}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
