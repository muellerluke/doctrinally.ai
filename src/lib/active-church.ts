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

  let availableChurches: UserChurchSummary[] = userMemberships
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

  // Dev-only: include ALL churches so the switcher shows every church in
  // the database, not just the ones the user has memberships for.
  if (process.env.NODE_ENV === "development") {
    const allChurches = await db.query.churches.findMany({
      orderBy: asc(churches.name),
    });
    const memberChurchIds = new Set(availableChurches.map((c) => c.churchId));
    for (const c of allChurches) {
      if (!memberChurchIds.has(c.id)) {
        availableChurches.push({
          churchId: c.id,
          churchName: c.name,
          churchSlug: c.slug,
          role: "owner",
          membershipId: "dev-synthetic",
        });
      }
    }
  }

  const cookieStore = await cookies();
  const activeChurchId = cookieStore.get(ACTIVE_CHURCH_COOKIE)?.value;

  // Dev-only: allow impersonating any church, even without a real membership.
  // This lets developers view the admin experience of any church in the DB.
  if (process.env.NODE_ENV === "development" && activeChurchId) {
    const hasRealMembership = userMemberships.some(
      (m) => m.churchId === activeChurchId
    );
    if (!hasRealMembership) {
      const devChurch = await db.query.churches.findFirst({
        where: eq(churches.id, activeChurchId),
      });
      if (devChurch) {
        return {
          membership: {
            id: "dev-synthetic",
            userId,
            churchId: devChurch.id,
            role: "owner" as const,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
          church: devChurch,
          availableChurches,
        };
      }
    }
  }

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
