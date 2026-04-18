"use client";

import { AlertTriangle, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatCents } from "@/lib/sermons/token-budget";

interface SermonBudgetIndicatorProps {
  budgetCents: number;
  spentCents: number;
  className?: string;
}

export function SermonBudgetIndicator({
  budgetCents,
  spentCents,
  className,
}: SermonBudgetIndicatorProps) {
  const pct = budgetCents > 0 ? Math.min(100, (spentCents / budgetCents) * 100) : 0;
  const exhausted = budgetCents > 0 && spentCents >= budgetCents;
  const near = pct >= 90 && !exhausted;

  const tone = exhausted
    ? "border-destructive/30 bg-destructive/10 text-destructive"
    : near
      ? "border-amber-400/40 bg-amber-400/10 text-amber-600 dark:text-amber-300"
      : "border-border bg-muted/40 text-muted-foreground";

  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-full border px-3 py-1 text-xs",
        tone,
        className
      )}
    >
      {exhausted ? (
        <AlertTriangle className="h-3.5 w-3.5" />
      ) : (
        <Sparkles className="h-3.5 w-3.5" />
      )}
      <span className="font-medium tabular-nums">
        {formatCents(spentCents)} / {formatCents(budgetCents)}
      </span>
      {near && !exhausted && <span className="italic">near limit</span>}
      {exhausted && <span className="italic">budget reached</span>}
    </div>
  );
}
