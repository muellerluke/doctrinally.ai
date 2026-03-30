import { Settings } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Settings"
        description="Manage your church's profile, branding, and domain configuration"
      />
      <EmptyState
        icon={Settings}
        title="Settings coming soon"
        description="You'll be able to configure your church's name, logo, description, and domain settings here."
      />
    </div>
  );
}
