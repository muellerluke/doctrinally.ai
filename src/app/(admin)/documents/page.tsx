import { eq } from "drizzle-orm";
import { db } from "@/db";
import { requireMembership } from "@/lib/auth-guards";
import { getDocuments } from "@/lib/actions/documents";
import { getFolders } from "@/lib/actions/folders";
import { DocumentsShell } from "@/components/documents/documents-shell";
import { AdminChatTester } from "@/components/documents/admin-chat-tester";

export default async function DocumentsPage() {
  const { membership, church } = await requireMembership();
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
          sourceUrl: d.sourceUrl,
          blobPath: d.blobPath,
          content: d.content,
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

  // Get document status counts for the chat tester
  const indexedCount = documents.filter((d) => d.status === "indexed").length;
  const processingCount = documents.filter(
    (d) => d.status === "processing" || d.status === "queued"
  ).length;

  return (
    <div className="space-y-8">
      <DocumentsShell
        churchId={churchId}
        initialDocuments={documents}
        initialFolders={folders}
        isEmpty={isEmpty}
      />

      <AdminChatTester
        churchId={churchId}
        churchName={church.name}
        indexedCount={indexedCount}
        processingCount={processingCount}
      />
    </div>
  );
}
