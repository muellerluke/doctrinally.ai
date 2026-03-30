import { MessageSquare, Upload, Users, HelpCircle } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        description="Overview of your church's activity"
      />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Questions Asked"
          value={0}
          description="This month"
          icon={MessageSquare}
        />
        <StatCard
          title="Document Uploads"
          value={0}
          description="This month"
          icon={Upload}
        />
        <StatCard
          title="Visitors"
          value={0}
          description="This month"
          icon={Users}
        />
        <StatCard
          title="Unanswered Questions"
          value={0}
          description="This month"
          icon={HelpCircle}
        />
      </div>
    </div>
  );
}
