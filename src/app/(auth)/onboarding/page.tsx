import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { eq } from "drizzle-orm";
import { authOptions } from "@/lib/auth";
import { db } from "@/db";
import { memberships, churches, subscriptions } from "@/db/schema";
import { OnboardingClient } from "./onboarding-client";

export default async function OnboardingPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    redirect("/sign-in");
  }

  const membership = await db.query.memberships.findFirst({
    where: eq(memberships.userId, session.user.id),
  });

  let initialChurch: { name: string; slug: string } | null = null;

  if (membership) {
    const church = await db.query.churches.findFirst({
      where: eq(churches.id, membership.churchId),
    });

    if (church) {
      const sub = await db.query.subscriptions.findFirst({
        where: eq(subscriptions.churchId, church.id),
      });

      // Already on an active plan — nothing to do in onboarding.
      if (sub && (sub.status === "active" || sub.status === "trialing")) {
        redirect("/dashboard");
      }

      // Church exists but no active/trialing subscription — start at plan selection.
      initialChurch = { name: church.name, slug: church.slug };
    }
  }

  const appDomain = process.env.NEXT_PUBLIC_APP_DOMAIN || "doctrinally.ai";

  return (
    <OnboardingClient initialChurch={initialChurch} appDomain={appDomain} />
  );
}
