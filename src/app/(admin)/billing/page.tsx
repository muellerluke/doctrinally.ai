import { CreditCard } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";

export default function BillingPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        title="Billing"
        description="Manage your subscription and view usage"
      />
      <EmptyState
        icon={CreditCard}
        title="Billing coming soon"
        description="You'll be able to view your subscription plan, usage limits, overage, and manage billing through Stripe here."
      />
    </div>
  );
}
