"use server";

import { getServerSession } from "next-auth";
import { eq, and, desc } from "drizzle-orm";
import { db } from "@/db";
import { chats, messages } from "@/db/schema";
import { authOptions } from "@/lib/auth";

/**
 * List all chats for the current user in a given church.
 */
export async function getChats(churchId: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return { error: "Unauthorized" };

  const rows = await db
    .select({
      id: chats.id,
      title: chats.title,
      updatedAt: chats.updatedAt,
    })
    .from(chats)
    .where(
      and(eq(chats.churchId, churchId), eq(chats.userId, session.user.id))
    )
    .orderBy(desc(chats.updatedAt));

  return { chats: rows };
}

/**
 * Load all messages for a specific chat, verifying user ownership.
 */
export async function getChatMessages(chatId: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return { error: "Unauthorized" };

  const [chat] = await db
    .select()
    .from(chats)
    .where(and(eq(chats.id, chatId), eq(chats.userId, session.user.id)))
    .limit(1);

  if (!chat) return { error: "Chat not found" };

  const rows = await db
    .select({
      id: messages.id,
      role: messages.role,
      content: messages.content,
      citations: messages.citations,
      createdAt: messages.createdAt,
    })
    .from(messages)
    .where(eq(messages.chatId, chatId))
    .orderBy(messages.createdAt);

  return {
    chat: { id: chat.id, title: chat.title },
    messages: rows,
  };
}

/**
 * Delete a chat and all its messages (cascade).
 */
export async function deleteChat(chatId: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return { error: "Unauthorized" };

  const [chat] = await db
    .select({ id: chats.id })
    .from(chats)
    .where(and(eq(chats.id, chatId), eq(chats.userId, session.user.id)))
    .limit(1);

  if (!chat) return { error: "Chat not found" };

  await db.delete(chats).where(eq(chats.id, chatId));

  return { success: true };
}

/**
 * Rename a chat.
 */
export async function renameChat(chatId: string, title: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return { error: "Unauthorized" };

  const [chat] = await db
    .select({ id: chats.id })
    .from(chats)
    .where(and(eq(chats.id, chatId), eq(chats.userId, session.user.id)))
    .limit(1);

  if (!chat) return { error: "Chat not found" };

  await db
    .update(chats)
    .set({ title, updatedAt: new Date() })
    .where(eq(chats.id, chatId));

  return { success: true };
}
