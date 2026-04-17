"use server";

import { getServerSession } from "next-auth";
import { eq, and, ilike, isNull, sql, count } from "drizzle-orm";
import { del } from "@vercel/blob";
import { tasks } from "@trigger.dev/sdk/v3";
import { db } from "@/db";
import { documents, chunks } from "@/db/schema";
import { authOptions } from "@/lib/auth";
import { getActiveMembershipForUser } from "@/lib/active-church";
import {
  youtubeUploadSchema,
  platejsDocumentSchema,
  documentMetadataSchema,
  type YouTubeUploadInput,
  type PlatejsDocumentInput,
  type DocumentMetadataInput,
} from "@/lib/validations/documents";

const DOC_TYPE_TO_TASK: Record<string, string> = {
  youtube: "process-youtube",
  pdf: "process-pdf",
  word: "process-word",
  video: "process-video",
  platejs: "process-platejs",
};

async function triggerProcessing(docType: string, documentId: string) {
  const taskId = DOC_TYPE_TO_TASK[docType];
  if (!taskId) return;
  try {
    await tasks.trigger(taskId, { documentId });
  } catch (err) {
    console.error(`Failed to trigger ${taskId} for ${documentId}:`, err);
  }
}

async function getAuthContext() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return null;

  const active = await getActiveMembershipForUser(session.user.id);
  if (!active) return null;

  return { userId: session.user.id, membership: active.membership };
}

export async function getDocuments(filters: {
  churchId: string;
  search?: string;
  type?: string;
  status?: string;
  folderId?: string | null;
  page?: number;
  pageSize?: number;
}) {
  const ctx = await getAuthContext();
  if (!ctx) return { error: "Unauthorized" };

  const { churchId, search, type, status, folderId, page, pageSize } = filters;

  if (ctx.membership.churchId !== churchId) {
    return { error: "Unauthorized" };
  }

  const conditions = [eq(documents.churchId, churchId)];

  if (search) {
    conditions.push(ilike(documents.title, `%${search}%`));
  }

  if (type) {
    conditions.push(eq(documents.type, type as typeof documents.type.enumValues[number]));
  }

  if (status) {
    conditions.push(eq(documents.status, status as typeof documents.status.enumValues[number]));
  }

  if (folderId === null) {
    conditions.push(isNull(documents.folderId));
  } else if (folderId !== undefined) {
    conditions.push(eq(documents.folderId, folderId));
  }

  const where = and(...conditions);

  // When page/pageSize aren't specified, return all matching documents.
  // The document library uses TanStack Table for client-side pagination,
  // so it needs the full set.
  if (page != null && pageSize != null) {
    const [rows, totalResult] = await Promise.all([
      db
        .select()
        .from(documents)
        .where(where)
        .orderBy(documents.createdAt)
        .limit(pageSize)
        .offset((page - 1) * pageSize),
      db.select({ total: count() }).from(documents).where(where),
    ]);

    return {
      documents: rows,
      total: totalResult[0]?.total ?? 0,
    };
  }

  const rows = await db
    .select()
    .from(documents)
    .where(where)
    .orderBy(documents.createdAt);

  return {
    documents: rows,
    total: rows.length,
  };
}

/**
 * Client-side fallback for the Vercel Blob webhook. After the browser
 * finishes uploading bytes to blob storage, it calls this with the
 * correlation `uploadId` (stored in the document's metadata during
 * Phase 1) and the final blob URL. If the webhook already updated the
 * row, this is a no-op.
 */
export async function confirmBlobUpload(uploadId: string, blobUrl: string) {
  const ctx = await getAuthContext();
  if (!ctx) return { error: "Unauthorized" };

  if (!uploadId || !blobUrl) return { error: "Missing uploadId or blobUrl" };

  // Find the document by the uploadId stored in metadata.
  // The JSONB query ensures exact match even with concurrent uploads.
  const [doc] = await db
    .select({ id: documents.id, type: documents.type, status: documents.status })
    .from(documents)
    .where(
      and(
        eq(documents.churchId, ctx.membership.churchId),
        sql`${documents.metadata}->>'uploadId' = ${uploadId}`
      )
    )
    .limit(1);

  if (!doc) return { error: "Document not found for this upload" };

  // If the webhook already set blobPath and moved status past "uploaded",
  // there's nothing to do — avoid triggering a duplicate processing job.
  if (doc.status !== "uploaded") {
    return { success: true, alreadyHandled: true };
  }

  // Update blobPath and queue for processing.
  await db
    .update(documents)
    .set({
      blobPath: blobUrl,
      status: "queued",
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(documents.id, doc.id),
        // Re-check status to prevent race with webhook
        eq(documents.status, "uploaded")
      )
    );

  await triggerProcessing(doc.type, doc.id);

  return { success: true };
}

export async function createYouTubeDocument(input: YouTubeUploadInput) {
  const ctx = await getAuthContext();
  if (!ctx) return { error: "Unauthorized" };

  const parsed = youtubeUploadSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const { title, sourceUrl, tags, folderId } = parsed.data;

  const [doc] = await db
    .insert(documents)
    .values({
      churchId: ctx.membership.churchId,
      uploadedBy: ctx.userId,
      title,
      type: "youtube",
      status: "queued",
      sourceUrl,
      folderId: folderId ?? null,
      metadata: { tags: tags ?? [] },
    })
    .returning({ id: documents.id });

  await triggerProcessing("youtube", doc.id);

  return { success: true, documentId: doc.id };
}

export async function createPlatejsDocument(input: PlatejsDocumentInput) {
  const ctx = await getAuthContext();
  if (!ctx) return { error: "Unauthorized" };

  const parsed = platejsDocumentSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const { title, content, tags, folderId } = parsed.data;

  const [doc] = await db
    .insert(documents)
    .values({
      churchId: ctx.membership.churchId,
      uploadedBy: ctx.userId,
      title,
      type: "platejs",
      status: "draft",
      content: content ?? "",
      folderId: folderId ?? null,
      metadata: { tags: tags ?? [] },
    })
    .returning({ id: documents.id });

  return { success: true, documentId: doc.id };
}

export async function savePlatejsDocument(documentId: string, content: string) {
  const ctx = await getAuthContext();
  if (!ctx) return { error: "Unauthorized" };

  const doc = await db.query.documents.findFirst({
    where: and(
      eq(documents.id, documentId),
      eq(documents.churchId, ctx.membership.churchId)
    ),
  });

  if (!doc) return { error: "Document not found" };

  await db
    .update(documents)
    .set({ content, updatedAt: new Date() })
    .where(eq(documents.id, documentId));

  return { success: true };
}

export async function publishPlatejsDocument(documentId: string) {
  const ctx = await getAuthContext();
  if (!ctx) return { error: "Unauthorized" };

  const doc = await db.query.documents.findFirst({
    where: and(
      eq(documents.id, documentId),
      eq(documents.churchId, ctx.membership.churchId)
    ),
  });

  if (!doc) return { error: "Document not found" };

  await db
    .update(documents)
    .set({ status: "queued", updatedAt: new Date() })
    .where(eq(documents.id, documentId));

  await triggerProcessing("platejs", documentId);

  return { success: true };
}

export async function updateDocumentMetadata(
  documentId: string,
  input: DocumentMetadataInput
) {
  const ctx = await getAuthContext();
  if (!ctx) return { error: "Unauthorized" };

  const parsed = documentMetadataSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const doc = await db.query.documents.findFirst({
    where: and(
      eq(documents.id, documentId),
      eq(documents.churchId, ctx.membership.churchId)
    ),
  });

  if (!doc) return { error: "Document not found" };

  const { title, tags } = parsed.data;

  const existingMetadata = (doc.metadata ?? {}) as Record<string, unknown>;

  await db
    .update(documents)
    .set({
      ...(title !== undefined && { title }),
      metadata: {
        ...existingMetadata,
        ...(tags !== undefined && { tags }),
      },
      updatedAt: new Date(),
    })
    .where(eq(documents.id, documentId));

  return { success: true };
}

export async function deleteDocument(documentId: string) {
  const ctx = await getAuthContext();
  if (!ctx) return { error: "Unauthorized" };

  const doc = await db.query.documents.findFirst({
    where: and(
      eq(documents.id, documentId),
      eq(documents.churchId, ctx.membership.churchId)
    ),
  });

  if (!doc) return { error: "Document not found" };

  if (doc.blobPath) {
    try {
      await del(doc.blobPath);
    } catch {
      // Continue with deletion even if blob removal fails
    }
  }

  await db.delete(documents).where(eq(documents.id, documentId));

  return { success: true };
}

export async function retryDocument(documentId: string) {
  const ctx = await getAuthContext();
  if (!ctx) return { error: "Unauthorized" };

  const doc = await db.query.documents.findFirst({
    where: and(
      eq(documents.id, documentId),
      eq(documents.churchId, ctx.membership.churchId)
    ),
  });

  if (!doc) return { error: "Document not found" };
  if (doc.status !== "failed") return { error: "Only failed documents can be retried" };

  await db
    .update(documents)
    .set({ status: "queued", errorMessage: null, updatedAt: new Date() })
    .where(eq(documents.id, documentId));

  await triggerProcessing(doc.type, documentId);

  return { success: true };
}

export async function reprocessDocument(documentId: string) {
  const ctx = await getAuthContext();
  if (!ctx) return { error: "Unauthorized" };

  const doc = await db.query.documents.findFirst({
    where: and(
      eq(documents.id, documentId),
      eq(documents.churchId, ctx.membership.churchId)
    ),
  });

  if (!doc) return { error: "Document not found" };
  if (doc.status !== "indexed") return { error: "Only indexed documents can be reprocessed" };

  await db.delete(chunks).where(eq(chunks.documentId, documentId));

  await db
    .update(documents)
    .set({ status: "queued", updatedAt: new Date() })
    .where(eq(documents.id, documentId));

  await triggerProcessing(doc.type, documentId);

  return { success: true };
}

export async function getDocumentById(documentId: string) {
  const ctx = await getAuthContext();
  if (!ctx) return { error: "Unauthorized" };

  const doc = await db.query.documents.findFirst({
    where: and(
      eq(documents.id, documentId),
      eq(documents.churchId, ctx.membership.churchId)
    ),
  });

  if (!doc) return { error: "Document not found" };

  const [chunkCountResult] = await db
    .select({ chunkCount: count() })
    .from(chunks)
    .where(eq(chunks.documentId, documentId));

  return {
    document: doc,
    chunkCount: chunkCountResult?.chunkCount ?? 0,
  };
}
