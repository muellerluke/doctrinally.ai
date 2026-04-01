"use client";

import { useState } from "react";
import { FolderIcon, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

interface FolderOption {
  id: string;
  name: string;
  parentId: string | null;
}

interface MoveDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onMove: (targetFolderId: string | null) => void;
  folders: FolderOption[];
  currentFolderId?: string | null;
}

export function MoveDialog({
  open,
  onOpenChange,
  onMove,
  folders,
  currentFolderId,
}: MoveDialogProps) {
  const [selected, setSelected] = useState<string | null>(null);

  const availableFolders = folders.filter(
    (f) => f.id !== currentFolderId
  );

  function handleConfirm() {
    onMove(selected);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Move to folder</DialogTitle>
          <DialogDescription>
            Choose a destination folder, or move to the root level.
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-64 space-y-1 overflow-y-auto rounded-lg border border-border/60 p-2">
          <button
            type="button"
            onClick={() => setSelected(null)}
            className={cn(
              "flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors",
              selected === null
                ? "bg-primary/10 text-primary"
                : "hover:bg-muted"
            )}
          >
            <Home className="h-4 w-4" />
            Root
          </button>

          {availableFolders.map((folder) => (
            <button
              key={folder.id}
              type="button"
              onClick={() => setSelected(folder.id)}
              className={cn(
                "flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors",
                selected === folder.id
                  ? "bg-primary/10 text-primary"
                  : "hover:bg-muted"
              )}
            >
              <FolderIcon className="h-4 w-4" />
              {folder.name}
            </button>
          ))}

          {availableFolders.length === 0 && (
            <p className="px-3 py-4 text-center text-sm text-muted-foreground">
              No other folders available.
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleConfirm}>Move here</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
