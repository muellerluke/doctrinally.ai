"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, RefreshCw, RotateCcw, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  deleteDocument,
  retryDocument,
  reprocessDocument,
} from "@/lib/actions/documents";

interface DocumentDetailActionsProps {
  documentId: string;
  status: string;
  type: string;
}

export function DocumentDetailActions({
  documentId,
  status,
  type,
}: DocumentDetailActionsProps) {
  const router = useRouter();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [loading, setLoading] = useState<string | null>(null);

  const handleRetry = async () => {
    setLoading("retry");
    try {
      const result = await retryDocument(documentId);
      if (!result?.error) router.refresh();
    } finally {
      setLoading(null);
    }
  };

  const handleReprocess = async () => {
    setLoading("reprocess");
    try {
      const result = await reprocessDocument(documentId);
      if (!result?.error) router.refresh();
    } finally {
      setLoading(null);
    }
  };

  const handleDelete = async () => {
    setLoading("delete");
    try {
      const result = await deleteDocument(documentId);
      if (!result?.error) router.push("/documents");
    } finally {
      setLoading(null);
      setDeleteOpen(false);
    }
  };

  return (
    <>
      {status === "failed" && (
        <Button
          variant="outline"
          size="sm"
          onClick={handleRetry}
          disabled={loading !== null}
        >
          {loading === "retry" ? (
            <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
          ) : (
            <RotateCcw className="mr-1.5 h-4 w-4" />
          )}
          Retry
        </Button>
      )}

      {status === "indexed" && (
        <Button
          variant="outline"
          size="sm"
          onClick={handleReprocess}
          disabled={loading !== null}
        >
          {loading === "reprocess" ? (
            <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="mr-1.5 h-4 w-4" />
          )}
          Reprocess
        </Button>
      )}

      <Button
        variant="outline"
        size="sm"
        onClick={() => setDeleteOpen(true)}
        disabled={loading !== null}
        className="text-destructive hover:bg-destructive/10 hover:text-destructive"
      >
        <Trash2 className="mr-1.5 h-4 w-4" />
        Delete
      </Button>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete document</DialogTitle>
            <DialogDescription>
              This will permanently delete this document and all of its indexed
              chunks. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="outline"
              onClick={() => setDeleteOpen(false)}
              disabled={loading === "delete"}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={loading === "delete"}
            >
              {loading === "delete" ? (
                <>
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                  Deleting
                </>
              ) : (
                "Delete"
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
