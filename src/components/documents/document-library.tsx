"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Search, ChevronRight, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { DataTable } from "@/components/shared/data-table";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { FolderRow } from "./folder-row";
import { MoveDialog } from "./move-dialog";
import { DocumentViewerModal } from "./document-viewer-modal";
import {
  getDocumentColumns,
  type DocumentRow,
} from "./document-columns";
import {
  deleteDocument,
  retryDocument,
  reprocessDocument,
} from "@/lib/actions/documents";
import {
  renameFolder,
  deleteFolder,
  moveFolder,
  moveDocument,
  getFolderBreadcrumbs,
  getAllFolders,
  getFolders,
} from "@/lib/actions/folders";
import { getDocuments } from "@/lib/actions/documents";

export interface FolderItem {
  id: string;
  name: string;
  parentId: string | null;
  createdAt: Date;
}

export { type DocumentRow };

interface DocumentLibraryProps {
  initialDocuments: DocumentRow[];
  initialFolders: FolderItem[];
  churchId: string;
  currentFolderId?: string | null;
  onFolderChange?: (folderId: string | null) => void;
  /** Expose a stable refresh handle so sibling components (e.g. upload
   *  actions) can reload the current folder's contents without router.refresh(),
   *  which would clobber client-side folder state with root-level server data. */
  onRefreshReady?: (refresh: () => Promise<void>) => void;
}

export function DocumentLibrary({
  initialDocuments,
  initialFolders,
  churchId,
  currentFolderId: controlledFolderId,
  onFolderChange,
  onRefreshReady,
}: DocumentLibraryProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [internalFolderId, setInternalFolderId] = useState<string | null>(null);

  // Use controlled props when provided, otherwise fall back to internal state.
  const currentFolderId = controlledFolderId !== undefined ? controlledFolderId : internalFolderId;
  const setCurrentFolderId = onFolderChange ?? setInternalFolderId;
  const [breadcrumbs, setBreadcrumbs] = useState<
    { id: string; name: string }[]
  >([]);
  const [folders, setFolders] = useState<FolderItem[]>(initialFolders);
  const [documents, setDocuments] = useState<DocumentRow[]>(initialDocuments);
  const [allFolders, setAllFolders] = useState<FolderItem[]>([]);

  // Only sync server props when at the root folder (where the server data
  // matches). When inside a subfolder the server still sends root-level
  // data, so syncing would clobber the current view.
  useEffect(() => {
    if (currentFolderId === null) {
      setDocuments(initialDocuments);
    }
  }, [initialDocuments, currentFolderId]);
  useEffect(() => {
    if (currentFolderId === null) {
      setFolders(initialFolders);
    }
  }, [initialFolders, currentFolderId]);

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string | null>(null);

  // Dialogs
  const [renameFolderId, setRenameFolderId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [deleteFolderId, setDeleteFolderId] = useState<string | null>(null);
  const [deleteDocId, setDeleteDocId] = useState<string | null>(null);
  const [moveTarget, setMoveTarget] = useState<{
    type: "folder" | "document";
    id: string;
  } | null>(null);
  const [viewingDoc, setViewingDoc] = useState<DocumentRow | null>(null);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Refresh data when filters or folder changes
  const refreshData = useCallback(async () => {
    const [docsResult, foldersResult] = await Promise.all([
      getDocuments({
        churchId,
        folderId: currentFolderId,
        search: debouncedSearch || undefined,
        type: typeFilter ?? undefined,
        status: statusFilter ?? undefined,
      }),
      getFolders(churchId, currentFolderId),
    ]);

    if ("documents" in docsResult && docsResult.documents) {
      setDocuments(
        docsResult.documents.map((d) => ({
          id: d.id,
          title: d.title,
          type: d.type,
          status: d.status,
          metadata: d.metadata as Record<string, unknown> | null,
          sourceUrl: d.sourceUrl,
          blobPath: d.blobPath,
          content: d.content,
          createdAt: d.createdAt,
        }))
      );
    }

    if ("folders" in foldersResult && foldersResult.folders) {
      setFolders(
        foldersResult.folders.map((f) => ({
          id: f.id,
          name: f.name,
          parentId: f.parentId,
          createdAt: f.createdAt,
        }))
      );
    }
  }, [churchId, currentFolderId, debouncedSearch, typeFilter, statusFilter]);

  // Expose refreshData to parent so sibling components can trigger it.
  useEffect(() => {
    onRefreshReady?.(refreshData);
  }, [refreshData, onRefreshReady]);

  useEffect(() => {
    refreshData();
  }, [refreshData]);

  // Update breadcrumbs when folder changes
  useEffect(() => {
    if (!currentFolderId) {
      setBreadcrumbs([]);
      return;
    }
    getFolderBreadcrumbs(currentFolderId).then((result) => {
      if ("breadcrumbs" in result && result.breadcrumbs) {
        setBreadcrumbs(result.breadcrumbs);
      }
    });
  }, [currentFolderId]);

  // Load all folders for move dialog
  useEffect(() => {
    if (moveTarget) {
      getAllFolders(churchId).then((result) => {
        if ("folders" in result && result.folders) {
          setAllFolders(
            result.folders.map((f) => ({
              id: f.id,
              name: f.name,
              parentId: f.parentId,
              createdAt: f.createdAt,
            }))
          );
        }
      });
    }
  }, [moveTarget, churchId]);

  function openFolder(folderId: string) {
    setCurrentFolderId(folderId);
  }

  function navigateToRoot() {
    setCurrentFolderId(null);
  }

  function navigateToBreadcrumb(folderId: string) {
    setCurrentFolderId(folderId);
  }

  // Folder rename
  function startRename(folderId: string) {
    const folder = folders.find((f) => f.id === folderId);
    if (folder) {
      setRenameValue(folder.name);
      setRenameFolderId(folderId);
    }
  }

  async function handleRename() {
    if (!renameFolderId) return;
    startTransition(async () => {
      const result = await renameFolder(renameFolderId, renameValue);
      if ("error" in result) {
        toast.error(result.error);
      } else {
        toast.success("Folder renamed");
        setRenameFolderId(null);
        await refreshData();
        router.refresh();
      }
    });
  }

  // Folder delete
  async function handleDeleteFolder() {
    if (!deleteFolderId) return;
    startTransition(async () => {
      const result = await deleteFolder(deleteFolderId);
      if ("error" in result) {
        toast.error(result.error);
      } else {
        toast.success("Folder deleted");
        setDeleteFolderId(null);
        await refreshData();
        router.refresh();
      }
    });
  }

  // Document delete
  async function handleDeleteDocument() {
    if (!deleteDocId) return;
    startTransition(async () => {
      const result = await deleteDocument(deleteDocId);
      if ("error" in result) {
        toast.error(result.error);
      } else {
        toast.success("Document deleted");
        setDeleteDocId(null);
        await refreshData();
        router.refresh();
      }
    });
  }

  // Move
  async function handleMove(targetFolderId: string | null) {
    if (!moveTarget) return;
    startTransition(async () => {
      const result =
        moveTarget.type === "folder"
          ? await moveFolder(moveTarget.id, targetFolderId)
          : await moveDocument(moveTarget.id, targetFolderId);

      if ("error" in result) {
        toast.error(result.error);
      } else {
        toast.success(
          moveTarget.type === "folder" ? "Folder moved" : "Document moved"
        );
        setMoveTarget(null);
        await refreshData();
        router.refresh();
      }
    });
  }

  // Document actions
  async function handleRetry(docId: string) {
    startTransition(async () => {
      const result = await retryDocument(docId);
      if ("error" in result) {
        toast.error(result.error);
      } else {
        toast.success("Document queued for retry");
        await refreshData();
        router.refresh();
      }
    });
  }

  async function handleReprocess(docId: string) {
    startTransition(async () => {
      const result = await reprocessDocument(docId);
      if ("error" in result) {
        toast.error(result.error);
      } else {
        toast.success("Document queued for reprocessing");
        await refreshData();
        router.refresh();
      }
    });
  }

  function handleOpenDocument(doc: DocumentRow) {
    if (doc.type === "youtube" && doc.sourceUrl) {
      window.open(doc.sourceUrl, "_blank", "noopener,noreferrer");
    } else if (doc.type === "platejs") {
      window.open(`/documents/${doc.id}/edit`, "_blank", "noopener,noreferrer");
    } else {
      setViewingDoc(doc);
    }
  }

  const columns = useMemo(
    () =>
      getDocumentColumns({
        onOpen: handleOpenDocument,
        onEdit: (id) => {
          toast.info("Edit coming soon");
        },
        onRetry: handleRetry,
        onReprocess: handleReprocess,
        onDelete: (id) => setDeleteDocId(id),
        onMove: (id) =>
          setMoveTarget({ type: "document", id }),
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const renamingFolder = folders.find((f) => f.id === deleteFolderId);

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1 text-sm">
        <button
          type="button"
          onClick={navigateToRoot}
          className={
            breadcrumbs.length === 0
              ? "font-medium"
              : "text-muted-foreground transition-colors hover:text-foreground"
          }
        >
          Documents
        </button>
        {breadcrumbs.map((crumb) => (
          <span key={crumb.id} className="flex items-center gap-1">
            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
            <button
              type="button"
              onClick={() => navigateToBreadcrumb(crumb.id)}
              className={
                crumb.id === currentFolderId
                  ? "font-medium"
                  : "text-muted-foreground transition-colors hover:text-foreground"
              }
            >
              {crumb.name}
            </button>
          </span>
        ))}
      </nav>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-0 sm:min-w-[200px] max-w-sm">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search documents..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        <Select
          value={typeFilter ?? ""}
          onValueChange={(val) => setTypeFilter(val || null)}
        >
          <SelectTrigger>
            <SelectValue placeholder="All types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">All types</SelectItem>
            <SelectItem value="youtube">YouTube</SelectItem>
            <SelectItem value="video">Video</SelectItem>
            <SelectItem value="pdf">PDF</SelectItem>
            <SelectItem value="word">Word</SelectItem>
            <SelectItem value="platejs">Document</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={statusFilter ?? ""}
          onValueChange={(val) => setStatusFilter(val || null)}
        >
          <SelectTrigger>
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">All statuses</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="uploaded">Waiting to process</SelectItem>
            <SelectItem value="queued">In queue</SelectItem>
            <SelectItem value="processing">Processing</SelectItem>
            <SelectItem value="indexed">Ready</SelectItem>
            <SelectItem value="failed">Failed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Folders grid */}
      {folders.length > 0 && (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {folders.map((folder) => (
            <FolderRow
              key={folder.id}
              folder={folder}
              onOpen={openFolder}
              onRename={startRename}
              onDelete={(id) => setDeleteFolderId(id)}
              onMove={(id) =>
                setMoveTarget({ type: "folder", id })
              }
            />
          ))}
        </div>
      )}

      {/* Documents table */}
      <DataTable columns={columns} data={documents} loading={isPending} />

      {/* Rename folder dialog */}
      <Dialog
        open={renameFolderId !== null}
        onOpenChange={(open) => {
          if (!open) setRenameFolderId(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename folder</DialogTitle>
          </DialogHeader>
          <Input
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            placeholder="Folder name"
            onKeyDown={(e) => {
              if (e.key === "Enter") handleRename();
            }}
          />
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setRenameFolderId(null)}
            >
              Cancel
            </Button>
            <Button onClick={handleRename} disabled={!renameValue.trim()}>
              Rename
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete folder confirm */}
      <ConfirmDialog
        open={deleteFolderId !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteFolderId(null);
        }}
        title="Delete folder"
        description="This will delete the folder. Documents inside will be moved to the root level. This action cannot be undone."
        onConfirm={handleDeleteFolder}
        destructive
      />

      {/* Delete document confirm */}
      <ConfirmDialog
        open={deleteDocId !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteDocId(null);
        }}
        title="Delete document"
        description="This will permanently delete the document and all its indexed data. This action cannot be undone."
        onConfirm={handleDeleteDocument}
        destructive
      />

      {/* Document viewer */}
      <DocumentViewerModal
        document={viewingDoc}
        open={viewingDoc !== null}
        onOpenChange={(open) => {
          if (!open) setViewingDoc(null);
        }}
        onSave={async () => {
          setViewingDoc(null);
          await refreshData();
          router.refresh();
        }}
      />

      {/* Move dialog */}
      <MoveDialog
        open={moveTarget !== null}
        onOpenChange={(open) => {
          if (!open) setMoveTarget(null);
        }}
        onMove={handleMove}
        folders={allFolders}
        currentFolderId={
          moveTarget?.type === "folder"
            ? moveTarget.id
            : currentFolderId
        }
      />
    </div>
  );
}
