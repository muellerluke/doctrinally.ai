import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { memberships, churches, subscriptions } from "@/db/schema";
import { authOptions } from "@/lib/auth";

const roleHierarchy = { member: 0, admin: 1, owner: 2 } as const;
type Role = keyof typeof roleHierarchy;

export async function requireAuth() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    redirect("/sign-in");
  }
  return session;
}

export async function requireMembership() {
  const session = await requireAuth();

  const membership = await db.query.memberships.findFirst({
    where: eq(memberships.userId, session.user.id),
  });

  if (!membership) {
    redirect("/onboarding");
  }

  const church = await db.query.churches.findFirst({
    where: eq(churches.id, membership.churchId),
  });

  if (!church) {
    redirect("/onboarding");
  }

  return { session, membership, church };
}

export async function requireRole(minRole: Role) {
  const result = await requireMembership();
  const userLevel = roleHierarchy[result.membership.role as Role] ?? 0;
  const requiredLevel = roleHierarchy[minRole];

  if (userLevel < requiredLevel) {
    return { ...result, authorized: false as const };
  }

  return { ...result, authorized: true as const };
}

export async function requireOwner() {
  return requireRole("owner");
}

export async function requireAdmin() {
  return requireRole("admin");
}

export async function getSubscriptionForChurch(churchId: string) {
  return db.query.subscriptions.findFirst({
    where: eq(subscriptions.churchId, churchId),
  });
}
