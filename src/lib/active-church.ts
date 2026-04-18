import { cookies } from "next/headers";
import { asc, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { memberships, churches, users } from "@/db/schema";
import { isSuperAdminEmail } from "@/lib/super-admin";

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
  // Look up the user's email so we can grant super-admin cross-church
  // impersonation in production. One extra indexed PK lookup per call —
  // cheap compared to the memberships/churches queries below.
  const userRow = await db.query.users.findFirst({
    where: eq(users.id, userId),
    columns: { email: true },
  });
  const isSuperAdmin = isSuperAdminEmail(userRow?.email);

  // In dev we always open up cross-church access for easier debugging.
  // In production the same powers are restricted to the platform
  // super-admin (luke@doctrinally.ai).
  const allowAllChurches =
    process.env.NODE_ENV === "development" || isSuperAdmin;

  const userMemberships = await db.query.memberships.findMany({
    where: eq(memberships.userId, userId),
    orderBy: asc(memberships.createdAt),
  });

  // Super-admin may have no real memberships at all — still allow the
  // church switcher + impersonation path to kick in.
  if (userMemberships.length === 0 && !allowAllChurches) return null;

  const churchIds = userMemberships.map((m) => m.churchId);
  const churchRows =
    churchIds.length > 0
      ? await db.query.churches.findMany({
          where: inArray(churches.id, churchIds),
        })
      : [];
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

  // Show every church in the DB — not just ones the user has a real
  // membership for — so the switcher works as an impersonation entry
  // point. Gated on `allowAllChurches` so this only fires in dev or
  // for the super-admin in prod.
  if (allowAllChurches) {
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

  // Allow impersonating any church without a real membership — same
  // gating as above (`allowAllChurches`). Returns a synthetic owner-role
  // membership so downstream admin pages render normally.
  if (allowAllChurches && activeChurchId) {
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

  // If we reach here with no real memberships, only the super-admin
  // (or dev) gets a default synthetic landing — pick the first church
  // alphabetically so the admin shell has something to render.
  if (userMemberships.length === 0) {
    if (!allowAllChurches) return null;
    const fallback = availableChurches[0];
    if (!fallback) return null;
    const fallbackChurch = await db.query.churches.findFirst({
      where: eq(churches.id, fallback.churchId),
    });
    if (!fallbackChurch) return null;
    return {
      membership: {
        id: "dev-synthetic",
        userId,
        churchId: fallbackChurch.id,
        role: "owner" as const,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      church: fallbackChurch,
      availableChurches,
    };
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
