import { Users } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";

export default function MembersPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Member Directory"
        description="Members who have signed up for your church's chat experience"
      />
      <EmptyState
        icon={Users}
        title="No members yet"
        description="Members will appear here once they sign up through your church's chat page."
      />
    </div>
  );
}
