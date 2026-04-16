import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import {
  ExternalLink,
  Shield,
  CreditCard,
  TrendingUp,
  AlertTriangle,
  Check,
  Sparkles,
} from "lucide-react";
import { authOptions } from "@/lib/auth";
import { getActiveMembershipForUser } from "@/lib/active-church";
import {
  getSubscriptionWithUsage,
  createBillingPortalSession,
} from "@/lib/actions/billing";
import { PLANS } from "@/lib/plans";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { UsageDisplay } from "@/components/billing/usage-display";
import { OverageControl } from "@/components/billing/overage-control";
import { BillingPortalButton } from "./billing-portal-button";

export default async function BillingPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/sign-in");

  const active = await getActiveMembershipForUser(session.user.id);

  if (!active) redirect("/onboarding");

  const { membership } = active;

  // Owner-only access
  if (membership.role !== "owner") {
    return (
      <div className="space-y-8">
        <PageHeader
          title="Billing"
          description="Manage your subscription and view usage"
        />
        <EmptyState
          icon={Shield}
          title="Owner access required"
          description="Only church owners can view and manage billing. Contact your church owner for billing inquiries."
        />
      </div>
    );
  }

  const data = await getSubscriptionWithUsage(membership.churchId);

  if (!data) {
    return (
      <div className="space-y-8">
        <PageHeader
          title="Billing"
          description="Manage your subscription and view usage"
        />
        <EmptyState
          icon={CreditCard}
          title="No active subscription"
          description="Set up a subscription to activate your church and start using Doctrinally.AI."
        />
      </div>
    );
  }

  const statusColors: Record<string, string> = {
    active: "border-green-500/30 bg-green-500/10 text-green-700",
    past_due: "border-amber-500/30 bg-amber-500/10 text-amber-700",
    canceled: "border-destructive/30 bg-destructive/10 text-destructive",
    trialing: "border-blue-500/30 bg-blue-500/10 text-blue-700",
    incomplete: "border-muted-foreground/30 bg-muted text-muted-foreground",
  };

  const statusLabels: Record<string, string> = {
    active: "Active",
    past_due: "Past due",
    canceled: "Canceled",
    trialing: "Trial",
    incomplete: "Incomplete",
  };

  return (
    <div className="space-y-8">
      <PageHeader
        title="Billing"
        description="Manage your subscription, view usage, and track overage"
      />

      {data.status === "trialing" && data.currentPeriodEnd && (
        <div className="flex items-start gap-3 rounded-lg border border-blue-500/30 bg-blue-50 p-4 text-sm text-blue-900 dark:border-blue-400/20 dark:bg-blue-950/40 dark:text-blue-100">
          <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-blue-600 dark:text-blue-300" />
          <div className="flex-1">
            <p className="font-medium">You&apos;re on a free trial</p>
            <p className="mt-0.5 text-blue-800 dark:text-blue-200/80">
              Your card will be charged ${data.planPrice} on{" "}
              {data.currentPeriodEnd.toLocaleDateString(undefined, {
                month: "long",
                day: "numeric",
                year: "numeric",
              })}{" "}
              unless you cancel. Trial limits: {data.documentUploadLimit}{" "}
              document uploads and {data.questionLimit} messages.
            </p>
          </div>
        </div>
      )}

      {data.status === "past_due" && (
        <div className="flex items-center gap-3 rounded-lg border border-amber-500/30 bg-amber-50 p-4 text-sm text-amber-800">
          <AlertTriangle className="h-5 w-5 shrink-0" />
          <div>
            <p className="font-medium">Payment past due</p>
            <p className="mt-0.5 text-amber-700">
              Your last payment failed. Please update your payment method to
              avoid service interruption.
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Current Plan */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle className="text-lg">Current Plan</CardTitle>
            <Badge className={statusColors[data.status] ?? statusColors.incomplete}>
              {statusLabels[data.status] ?? data.status}
            </Badge>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-baseline gap-2">
              <span className="font-heading text-3xl">{data.planName}</span>
              <span className="text-lg text-muted-foreground">
                ${data.planPrice}/mo
              </span>
            </div>
            {data.currentPeriodStart && data.currentPeriodEnd && (
              <p className="text-sm text-muted-foreground">
                Current period:{" "}
                {data.currentPeriodStart.toLocaleDateString()} &ndash;{" "}
                {data.currentPeriodEnd.toLocaleDateString()}
              </p>
            )}
            <Separator />
            <BillingPortalButton />
          </CardContent>
        </Card>

        {/* Overage Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Estimated Overage</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="font-heading text-3xl">
              ${data.totalOverageCost.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">
              This billing period
            </p>
            {data.totalOverageCost > 0 && (
              <div className="space-y-1 text-xs text-muted-foreground">
                {data.uploadOverageCost > 0 && (
                  <p>
                    Uploads: ${data.uploadOverageCost.toFixed(2)} (
                    {data.uploadOverage} over)
                  </p>
                )}
                {data.questionOverageCost > 0 && (
                  <p>
                    Messages: ${data.questionOverageCost.toFixed(2)} (
                    {data.questionOverage} over)
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Usage This Period */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <TrendingUp className="h-5 w-5 text-muted-foreground" />
            Usage This Period
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <UsageDisplay
            label="Document Uploads"
            current={data.documentUploads}
            limit={data.documentUploadLimit}
            overageCost={data.uploadOverageCost}
          />
          <UsageDisplay
            label="Messages"
            current={data.questions}
            limit={data.questionLimit}
            overageCost={data.questionOverageCost}
          />
        </CardContent>
      </Card>

      {/* Message Overage Control */}
      <OverageControl
        churchId={membership.churchId}
        enabled={data.messageOverageEnabled}
        cap={data.messageOverageCap}
        questionLimit={data.questionLimit}
      />

      {/* Plan Comparison for Standard (hidden during trial to keep focus on conversion) */}
      {data.plan === "standard" && data.status !== "trialing" && (
        <Card className="border-primary/20 bg-primary/[0.02]">
          <CardHeader>
            <CardTitle className="text-lg">
              Unlock more with Enterprise
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-3">
                <p className="text-sm font-medium text-muted-foreground">
                  Enterprise includes everything in Standard, plus:
                </p>
                {PLANS.enterprise.highlights
                  .filter(
                    (h) =>
                      !PLANS.standard.highlights.some(
                        (sh) =>
                          sh.replace(/[\d,]+/, "") === h.replace(/[\d,]+/, "")
                      )
                  )
                  .map((highlight) => (
                    <div
                      key={highlight}
                      className="flex items-start gap-2 text-sm"
                    >
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                      <span>{highlight}</span>
                    </div>
                  ))}
              </div>
              <div className="space-y-3">
                <p className="text-sm font-medium text-muted-foreground">
                  Higher limits:
                </p>
                <div className="space-y-2 text-sm">
                  <p>
                    {PLANS.enterprise.documentUploadLimit} document uploads/mo
                    (vs {PLANS.standard.documentUploadLimit})
                  </p>
                  <p>
                    {PLANS.enterprise.questionLimit.toLocaleString()} messages/mo
                    (vs {PLANS.standard.questionLimit})
                  </p>
                </div>
                <p className="font-heading text-xl">
                  ${PLANS.enterprise.price}/mo
                </p>
                <BillingPortalButton label="Upgrade plan" />
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
