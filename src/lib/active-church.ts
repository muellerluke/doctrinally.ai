import { cookies } from "next/headers";
import { asc, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { memberships, churches } from "@/db/schema";

export const ACTIVE_CHURCH_COOKIE = "activeChurchId";

export type UserChurchSummary = {
  churchId: string;
  churchName: string;
  churchSlug: string;
  role: "owner" | "admin" | "member";
  membershipId: string;
};

export type ActiveMembershipResult = {
  membership: typeof memberships.$inferSelect;
  church: typeof churches.$inferSelect;
  availableChurches: UserChurchSummary[];
} | null;

export async function getActiveMembershipForUser(
  userId: string
): Promise<ActiveMembershipResult> {
  const userMemberships = await db.query.memberships.findMany({
    where: eq(memberships.userId, userId),
    orderBy: asc(memberships.createdAt),
  });

  if (userMemberships.length === 0) return null;

  const churchIds = userMemberships.map((m) => m.churchId);
  const churchRows = await db.query.churches.findMany({
    where: inArray(churches.id, churchIds),
  });
  const churchById = new Map(churchRows.map((c) => [c.id, c]));

  const availableChurches: UserChurchSummary[] = userMemberships
    .map((m) => {
      const c = churchById.get(m.churchId);
      if (!c) return null;
      return {
        churchId: c.id,
        churchName: c.name,
        churchSlug: c.slug,
        role: m.role,
        membershipId: m.id,
      };
    })
    .filter((x): x is UserChurchSummary => x !== null);

  const cookieStore = await cookies();
  const activeChurchId = cookieStore.get(ACTIVE_CHURCH_COOKIE)?.value;

  const active =
    (activeChurchId && userMemberships.find((m) => m.churchId === activeChurchId)) ||
    userMemberships[0];

  const activeChurch = churchById.get(active.churchId);
  if (!activeChurch) return null;

  return {
    membership: active,
    church: activeChurch,
    availableChurches,
  };
}
