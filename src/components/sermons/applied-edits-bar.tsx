"use client";

import { Undo2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface AppliedEditsBarProps {
  count: number;
  onUndo: () => void;
  className?: string;
}

/**
 * Floating pill shown after an AI turn lands edits on the editor. Tapping
 * Undo calls `editor.undo()` which collapses the full AI batch into a single
 * checkpoint (we wrap the AI apply in `withoutNormalizing(setValue)`).
 */
export function AppliedEditsBar({ count, onUndo, className }: AppliedEditsBarProps) {
  if (count <= 0) return null;
  return (
    <div
      className={cn(
        "pointer-events-auto flex items-center gap-3 rounded-full border border-border bg-background/90 px-3 py-1.5 text-xs shadow-lg backdrop-blur",
        className
      )}
    >
      <span className="font-medium">
        Applied {count} AI edit{count === 1 ? "" : "s"}
      </span>
      <Button
        variant="ghost"
        size="sm"
        onClick={onUndo}
        className="h-6 gap-1 px-2 text-xs"
      >
        <Undo2 className="h-3 w-3" />
        Undo
      </Button>
    </div>
  );
}
