import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { memberships } from "@/db/schema";
import { authOptions } from "@/lib/auth";
import { getDomainStatus } from "@/lib/vercel";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const domain = searchParams.get("domain");

  if (!domain) {
    return NextResponse.json({ error: "domain required" }, { status: 400 });
  }

  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Verify user is admin/owner
  const membership = await db.query.memberships.findFirst({
    where: eq(memberships.userId, session.user.id),
  });

  if (!membership || !["admin", "owner"].includes(membership.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const status = await getDomainStatus(domain);

  return NextResponse.json(status);
}
