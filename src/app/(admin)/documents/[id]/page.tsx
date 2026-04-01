import { notFound } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Calendar,
  Edit,
  FileText,
  Layers,
  Mic,
  RefreshCw,
  RotateCcw,
  Tag,
  Trash2,
} from "lucide-react";
import { requireMembership } from "@/lib/auth-guards";
import { getDocumentById } from "@/lib/actions/documents";
import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DocumentStatusBadge } from "@/components/documents/document-status-badge";
import { DocumentDetailActions } from "@/components/documents/document-detail-actions";

const typeLabels: Record<string, string> = {
  youtube: "YouTube",
  video: "Video",
  pdf: "PDF",
  word: "Word",
  platejs: "Document",
};

interface DocumentDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function DocumentDetailPage({
  params,
}: DocumentDetailPageProps) {
  await requireMembership();

  const { id } = await params;
  const result = await getDocumentById(id);

  if ("error" in result) {
    notFound();
  }

  const { document: doc, chunkCount } = result;
  const metadata = (doc.metadata ?? {}) as Record<string, unknown>;
  const tags = (metadata.tags as string[]) ?? [];

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" render={<Link href="/documents" />} className="gap-1.5">
          <ArrowLeft className="h-4 w-4" />
          Documents
        </Button>
      </div>

      <PageHeader
        title={doc.title}
        description={doc.description ?? undefined}
        actions={
          <div className="flex items-center gap-2">
            {doc.type === "platejs" && (
              <Button size="sm" render={<Link href={`/documents/${doc.id}/edit`} />}>
                <Edit className="mr-1.5 h-4 w-4" />
                Edit
              </Button>
            )}
            <DocumentDetailActions
              documentId={doc.id}
              status={doc.status}
              type={doc.type}
            />
          </div>
        }
      />

      {/* Status and type badges */}
      <div className="flex flex-wrap items-center gap-3">
        <DocumentStatusBadge status={doc.status} />
        <Badge variant="outline" className="gap-1.5">
          <FileText className="h-3 w-3" />
          {typeLabels[doc.type] ?? doc.type}
        </Badge>
        <Badge variant="outline" className="gap-1.5">
          <Layers className="h-3 w-3" />
          {chunkCount} {chunkCount === 1 ? "chunk" : "chunks"} indexed
        </Badge>
      </div>

      {/* Error message for failed documents */}
      {doc.status === "failed" && doc.errorMessage && (
        <Card className="border-destructive/30 bg-destructive/5 p-4">
          <p className="text-sm font-medium text-destructive">
            Processing Error
          </p>
          <p className="mt-1 text-sm text-destructive/80">
            {doc.errorMessage}
          </p>
        </Card>
      )}

      {/* Metadata section */}
      <Card className="p-6">
        <h2 className="mb-4 font-heading text-lg font-semibold tracking-tight">
          Details
        </h2>
        <dl className="grid gap-4 sm:grid-cols-2">
          {typeof metadata.speaker === "string" && metadata.speaker && (
            <div className="flex items-start gap-2">
              <Mic className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
              <div>
                <dt className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Speaker / Author
                </dt>
                <dd className="mt-0.5 text-sm">{metadata.speaker}</dd>
              </div>
            </div>
          )}
          {typeof metadata.date === "string" && metadata.date && (
            <div className="flex items-start gap-2">
              <Calendar className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
              <div>
                <dt className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Date
                </dt>
                <dd className="mt-0.5 text-sm">{metadata.date}</dd>
              </div>
            </div>
          )}
          {doc.sourceUrl && (
            <div className="sm:col-span-2">
              <dt className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Source URL
              </dt>
              <dd className="mt-0.5 text-sm">
                <a
                  href={doc.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary underline-offset-4 hover:underline"
                >
                  {doc.sourceUrl}
                </a>
              </dd>
            </div>
          )}
          {tags.length > 0 && (
            <div className="sm:col-span-2">
              <div className="flex items-start gap-2">
                <Tag className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                <div>
                  <dt className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Tags
                  </dt>
                  <dd className="mt-1.5 flex flex-wrap gap-1.5">
                    {tags.map((tag) => (
                      <Badge key={tag} variant="secondary" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </dd>
                </div>
              </div>
            </div>
          )}
          <div>
            <dt className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Created
            </dt>
            <dd className="mt-0.5 text-sm text-muted-foreground">
              {new Date(doc.createdAt).toLocaleDateString("en-US", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Last Updated
            </dt>
            <dd className="mt-0.5 text-sm text-muted-foreground">
              {new Date(doc.updatedAt).toLocaleDateString("en-US", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </dd>
          </div>
        </dl>
      </Card>
    </div>
  );
}
