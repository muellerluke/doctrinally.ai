import { FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";

export default function DocumentsPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        title="Documents"
        description="Manage your church's content library"
        actions={<Button>Upload</Button>}
      />
      <EmptyState
        icon={FileText}
        title="No documents yet"
        description="Upload your first document to get started. The AI will index it automatically for chat retrieval."
        action={<Button>Upload your first document</Button>}
      />
    </div>
  );
}
