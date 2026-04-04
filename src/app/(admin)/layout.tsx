import { redirect } from "next/navigation";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { eq, and, lte, gte } from "drizzle-orm";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AdminSidebar } from "@/components/layouts/admin-sidebar";
import { AdminHeader } from "@/components/layouts/admin-header";
import { authOptions } from "@/lib/auth";
import { db } from "@/db";
import { memberships, churches, subscriptions, usageRecords } from "@/db/schema";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect("/sign-in");
  }

  const membership = await db.query.memberships.findFirst({
    where: eq(memberships.userId, session.user.id),
  });

  if (!membership) {
    redirect("/onboarding");
  }

  const church = await db.query.churches.findFirst({
    where: eq(churches.id, membership.churchId),
  });

  // If church exists but isn't active, redirect to complete onboarding
  if (church && !church.isActive) {
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

  return (
    <SidebarProvider>
      <AdminSidebar
        churchName={church?.name}
        plan={sub?.plan}
        subscriptionStatus={sub?.status}
        questionUsage={usage?.questions ?? 0}
        questionLimit={sub?.questionLimit ?? 0}
        uploadUsage={usage?.documentUploads ?? 0}
        uploadLimit={sub?.documentUploadLimit ?? 0}
        membershipRole={membership.role}
      />
      <SidebarInset>
        <AdminHeader userName={session.user.name} />
        <main className="flex-1 p-6">
          {needsSetup && (
            <div className="mb-6 flex items-center gap-2 rounded-lg border border-blue-500/30 bg-blue-50 px-4 py-3 text-sm text-blue-800 dark:border-blue-400/20 dark:bg-blue-950/40 dark:text-blue-300">
              <span className="font-medium">Finish setting up your church.</span>
              <Link
                href="/settings"
                className="underline underline-offset-2 hover:text-blue-900 dark:hover:text-blue-200"
              >
                Go to Settings
              </Link>
              <span className="text-blue-700 dark:text-blue-400">
                to add a description and complete your profile.
              </span>
            </div>
          )}
          {sub?.status === "past_due" && (
            <div className="mb-6 flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              <span className="font-medium">Payment past due.</span>
              <span className="text-amber-700">
                Please update your payment method in Billing to avoid service
                interruption.
              </span>
            </div>
          )}
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
