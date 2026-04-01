import { redirect, notFound } from "next/navigation";
import { requireMembership } from "@/lib/auth-guards";
import { getDocumentById } from "@/lib/actions/documents";
import { PlatejsEditor } from "@/components/documents/platejs-editor";

interface EditDocumentPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditDocumentPage({
  params,
}: EditDocumentPageProps) {
  await requireMembership();

  const { id } = await params;
  const result = await getDocumentById(id);

  if ("error" in result) {
    notFound();
  }

  const { document: doc } = result;

  if (doc.type !== "platejs") {
    redirect("/documents");
  }

  return (
    <PlatejsEditor
      documentId={doc.id}
      initialContent={doc.content ?? ""}
      title={doc.title}
    />
  );
}
