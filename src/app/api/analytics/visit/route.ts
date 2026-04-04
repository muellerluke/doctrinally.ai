import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { incrementVisitorCount } from "@/lib/usage";

export async function POST(request: Request) {
  const { churchId } = (await request.json()) as { churchId?: string };

  if (!churchId) {
    return NextResponse.json({ error: "churchId required" }, { status: 400 });
  }

  const cookieStore = await cookies();
  const cookieName = `__dv_${churchId.slice(0, 8)}`;
  const existing = cookieStore.get(cookieName);

  if (existing) {
    return NextResponse.json({ tracked: false });
  }

  await incrementVisitorCount(churchId);

  const response = NextResponse.json({ tracked: true });
  response.cookies.set(cookieName, "1", {
    maxAge: 86400, // 24 hours
    httpOnly: true,
    sameSite: "lax",
    path: "/",
  });

  return response;
}
