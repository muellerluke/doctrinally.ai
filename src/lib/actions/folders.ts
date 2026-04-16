"use server";

import { getServerSession } from "next-auth";
import { eq, and, isNull, InferSelectModel } from "drizzle-orm";
import { db } from "@/db";
import { folders, documents } from "@/db/schema";
import { authOptions } from "@/lib/auth";
import { getActiveMembershipForUser } from "@/lib/active-church";

type Folder = InferSelectModel<typeof folders>;

async function getAuthContext() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return null;

  const active = await getActiveMembershipForUser(session.user.id);
  if (!active) return null;

  return { userId: session.user.id, membership: active.membership };
}

export async function getFolders(
  churchId: string,
  parentId?: string | null
) {
  const ctx = await getAuthContext();
  if (!ctx) return { error: "Unauthorized" };

  const condition =
    parentId === undefined || parentId === null
      ? and(eq(folders.churchId, churchId), isNull(folders.parentId))
      : and(eq(folders.churchId, churchId), eq(folders.parentId, parentId));

  const result = await db.query.folders.findMany({
    where: condition,
    orderBy: folders.name,
  });

  return { success: true, folders: result };
}

export async function createFolder(input: {
  name: string;
  parentId?: string | null;
}) {
  const ctx = await getAuthContext();
  if (!ctx) return { error: "Unauthorized" };

  const name = input.name.trim();
  if (!name) return { error: "Folder name is required" };

  const churchId = ctx.membership.churchId;

  // If parentId is provided, verify it belongs to the same church
  if (input.parentId) {
    const parent = await db.query.folders.findFirst({
      where: and(
        eq(folders.id, input.parentId),
        eq(folders.churchId, churchId)
      ),
    });
    if (!parent) return { error: "Parent folder not found" };
  }

  // Check for duplicate name at the same level
  const duplicateCondition = input.parentId
    ? and(
        eq(folders.churchId, churchId),
        eq(folders.parentId, input.parentId),
        eq(folders.name, name)
      )
    : and(
        eq(folders.churchId, churchId),
        isNull(folders.parentId),
        eq(folders.name, name)
      );

  const existing = await db.query.folders.findFirst({
    where: duplicateCondition,
  });
  if (existing) return { error: "A folder with this name already exists here" };

  const [folder] = await db
    .insert(folders)
    .values({
      churchId,
      parentId: input.parentId ?? null,
      name,
    })
    .returning();

  return { success: true, folder };
}

export async function renameFolder(folderId: string, name: string) {
  const ctx = await getAuthContext();
  if (!ctx) return { error: "Unauthorized" };

  const trimmed = name.trim();
  if (!trimmed) return { error: "Folder name is required" };

  const churchId = ctx.membership.churchId;

  const folder = await db.query.folders.findFirst({
    where: and(eq(folders.id, folderId), eq(folders.churchId, churchId)),
  });
  if (!folder) return { error: "Folder not found" };

  // Check for duplicate name at the same level
  const duplicateCondition = folder.parentId
    ? and(
        eq(folders.churchId, churchId),
        eq(folders.parentId, folder.parentId),
        eq(folders.name, trimmed)
      )
    : and(
        eq(folders.churchId, churchId),
        isNull(folders.parentId),
        eq(folders.name, trimmed)
      );

  const existing = await db.query.folders.findFirst({
    where: duplicateCondition,
  });
  if (existing && existing.id !== folderId) {
    return { error: "A folder with this name already exists here" };
  }

  await db
    .update(folders)
    .set({ name: trimmed, updatedAt: new Date() })
    .where(eq(folders.id, folderId));

  return { success: true };
}

export async function deleteFolder(folderId: string) {
  const ctx = await getAuthContext();
  if (!ctx) return { error: "Unauthorized" };

  const churchId = ctx.membership.churchId;

  const folder = await db.query.folders.findFirst({
    where: and(eq(folders.id, folderId), eq(folders.churchId, churchId)),
  });
  if (!folder) return { error: "Folder not found" };

  // Documents inside get folderId set to null via FK onDelete: "set null"
  await db.delete(folders).where(eq(folders.id, folderId));

  return { success: true };
}

export async function moveDocument(
  documentId: string,
  folderId: string | null
) {
  const ctx = await getAuthContext();
  if (!ctx) return { error: "Unauthorized" };

  const churchId = ctx.membership.churchId;

  const document = await db.query.documents.findFirst({
    where: and(eq(documents.id, documentId), eq(documents.churchId, churchId)),
  });
  if (!document) return { error: "Document not found" };

  // If moving into a folder, verify it belongs to the same church
  if (folderId) {
    const folder = await db.query.folders.findFirst({
      where: and(eq(folders.id, folderId), eq(folders.churchId, churchId)),
    });
    if (!folder) return { error: "Folder not found" };
  }

  await db
    .update(documents)
    .set({ folderId, updatedAt: new Date() })
    .where(eq(documents.id, documentId));

  return { success: true };
}

export async function moveFolder(
  folderId: string,
  newParentId: string | null
) {
  const ctx = await getAuthContext();
  if (!ctx) return { error: "Unauthorized" };

  const churchId = ctx.membership.churchId;

  const folder = await db.query.folders.findFirst({
    where: and(eq(folders.id, folderId), eq(folders.churchId, churchId)),
  });
  if (!folder) return { error: "Folder not found" };

  // Cannot move a folder into itself
  if (newParentId === folderId) {
    return { error: "Cannot move a folder into itself" };
  }

  // If moving into a folder, verify it belongs to the same church
  // and prevent circular references
  if (newParentId) {
    const targetFolder = await db.query.folders.findFirst({
      where: and(eq(folders.id, newParentId), eq(folders.churchId, churchId)),
    });
    if (!targetFolder) return { error: "Target folder not found" };

    // Walk up from newParentId to root to ensure folderId is not an ancestor
    let currentId: string | null = newParentId;
    while (currentId) {
      if (currentId === folderId) {
        return { error: "Cannot move a folder into one of its descendants" };
      }
      const current: Folder | undefined = await db.query.folders.findFirst({
        where: eq(folders.id, currentId),
      });
      currentId = current?.parentId ?? null;
    }
  }

  // Check for duplicate name at the new level
  const duplicateCondition = newParentId
    ? and(
        eq(folders.churchId, churchId),
        eq(folders.parentId, newParentId),
        eq(folders.name, folder.name)
      )
    : and(
        eq(folders.churchId, churchId),
        isNull(folders.parentId),
        eq(folders.name, folder.name)
      );

  const existing = await db.query.folders.findFirst({
    where: duplicateCondition,
  });
  if (existing && existing.id !== folderId) {
    return { error: "A folder with this name already exists in the destination" };
  }

  await db
    .update(folders)
    .set({ parentId: newParentId, updatedAt: new Date() })
    .where(eq(folders.id, folderId));

  return { success: true };
}

export async function getAllFolders(churchId: string) {
  const ctx = await getAuthContext();
  if (!ctx) return { error: "Unauthorized" };

  if (ctx.membership.churchId !== churchId) {
    return { error: "Unauthorized" };
  }

  const result = await db.query.folders.findMany({
    where: eq(folders.churchId, churchId),
    orderBy: folders.name,
  });

  return { success: true, folders: result };
}

export async function getFolderBreadcrumbs(folderId: string) {
  const ctx = await getAuthContext();
  if (!ctx) return { error: "Unauthorized" };

  const churchId = ctx.membership.churchId;

  const breadcrumbs: { id: string; name: string }[] = [];
  let currentId: string | null = folderId;

  while (currentId) {
    const folder: Folder | undefined = await db.query.folders.findFirst({
      where: and(eq(folders.id, currentId), eq(folders.churchId, churchId)),
    });
    if (!folder) break;

    breadcrumbs.unshift({ id: folder.id, name: folder.name });
    currentId = folder.parentId;
  }

  return { success: true, breadcrumbs };
}
