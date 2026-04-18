"use server";

import { getServerSession } from "next-auth";
import { eq, and, desc } from "drizzle-orm";
import { tasks } from "@trigger.dev/sdk/v3";
import { db } from "@/db";
import { documents, sermonSessions } from "@/db/schema";
import type { SermonChatMessage } from "@/db/schema/sermon-sessions";
import { authOptions } from "@/lib/auth";
import { getActiveMembershipForUser } from "@/lib/active-church";
import {
  createSermonSchema,
  publishSermonSchema,
  type CreateSermonInput,
  type PublishSermonInput,
} from "@/lib/validations/sermons";

async function getAuthContext() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return null;

  const active = await getActiveMembershipForUser(session.user.id);
  if (!active) return null;

  // Sermon writer is admin/owner only — members cannot author.
  if (active.membership.role === "member") return null;

  return { userId: session.user.id, membership: active.membership };
}

/**
 * Create a draft sermon document plus its singleton chat session. Returns the
 * new document id so the caller can redirect to `/sermons/{id}/edit`.
 */
export async function createSermon(input?: CreateSermonInput) {
  const ctx = await getAuthContext();
  if (!ctx) return { error: "Unauthorized" };

  const parsed = createSermonSchema.safeParse(input ?? {});
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const title = parsed.data.title || "Untitled sermon";

  const [doc] = await db
    .insert(documents)
    .values({
      churchId: ctx.membership.churchId,
      uploadedBy: ctx.userId,
      title,
      type: "sermon",
      status: "draft",
      content: "",
      membersSearchable: false,
      sermonMetadata: {},
      metadata: {},
    })
    .returning({ id: documents.id });

  await db.insert(sermonSessions).values({
    documentId: doc.id,
    churchId: ctx.membership.churchId,
    createdByUserId: ctx.userId,
    messages: [],
  });

  return { success: true, documentId: doc.id };
}

/**
 * Save the latest Platejs JSON + optional title for the sermon. Auto-save.
 */
export async function saveSermon(
  documentId: string,
  content: string,
  title?: string
) {
  const ctx = await getAuthContext();
  if (!ctx) return { error: "Unauthorized" };

  const doc = await db.query.documents.findFirst({
    where: and(
      eq(documents.id, documentId),
      eq(documents.churchId, ctx.membership.churchId),
      eq(documents.type, "sermon")
    ),
  });
  if (!doc) return { error: "Sermon not found" };

  await db
    .update(documents)
    .set({
      content,
      ...(title ? { title } : {}),
      updatedAt: new Date(),
    })
    .where(eq(documents.id, documentId));

  return { success: true };
}

/**
 * Rename a sermon without touching its content. Called when the title input
 * blurs, independent of the editor's own auto-save cadence.
 */
export async function renameSermon(documentId: string, title: string) {
  const ctx = await getAuthContext();
  if (!ctx) return { error: "Unauthorized" };

  const trimmed = title.trim();
  if (trimmed.length < 1) return { error: "Title cannot be empty" };
  if (trimmed.length > 200) return { error: "Title too long" };

  const doc = await db.query.documents.findFirst({
    where: and(
      eq(documents.id, documentId),
      eq(documents.churchId, ctx.membership.churchId),
      eq(documents.type, "sermon")
    ),
  });
  if (!doc) return { error: "Sermon not found" };

  await db
    .update(documents)
    .set({ title: trimmed, updatedAt: new Date() })
    .where(eq(documents.id, documentId));

  return { success: true };
}

/**
 * Publish a sermon into the searchable document library. Flips status to
 * "queued" and fires the existing process-platejs indexing job. Respects the
 * pastor-chosen `membersSearchable` visibility flag.
 */
export async function publishSermon(input: PublishSermonInput) {
  const ctx = await getAuthContext();
  if (!ctx) return { error: "Unauthorized" };

  const parsed = publishSermonSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const {
    documentId,
    title,
    speaker,
    sermonDate,
    series,
    tags,
    membersSearchable,
  } = parsed.data;

  const doc = await db.query.documents.findFirst({
    where: and(
      eq(documents.id, documentId),
      eq(documents.churchId, ctx.membership.churchId),
      eq(documents.type, "sermon")
    ),
  });
  if (!doc) return { error: "Sermon not found" };

  await db
    .update(documents)
    .set({
      title,
      status: "queued",
      membersSearchable,
      sermonMetadata: {
        speaker: speaker ?? undefined,
        sermonDate: sermonDate ?? undefined,
        series: series ?? undefined,
        tags: tags ?? undefined,
      },
      publishedFromSermonAt: new Date(),
      metadata: { ...(doc.metadata as Record<string, unknown>), tags: tags ?? [] },
      updatedAt: new Date(),
    })
    .where(eq(documents.id, documentId));

  try {
    await tasks.trigger("process-platejs", { documentId });
  } catch (err) {
    console.error("Failed to trigger process-platejs for sermon:", err);
  }

  return { success: true, documentId };
}

export async function listSermons() {
  const ctx = await getAuthContext();
  if (!ctx) return { error: "Unauthorized" as const, sermons: [] };

  const rows = await db
    .select()
    .from(documents)
    .where(
      and(
        eq(documents.churchId, ctx.membership.churchId),
        eq(documents.type, "sermon")
      )
    )
    .orderBy(desc(documents.updatedAt));

  return { sermons: rows };
}

export async function getSermonSession(documentId: string) {
  const ctx = await getAuthContext();
  if (!ctx) return { error: "Unauthorized" as const };

  const doc = await db.query.documents.findFirst({
    where: and(
      eq(documents.id, documentId),
      eq(documents.churchId, ctx.membership.churchId),
      eq(documents.type, "sermon")
    ),
  });
  if (!doc) return { error: "Sermon not found" as const };

  const session = await db.query.sermonSessions.findFirst({
    where: eq(sermonSessions.documentId, documentId),
  });

  return {
    document: doc,
    session: session ?? null,
  };
}

/**
 * Append a user+assistant message pair to the sermon session after a turn
 * finishes. Also bumps the session's token/cost totals. The assistant
 * content is stored with `<document>` tags intact so the chat rerenders the
 * same citation badges on reload.
 */
export async function appendSermonTurn(
  documentId: string,
  userMessage: SermonChatMessage,
  assistantMessage: SermonChatMessage,
  tokensIn: number,
  tokensOut: number,
  centsSpent: number
) {
  const ctx = await getAuthContext();
  if (!ctx) return { error: "Unauthorized" };

  const session = await db.query.sermonSessions.findFirst({
    where: eq(sermonSessions.documentId, documentId),
  });
  if (!session) return { error: "Session not found" };
  if (session.churchId !== ctx.membership.churchId) return { error: "Unauthorized" };

  const nextMessages = [...(session.messages ?? []), userMessage, assistantMessage];

  await db
    .update(sermonSessions)
    .set({
      messages: nextMessages,
      tokensInTotal: session.tokensInTotal + tokensIn,
      tokensOutTotal: session.tokensOutTotal + tokensOut,
      centsSpent: session.centsSpent + centsSpent,
      updatedAt: new Date(),
    })
    .where(eq(sermonSessions.id, session.id));

  return { success: true };
}
