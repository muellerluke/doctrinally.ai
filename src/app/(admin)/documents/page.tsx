import { FileText } from "lucide-react";
import { requireMembership } from "@/lib/auth-guards";
import { getDocuments } from "@/lib/actions/documents";
import { getFolders } from "@/lib/actions/folders";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { DocumentLibrary } from "@/components/documents/document-library";
import { DocumentActions } from "./document-actions";

export default async function DocumentsPage() {
  const { membership } = await requireMembership();
  const churchId = membership.churchId;

  const [docsResult, foldersResult] = await Promise.all([
    getDocuments({ churchId, folderId: null }),
    getFolders(churchId, null),
  ]);

  const documents =
    "documents" in docsResult && docsResult.documents
      ? docsResult.documents.map((d) => ({
          id: d.id,
          title: d.title,
          type: d.type,
          status: d.status,
          metadata: d.metadata as Record<string, unknown> | null,
          createdAt: d.createdAt,
        }))
      : [];

  const folders =
    "folders" in foldersResult && foldersResult.folders
      ? foldersResult.folders.map((f) => ({
          id: f.id,
          name: f.name,
          parentId: f.parentId,
          createdAt: f.createdAt,
        }))
      : [];

  const isEmpty = documents.length === 0 && folders.length === 0;

  return (
    <div className="space-y-8">
      <PageHeader
        title="Documents"
        description="Manage your church's content library"
        actions={<DocumentActions churchId={churchId} />}
      />

      {isEmpty ? (
        <EmptyState
          icon={FileText}
          title="No documents yet"
          description="Upload your first document to get started. The AI will index it automatically for chat retrieval."
        />
      ) : (
        <DocumentLibrary
          initialDocuments={documents}
          initialFolders={folders}
          churchId={churchId}
        />
      )}
    </div>
  );
}
