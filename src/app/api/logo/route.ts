import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { eq } from "drizzle-orm";
import { put, del } from "@vercel/blob";
import { authOptions } from "@/lib/auth";
import { db } from "@/db";
import { churches, memberships } from "@/db/schema";

const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/webp", "image/svg+xml"];
const MAX_SIZE = 5 * 1024 * 1024; // 5MB

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const membership = await db.query.memberships.findFirst({
    where: eq(memberships.userId, session.user.id),
  });
  if (!membership || !["admin", "owner"].includes(membership.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const formData = await request.formData();
  const file = formData.get("file") as File | null;

  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json(
      { error: "Unsupported format. Use PNG, JPEG, WebP, or SVG." },
      { status: 400 }
    );
  }

  if (file.size > MAX_SIZE) {
    return NextResponse.json(
      { error: "File too large. Maximum size is 5MB." },
      { status: 400 }
    );
  }

  // Get current church to clean up old logo
  const church = await db.query.churches.findFirst({
    where: eq(churches.id, membership.churchId),
  });

  // Delete old logo blob if it exists
  if (church?.logoUrl) {
    try {
      await del(church.logoUrl);
    } catch {
      // Non-fatal if old blob can't be deleted
    }
  }

  // Upload new logo
  const blob = await put(
    `logos/${membership.churchId}/${file.name}`,
    file,
    { access: "public" }
  );

  // Update church record
  await db
    .update(churches)
    .set({ logoUrl: blob.url, updatedAt: new Date() })
    .where(eq(churches.id, membership.churchId));

  return NextResponse.json({ success: true, logoUrl: blob.url });
}
