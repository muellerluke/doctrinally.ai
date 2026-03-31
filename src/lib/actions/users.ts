"use server";

import { getServerSession } from "next-auth";
import { eq, and } from "drizzle-orm";
import { randomBytes } from "crypto";
import { db } from "@/db";
import { memberships, users, invitations } from "@/db/schema";
import { authOptions } from "@/lib/auth";

async function requireOwnerContext() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return null;

  const membership = await db.query.memberships.findFirst({
    where: eq(memberships.userId, session.user.id),
  });

  if (!membership || membership.role !== "owner") return null;

  return { userId: session.user.id, membership };
}

export async function getChurchMembers(churchId: string) {
  const rows = await db
    .select({
      membershipId: memberships.id,
      userId: memberships.userId,
      role: memberships.role,
      joinedAt: memberships.createdAt,
      name: users.name,
      email: users.email,
    })
    .from(memberships)
    .innerJoin(users, eq(memberships.userId, users.id))
    .where(eq(memberships.churchId, churchId));

  return rows;
}

export async function getChurchInvitations(churchId: string) {
  const rows = await db
    .select()
    .from(invitations)
    .where(
      and(
        eq(invitations.churchId, churchId),
        eq(invitations.status, "pending")
      )
    );

  return rows;
}

export async function inviteUser(input: {
  churchId: string;
  email: string;
  role: "admin" | "member";
}) {
  const ctx = await requireOwnerContext();
  if (!ctx) return { error: "Only owners can invite users" };

  // Check if user is already a member
  const existingUser = await db.query.users.findFirst({
    where: eq(users.email, input.email),
  });

  if (existingUser) {
    const existingMembership = await db.query.memberships.findFirst({
      where: and(
        eq(memberships.userId, existingUser.id),
        eq(memberships.churchId, input.churchId)
      ),
    });
    if (existingMembership) {
      return { error: "This user is already a member of your church" };
    }
  }

  // Check for existing pending invitation
  const existingInvite = await db.query.invitations.findFirst({
    where: and(
      eq(invitations.churchId, input.churchId),
      eq(invitations.email, input.email),
      eq(invitations.status, "pending")
    ),
  });

  if (existingInvite) {
    return { error: "An invitation is already pending for this email" };
  }

  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

  await db.insert(invitations).values({
    churchId: input.churchId,
    invitedBy: ctx.userId,
    email: input.email,
    role: input.role,
    token,
    expiresAt,
  });

  return { success: true, token };
}

export async function changeUserRole(input: {
  membershipId: string;
  role: "admin" | "member" | "owner";
}) {
  const ctx = await requireOwnerContext();
  if (!ctx) return { error: "Only owners can change roles" };

  const target = await db.query.memberships.findFirst({
    where: eq(memberships.id, input.membershipId),
  });

  if (!target) return { error: "Member not found" };
  if (target.churchId !== ctx.membership.churchId) return { error: "Unauthorized" };
  if (target.userId === ctx.userId) return { error: "You cannot change your own role" };

  await db
    .update(memberships)
    .set({ role: input.role, updatedAt: new Date() })
    .where(eq(memberships.id, input.membershipId));

  return { success: true };
}

export async function removeUser(membershipId: string) {
  const ctx = await requireOwnerContext();
  if (!ctx) return { error: "Only owners can remove users" };

  const target = await db.query.memberships.findFirst({
    where: eq(memberships.id, membershipId),
  });

  if (!target) return { error: "Member not found" };
  if (target.churchId !== ctx.membership.churchId) return { error: "Unauthorized" };
  if (target.userId === ctx.userId) return { error: "You cannot remove yourself" };

  await db.delete(memberships).where(eq(memberships.id, membershipId));

  return { success: true };
}

export async function revokeInvitation(invitationId: string) {
  const ctx = await requireOwnerContext();
  if (!ctx) return { error: "Only owners can revoke invitations" };

  const invite = await db.query.invitations.findFirst({
    where: eq(invitations.id, invitationId),
  });

  if (!invite) return { error: "Invitation not found" };
  if (invite.churchId !== ctx.membership.churchId) return { error: "Unauthorized" };

  await db
    .update(invitations)
    .set({ status: "revoked" })
    .where(eq(invitations.id, invitationId));

  return { success: true };
}

export async function resendInvitation(invitationId: string) {
  const ctx = await requireOwnerContext();
  if (!ctx) return { error: "Only owners can resend invitations" };

  const invite = await db.query.invitations.findFirst({
    where: eq(invitations.id, invitationId),
  });

  if (!invite) return { error: "Invitation not found" };
  if (invite.churchId !== ctx.membership.churchId) return { error: "Unauthorized" };

  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  await db
    .update(invitations)
    .set({ token, expiresAt, status: "pending" })
    .where(eq(invitations.id, invitationId));

  return { success: true, token };
}
