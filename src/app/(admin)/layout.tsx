import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { eq, and, lte, gte } from "drizzle-orm";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AdminSidebar } from "@/components/layouts/admin-sidebar";
import { AdminHeader } from "@/components/layouts/admin-header";
import { AdminBanners } from "@/components/layouts/admin-banners";
import { UploadProvider } from "@/components/documents/upload-provider";
import { UploadProgress } from "@/components/documents/upload-progress";
import { authOptions } from "@/lib/auth";
import { db } from "@/db";
import { subscriptions, usageRecords } from "@/db/schema";
import { getActiveMembershipForUser } from "@/lib/active-church";
import { hasSermonWriter } from "@/lib/plans";
import { isEmbeddedChatAvailable } from "@/lib/plan-gating";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect("/sign-in");
  }

  const active = await getActiveMembershipForUser(session.user.id);

  if (!active) {
    redirect("/onboarding");
  }

  const { membership, church, availableChurches } = active;

  // If church exists but isn't active, redirect to complete onboarding.
  // Skip for dev-synthetic memberships so devs can view inactive churches.
  if (membership.id !== "dev-synthetic" && church && !church.isActive) {
    const sub = await db.query.subscriptions.findFirst({
      where: eq(subscriptions.churchId, church.id),
    });
    if (!sub || sub.status === "incomplete") {
      redirect("/onboarding");
    }
  }

  const needsSetup = church && !church.description;

  // Fetch subscription and usage data for sidebar
  const sub = await db.query.subscriptions.findFirst({
    where: eq(subscriptions.churchId, membership.churchId),
  });

  const now = new Date();
  const usage = sub
    ? await db.query.usageRecords.findFirst({
        where: and(
          eq(usageRecords.churchId, membership.churchId),
          lte(usageRecords.periodStart, now),
          gte(usageRecords.periodEnd, now)
        ),
      })
    : null;

  // Resolves plan-gating AND the `embedded_chat` feature flag. The
  // Prospects nav and other widget-related UI only appear when both
  // are satisfied; super-admin can turn the widget off for a specific
  // church without changing their plan.
  const hasEmbedWidget = sub
    ? await isEmbeddedChatAvailable(membership.churchId, sub.plan)
    : false;

  return (
    <UploadProvider>
    <SidebarProvider>
      <AdminSidebar
        churchName={church?.name}
        plan={sub?.plan}
        subscriptionStatus={sub?.status}
        questionUsage={usage?.questions ?? 0}
        questionLimit={sub?.questionLimit ?? 0}
        membershipRole={membership.role}
        trialEndsAt={
          sub?.status === "trialing" ? sub?.currentPeriodEnd ?? null : null
        }
        messageOverageEnabled={sub?.messageOverageEnabled ?? false}
        messageOverageCap={sub?.messageOverageCap ?? 0}
        availableChurches={availableChurches}
        activeChurchId={church.id}
        hasSermonWriter={hasSermonWriter(sub?.plan)}
        sermonBudgetCents={sub?.sermonBudgetCents ?? 0}
        sermonSpentCents={usage?.sermonTokensCents ?? 0}
        hasEmbedWidget={hasEmbedWidget}
      />
      <SidebarInset className="h-svh overflow-hidden">
        <AdminHeader userName={session.user.name} />
        <main className="flex min-h-0 flex-1 flex-col overflow-y-auto p-6">
          <AdminBanners
            needsSetup={!!needsSetup}
            pastDue={sub?.status === "past_due"}
          />
          {children}
        </main>
      </SidebarInset>
      <UploadProgress />
    </SidebarProvider>
    </UploadProvider>
  );
}
