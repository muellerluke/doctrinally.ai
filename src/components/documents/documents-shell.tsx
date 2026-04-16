"use client";

import { useCallback, useRef, useState } from "react";
import { FileText } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { DocumentLibrary, type DocumentRow, type FolderItem } from "./document-library";
import { DocumentActions } from "@/app/(admin)/documents/document-actions";

interface DocumentsShellProps {
  churchId: string;
  initialDocuments: DocumentRow[];
  initialFolders: FolderItem[];
  isEmpty: boolean;
}

export function DocumentsShell({
  churchId,
  initialDocuments,
  initialFolders,
  isEmpty,
}: DocumentsShellProps) {
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const refreshRef = useRef<(() => Promise<void>) | null>(null);

  const handleRefreshReady = useCallback((fn: () => Promise<void>) => {
    refreshRef.current = fn;
  }, []);

  const handleContentChanged = useCallback(() => {
    refreshRef.current?.();
  }, []);

  return (
    <>
      <PageHeader
        title="Documents"
        description="Manage your church's content library"
        actions={
          <DocumentActions
            churchId={churchId}
            currentFolderId={currentFolderId}
            onContentChanged={handleContentChanged}
          />
        }
      />

      {isEmpty && currentFolderId === null ? (
        <EmptyState
          icon={FileText}
          title="No documents yet"
          description="Upload your first document to get started. The AI will index it automatically for chat retrieval."
        />
      ) : (
        <DocumentLibrary
          initialDocuments={initialDocuments}
          initialFolders={initialFolders}
          churchId={churchId}
          currentFolderId={currentFolderId}
          onFolderChange={setCurrentFolderId}
          onRefreshReady={handleRefreshReady}
        />
      )}
    </>
  );
}
