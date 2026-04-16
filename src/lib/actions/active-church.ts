"use server";

import { cookies } from "next/headers";
import { getServerSession } from "next-auth";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { memberships } from "@/db/schema";
import { authOptions } from "@/lib/auth";
import { ACTIVE_CHURCH_COOKIE } from "@/lib/active-church";

export async function setActiveChurch(churchId: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return { error: "Not authenticated" };
  }

  const membership = await db.query.memberships.findFirst({
    where: and(
      eq(memberships.userId, session.user.id),
      eq(memberships.churchId, churchId)
    ),
  });

  if (!membership) {
    return { error: "You do not belong to this church" };
  }

  const cookieStore = await cookies();
  cookieStore.set(ACTIVE_CHURCH_COOKIE, churchId, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });

  return { success: true };
}
