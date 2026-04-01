"use client";

import type { ColumnDef } from "@tanstack/react-table";
import {
  Play,
  FileText,
  Video,
  FileEdit,
  MoreHorizontal,
  Eye,
  Pencil,
  FolderInput,
  RotateCcw,
  RefreshCw,
  Trash2,
  ArrowUpDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DocumentStatusBadge } from "./document-status-badge";
import { formatDate } from "@/lib/utils";

export interface DocumentRow {
  id: string;
  title: string;
  type: string;
  status: string;
  metadata: Record<string, unknown> | null;
  createdAt: Date;
}

const typeIcons: Record<string, typeof FileText> = {
  youtube: Play,
  pdf: FileText,
  word: FileText,
  video: Video,
  platejs: FileEdit,
};

function capitalizeType(type: string) {
  if (type === "youtube") return "YouTube";
  if (type === "platejs") return "Document";
  if (type === "pdf") return "PDF";
  return type.charAt(0).toUpperCase() + type.slice(1);
}

interface ColumnOptions {
  onEdit: (id: string) => void;
  onRetry: (id: string) => void;
  onReprocess: (id: string) => void;
  onDelete: (id: string) => void;
  onMove: (id: string) => void;
}

export function getDocumentColumns(
  options: ColumnOptions
): ColumnDef<DocumentRow>[] {
  const { onEdit, onRetry, onReprocess, onDelete, onMove } = options;

  return [
    {
      accessorKey: "title",
      header: ({ column }) => (
        <Button
          variant="ghost"
          size="sm"
          onClick={() =>
            column.toggleSorting(column.getIsSorted() === "asc")
          }
          className="-ml-2"
        >
          Title
          <ArrowUpDown className="h-3.5 w-3.5" />
        </Button>
      ),
      cell: ({ row }) => {
        const Icon = typeIcons[row.original.type] ?? FileText;
        return (
          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary/10">
              <Icon className="h-3.5 w-3.5 text-primary" />
            </div>
            <span className="truncate font-medium">
              {row.original.title}
            </span>
          </div>
        );
      },
    },
    {
      accessorKey: "type",
      header: "Type",
      cell: ({ row }) => (
        <Badge variant="outline" className="font-normal">
          {capitalizeType(row.original.type)}
        </Badge>
      ),
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => (
        <DocumentStatusBadge status={row.original.status} />
      ),
    },
    {
      accessorKey: "createdAt",
      header: "Created",
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground">
          {formatDate(row.original.createdAt)}
        </span>
      ),
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const doc = row.original;
        return (
          <DropdownMenu>
            <DropdownMenuTrigger
              render={<Button variant="ghost" size="icon-sm" />}
            >
              <MoreHorizontal className="h-4 w-4" />
              <span className="sr-only">Document actions</span>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onEdit(doc.id)}>
                <Eye />
                View
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onEdit(doc.id)}>
                <Pencil />
                Edit metadata
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onMove(doc.id)}>
                <FolderInput />
                Move to folder
              </DropdownMenuItem>
              {doc.status === "failed" && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => onRetry(doc.id)}>
                    <RotateCcw />
                    Retry
                  </DropdownMenuItem>
                </>
              )}
              {doc.status === "indexed" && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => onReprocess(doc.id)}
                  >
                    <RefreshCw />
                    Reprocess
                  </DropdownMenuItem>
                </>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                variant="destructive"
                onClick={() => onDelete(doc.id)}
              >
                <Trash2 />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];
}
