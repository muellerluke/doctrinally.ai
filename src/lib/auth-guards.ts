import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { subscriptions } from "@/db/schema";
import { authOptions } from "@/lib/auth";
import { getActiveMembershipForUser } from "@/lib/active-church";

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

  const active = await getActiveMembershipForUser(session.user.id);

  if (!active) {
    redirect("/onboarding");
  }

  return {
    session,
    membership: active.membership,
    church: active.church,
    availableChurches: active.availableChurches,
  };
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

const SUPER_ADMIN_EMAIL = "luke@doctrinally.ai";

export async function requireSuperAdmin() {
  const session = await requireAuth();
  if (session.user.email !== SUPER_ADMIN_EMAIL) {
    return null;
  }
  return session;
}

export async function getSubscriptionForChurch(churchId: string) {
  return db.query.subscriptions.findFirst({
    where: eq(subscriptions.churchId, churchId),
  });
}
