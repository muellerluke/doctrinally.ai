"use server";

import { revalidatePath } from "next/cache";
import { eq, and } from "drizzle-orm";
import { db } from "@/db";
import { prospects } from "@/db/schema";
import type { ProspectStatus } from "@/db/schema/prospects";
import { requireMembership } from "@/lib/auth-guards";

const VALID_STATUS: ProspectStatus[] = [
  "new",
  "contacted",
  "converted",
  "archived",
];

/**
 * Server action used by the admin Prospects table to flip a lead's
 * status. Scoped to the admin's active church so admins of one church
 * can't mutate another church's prospects even if they guess an id.
 */
export async function updateProspectStatus(
  prospectId: string,
  status: ProspectStatus
) {
  if (!VALID_STATUS.includes(status)) {
    return { error: "Invalid status" };
  }
  const { church } = await requireMembership();

  const result = await db
    .update(prospects)
    .set({ status, updatedAt: new Date() })
    .where(
      and(eq(prospects.id, prospectId), eq(prospects.churchId, church.id))
    )
    .returning({ id: prospects.id });

  if (result.length === 0) {
    return { error: "Prospect not found" };
  }

  revalidatePath("/prospects");
  revalidatePath(`/prospects/${prospectId}`);
  return { success: true };
}

export async function updateProspectNotes(
  prospectId: string,
  notes: string
) {
  const { church } = await requireMembership();
  const trimmed = (notes || "").slice(0, 10_000);

  const result = await db
    .update(prospects)
    .set({ notes: trimmed, updatedAt: new Date() })
    .where(
      and(eq(prospects.id, prospectId), eq(prospects.churchId, church.id))
    )
    .returning({ id: prospects.id });

  if (result.length === 0) {
    return { error: "Prospect not found" };
  }
  revalidatePath(`/prospects/${prospectId}`);
  return { success: true };
}
