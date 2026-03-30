import { UserCog } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";

export default function UserManagementPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        title="User Management"
        description="Manage admin access and invitations for your church"
        actions={<Button>Invite user</Button>}
      />
      <EmptyState
        icon={UserCog}
        title="No other users"
        description="Invite admins and other team members to help manage your church."
        action={<Button variant="outline">Send an invitation</Button>}
      />
    </div>
  );
}
