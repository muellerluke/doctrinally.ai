import { requireMembership } from "@/lib/auth-guards";
import { getChurchMembers, getChurchInvitations } from "@/lib/actions/users";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MembersTable } from "@/components/users/members-table";
import { InvitationsTable } from "@/components/users/invitations-table";
import { UserManagementActions } from "./user-management-actions";
import { UserCog, Mail } from "lucide-react";

export default async function UserManagementPage() {
  const { session, membership, church } = await requireMembership();
  const isOwner = membership.role === "owner";

  const [members, pendingInvitations] = await Promise.all([
    getChurchMembers(church.id),
    getChurchInvitations(church.id),
  ]);

  return (
    <div className="space-y-8">
      <PageHeader
        title="User Management"
        description="Manage admin access and invitations for your church"
        actions={
          isOwner ? (
            <UserManagementActions churchId={church.id} />
          ) : undefined
        }
      />

      {/* Members section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <UserCog className="h-5 w-5 text-muted-foreground" />
            Members ({members.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {members.length > 0 ? (
            <MembersTable
              members={members}
              isOwner={isOwner}
              currentUserId={session.user.id}
            />
          ) : (
            <EmptyState
              icon={UserCog}
              title="No members"
              description="Invite users to your church to get started."
            />
          )}
        </CardContent>
      </Card>

      {/* Invitations section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Mail className="h-5 w-5 text-muted-foreground" />
            Pending Invitations ({pendingInvitations.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {pendingInvitations.length > 0 ? (
            <InvitationsTable
              invitations={pendingInvitations}
              isOwner={isOwner}
            />
          ) : (
            <EmptyState
              icon={Mail}
              title="No pending invitations"
              description="All invitations have been accepted or there are none yet."
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
