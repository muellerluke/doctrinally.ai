import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { eq } from "drizzle-orm";
import { put } from "@vercel/blob";
import { authOptions } from "@/lib/auth";
import { db } from "@/db";
import { documents, memberships } from "@/db/schema";
import { incrementDocumentUpload } from "@/lib/usage";

const MAX_FILE_SIZE: Record<string, number> = {
  "application/pdf": 50 * 1024 * 1024, // 50MB
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
    50 * 1024 * 1024,
  "video/mp4": 500 * 1024 * 1024, // 500MB
  "video/webm": 500 * 1024 * 1024,
  "video/quicktime": 500 * 1024 * 1024,
};

const MIME_TO_TYPE: Record<string, string> = {
  "application/pdf": "pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
    "word",
  "video/mp4": "video",
  "video/webm": "video",
  "video/quicktime": "video",
};

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const membership = await db.query.memberships.findFirst({
    where: eq(memberships.userId, session.user.id),
  });
  if (!membership) {
    return NextResponse.json({ error: "No church found" }, { status: 400 });
  }

  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  const title = formData.get("title") as string | null;
  const tags = formData.get("tags") as string | null;
  const folderId = formData.get("folderId") as string | null;

  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  if (!title || title.length < 2) {
    return NextResponse.json(
      { error: "Title is required (min 2 characters)" },
      { status: 400 }
    );
  }

  const mimeType = file.type;
  const docType = MIME_TO_TYPE[mimeType];
  if (!docType) {
    return NextResponse.json(
      { error: "Unsupported file type. Please upload a PDF, Word document, or video." },
      { status: 400 }
    );
  }

  const maxSize = MAX_FILE_SIZE[mimeType] ?? 50 * 1024 * 1024;
  if (file.size > maxSize) {
    return NextResponse.json(
      { error: `File is too large. Maximum size is ${Math.round(maxSize / 1024 / 1024)}MB.` },
      { status: 400 }
    );
  }

  // Upload to Vercel Blob
  const blob = await put(`documents/${membership.churchId}/${file.name}`, file, {
    access: "public",
  });

  // Insert document record
  const parsedTags = tags
    ? tags.split(",").map((t) => t.trim()).filter(Boolean)
    : [];

  const [doc] = await db
    .insert(documents)
    .values({
      churchId: membership.churchId,
      uploadedBy: session.user.id,
      title,
      type: docType as "pdf" | "word" | "video",
      status: "queued",
      blobPath: blob.url,
      folderId: folderId || null,
      metadata: { tags: parsedTags },
    })
    .returning({ id: documents.id });

  // Increment usage
  await incrementDocumentUpload(membership.churchId);

  return NextResponse.json({
    success: true,
    documentId: doc.id,
    blobUrl: blob.url,
  });
}
