import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getActiveMembershipForUser } from "@/lib/active-church";
import { getDomainStatus, getDomainConfig } from "@/lib/vercel";

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

  const active = await getActiveMembershipForUser(session.user.id);

  if (!active || !["admin", "owner"].includes(active.membership.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const [status, config] = await Promise.all([
    getDomainStatus(domain),
    getDomainConfig(domain),
  ]);

  return NextResponse.json({
    ...status,
    ...config,
  });
}
