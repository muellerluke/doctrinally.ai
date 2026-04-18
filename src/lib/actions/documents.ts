"use server";

import { getServerSession } from "next-auth";
import { eq, and, ilike, isNull, sql, count } from "drizzle-orm";
import { after } from "next/server";
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
import { type UploadDocType } from "@/lib/documents/mime";

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
 * Shared insert-or-skip helper for direct-upload documents. Called from
 * both the Vercel Blob webhook (`onUploadCompleted`) and the client-side
 * fallback `confirmBlobUpload`. Idempotent via the correlation `uploadId`:
 * if a row with that id already exists for the church, returns the
 * existing id without inserting or re-triggering processing.
 */
export async function upsertUploadedDocument(input: {
  churchId: string;
  uploadedBy: string;
  title: string;
  docType: UploadDocType;
  folderId: string | null;
  tags: string[];
  uploadId: string;
  blobPath: string;
}): Promise<{ id: string; alreadyExisted: boolean }> {
  const [existing] = await db
    .select({ id: documents.id })
    .from(documents)
    .where(
      and(
        eq(documents.churchId, input.churchId),
        sql`${documents.metadata}->>'uploadId' = ${input.uploadId}`
      )
    )
    .limit(1);

  if (existing) {
    return { id: existing.id, alreadyExisted: true };
  }

  const [inserted] = await db
    .insert(documents)
    .values({
      churchId: input.churchId,
      uploadedBy: input.uploadedBy,
      title: input.title,
      type: input.docType,
      status: "queued",
      blobPath: input.blobPath,
      folderId: input.folderId,
      metadata: { tags: input.tags, uploadId: input.uploadId },
    })
    .returning({ id: documents.id });

  await triggerProcessing(input.docType, inserted.id);

  return { id: inserted.id, alreadyExisted: false };
}

/**
 * Client-side fallback for the Vercel Blob webhook. After the browser
 * finishes uploading bytes to blob storage, it calls this with the
 * correlation `uploadId`, the final blob URL, and the metadata the
 * client collected from the user. If the webhook already inserted the
 * row, this is a no-op.
 */
export async function confirmBlobUpload(input: {
  uploadId: string;
  blobUrl: string;
  title: string;
  tags: string[];
  folderId: string | null;
  docType: UploadDocType;
}) {
  const ctx = await getAuthContext();
  if (!ctx) return { error: "Unauthorized" };

  const { uploadId, blobUrl, title, tags, folderId, docType } = input;
  if (!uploadId || !blobUrl) return { error: "Missing uploadId or blobUrl" };

  const result = await upsertUploadedDocument({
    churchId: ctx.membership.churchId,
    uploadedBy: ctx.userId,
    title,
    docType,
    folderId,
    tags,
    uploadId,
    blobPath: blobUrl,
  });

  return {
    success: true,
    documentId: result.id,
    alreadyHandled: result.alreadyExisted,
  };
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

  await db.delete(documents).where(eq(documents.id, documentId));

  // Fire-and-forget blob cleanup after the response flushes. Failure
  // leaves an orphan blob, not an orphan row.
  if (doc.blobPath) {
    const blobUrl = doc.blobPath;
    after(async () => {
      try {
        await del(blobUrl);
      } catch (err) {
        console.error(`deleteDocument: failed to delete blob ${blobUrl}:`, err);
      }
    });
  }

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
