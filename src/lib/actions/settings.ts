"use server";

import { getServerSession } from "next-auth";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { churches, memberships, subscriptions } from "@/db/schema";
import { authOptions } from "@/lib/auth";
import { canUseCustomBranding, canUseCustomDomain } from "@/lib/plan-gating";
import { addDomainToVercel, removeDomainFromVercel } from "@/lib/vercel";

async function getAuthContext() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return null;

  const membership = await db.query.memberships.findFirst({
    where: eq(memberships.userId, session.user.id),
  });
  if (!membership) return null;

  return { userId: session.user.id, membership };
}

const churchInfoSchema = z.object({
  name: z.string().min(2).max(100),
  description: z.string().max(500).optional().nullable(),
  phone: z.string().max(20).optional().nullable(),
  address: z.string().max(200).optional().nullable(),
});

export async function updateChurchInfo(input: z.infer<typeof churchInfoSchema>) {
  const ctx = await getAuthContext();
  if (!ctx) return { error: "Unauthorized" };

  const parsed = churchInfoSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  await db
    .update(churches)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(eq(churches.id, ctx.membership.churchId));

  return { success: true };
}

export async function updateChurchLogo(logoUrl: string) {
  const ctx = await getAuthContext();
  if (!ctx) return { error: "Unauthorized" };

  await db
    .update(churches)
    .set({ logoUrl, updatedAt: new Date() })
    .where(eq(churches.id, ctx.membership.churchId));

  return { success: true };
}

const brandingSchema = z.object({
  primaryColor: z.string().nullable().optional(),
  accentColor: z.string().nullable().optional(),
  backgroundColor: z.string().nullable().optional(),
  textColor: z.string().nullable().optional(),
  darkPrimaryColor: z.string().nullable().optional(),
  darkAccentColor: z.string().nullable().optional(),
  darkBackgroundColor: z.string().nullable().optional(),
  darkTextColor: z.string().nullable().optional(),
  darkLogoUrl: z.string().nullable().optional(),
  welcomeMessage: z.string().max(200).nullable().optional(),
  logoHeight: z.string().nullable().optional(),
  fontFamily: z.string().nullable().optional(),
});

export async function updateChurchBranding(
  input: z.infer<typeof brandingSchema>
) {
  const ctx = await getAuthContext();
  if (!ctx) return { error: "Unauthorized" };

  // Check enterprise plan
  const sub = await db.query.subscriptions.findFirst({
    where: eq(subscriptions.churchId, ctx.membership.churchId),
  });

  if (!sub || !canUseCustomBranding(sub.plan)) {
    return { error: "Custom branding requires the Enterprise plan" };
  }

  const parsed = brandingSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  await db
    .update(churches)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(eq(churches.id, ctx.membership.churchId));

  return { success: true };
}

export async function updateChurchDomain(customDomain: string | null) {
  const ctx = await getAuthContext();
  if (!ctx) return { error: "Unauthorized" };
  if (ctx.membership.role !== "owner") return { error: "Only owners can change the domain" };

  // Check enterprise plan
  const sub = await db.query.subscriptions.findFirst({
    where: eq(subscriptions.churchId, ctx.membership.churchId),
  });

  if (!sub || !canUseCustomDomain(sub.plan)) {
    return { error: "Custom domains require the Enterprise plan" };
  }

  // Validate domain format
  if (customDomain) {
    const domainRegex = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)*\.[a-z]{2,}$/;
    if (!domainRegex.test(customDomain)) {
      return { error: "Invalid domain format" };
    }

    // Check uniqueness
    const existing = await db.query.churches.findFirst({
      where: eq(churches.customDomain, customDomain),
    });
    if (existing && existing.id !== ctx.membership.churchId) {
      return { error: "This domain is already in use" };
    }
  }

  // Get the old domain to remove from Vercel if changing
  const currentChurch = await db.query.churches.findFirst({
    where: eq(churches.id, ctx.membership.churchId),
  });
  const oldDomain = currentChurch?.customDomain;

  // Add new domain to Vercel (provisions SSL automatically)
  if (customDomain) {
    const result = await addDomainToVercel(customDomain);
    if (!result.success) {
      return { error: result.error || "Failed to register domain with Vercel" };
    }
  }

  // Remove old domain from Vercel if it's being changed or cleared
  if (oldDomain && oldDomain !== customDomain) {
    await removeDomainFromVercel(oldDomain);
  }

  await db
    .update(churches)
    .set({ customDomain: customDomain || null, updatedAt: new Date() })
    .where(eq(churches.id, ctx.membership.churchId));

  return { success: true };
}
