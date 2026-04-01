"use client";

import { FolderIcon, MoreHorizontal, Pencil, FolderInput, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatDate } from "@/lib/utils";

interface FolderRowProps {
  folder: {
    id: string;
    name: string;
    createdAt: Date;
  };
  onOpen: (id: string) => void;
  onRename: (id: string) => void;
  onDelete: (id: string) => void;
  onMove: (id: string) => void;
}

export function FolderRow({
  folder,
  onOpen,
  onRename,
  onDelete,
  onMove,
}: FolderRowProps) {
  return (
    <button
      type="button"
      onClick={() => onOpen(folder.id)}
      className="group flex w-full items-center gap-3 rounded-lg border border-border/60 bg-card/60 px-4 py-3 text-left transition-colors hover:border-border hover:bg-card"
    >
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary/10">
        <FolderIcon className="h-4.5 w-4.5 text-primary" />
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{folder.name}</p>
        <p className="text-xs text-muted-foreground">
          {formatDate(folder.createdAt)}
        </p>
      </div>

      <div
        onClick={(e) => e.stopPropagation()}
        className="opacity-0 transition-opacity group-hover:opacity-100"
      >
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button variant="ghost" size="icon-sm" />
            }
          >
            <MoreHorizontal className="h-4 w-4" />
            <span className="sr-only">Folder actions</span>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              onClick={() => onRename(folder.id)}
            >
              <Pencil />
              Rename
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => onMove(folder.id)}
            >
              <FolderInput />
              Move
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              variant="destructive"
              onClick={() => onDelete(folder.id)}
            >
              <Trash2 />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </button>
  );
}
