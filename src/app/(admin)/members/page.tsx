import { Users } from "lucide-react";
import { requireMembership } from "@/lib/auth-guards";
import { getChurchMembers } from "@/lib/actions/users";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { MembersDirectoryTable } from "./members-directory-table";

export default async function MembersPage() {
  const { church } = await requireMembership();
  const members = await getChurchMembers(church.id);

  return (
    <div className="space-y-8">
      <PageHeader
        title="Member Directory"
        description="Members who have signed up for your church's chat experience"
      />
      {members.length > 0 ? (
        <MembersDirectoryTable members={members} />
      ) : (
        <EmptyState
          icon={Users}
          title="No members yet"
          description="Members will appear here once they sign up through your church's chat page."
        />
      )}
    </div>
  );
}
