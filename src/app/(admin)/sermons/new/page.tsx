import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { eq } from "drizzle-orm";
import { authOptions } from "@/lib/auth";
import { getActiveMembershipForUser } from "@/lib/active-church";
import { db } from "@/db";
import { subscriptions } from "@/db/schema";
import { hasSermonWriter } from "@/lib/plans";
import { createSermon } from "@/lib/actions/sermons";

export const dynamic = "force-dynamic";

/**
 * Server-rendered route that creates a fresh sermon + chat session, then
 * redirects to the workspace. Using a page instead of an action URL so the
 * redirect is visible in the browser history.
 */
export default async function NewSermonPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/sign-in");

  const active = await getActiveMembershipForUser(session.user.id);
  if (!active) redirect("/onboarding");

  const sub = await db.query.subscriptions.findFirst({
    where: eq(subscriptions.churchId, active.membership.churchId),
  });
  if (!hasSermonWriter(sub?.plan)) {
    redirect("/sermons");
  }

  const result = await createSermon();
  if ("error" in result || !result.documentId) {
    redirect("/sermons");
  }

  redirect(`/sermons/${result.documentId}/edit`);
}
