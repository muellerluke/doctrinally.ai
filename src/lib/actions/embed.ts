"use server";

import { randomBytes } from "crypto";
import { getServerSession } from "next-auth";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import {
  churches,
  churchWebsiteConfigs,
  subscriptions,
} from "@/db/schema";
import { authOptions } from "@/lib/auth";
import { getActiveMembershipForUser } from "@/lib/active-church";
import { canUseEmbedWidget } from "@/lib/plan-gating";
import { isFeatureEnabled } from "@/lib/feature-flags";

/**
 * Generate a collision-resistant public embed key. This is NOT a secret —
 * it ships in every page source that embeds the widget — so we just need
 * enough entropy to prevent guessing. `dai_pk_` prefix makes keys
 * recognizable in logs and tooling.
 */
function generateEmbedKey(): string {
  return `dai_pk_${randomBytes(18).toString("base64url")}`;
}

async function getAuthContext() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return null;
  const active = await getActiveMembershipForUser(session.user.id);
  if (!active) return null;
  return {
    userId: session.user.id,
    membership: active.membership,
    church: active.church,
  };
}

async function requireEnterpriseContext() {
  const ctx = await getAuthContext();
  if (!ctx) return { error: "Unauthorized" as const };

  const sub = await db.query.subscriptions.findFirst({
    where: eq(subscriptions.churchId, ctx.membership.churchId),
  });
  if (!sub) return { error: "Subscription not found" as const };
  if (!canUseEmbedWidget(sub.plan)) {
    return {
      error: "The embeddable chat widget requires the Enterprise plan" as const,
    };
  }
  // Feature-flag gate — even Enterprise churches can have the widget
  // rolled back via the super-admin Feature Flags page. Mirrors the
  // public-config gate so admin-side writes can't quietly configure a
  // widget that won't load for visitors.
  if (!(await isFeatureEnabled(ctx.membership.churchId, "embedded_chat"))) {
    return {
      error:
        "The embeddable chat widget isn't rolled out to your church yet. Contact support." as const,
    };
  }

  return { ctx, sub };
}

export async function getEmbedConfig() {
  const ctx = await getAuthContext();
  if (!ctx) return { error: "Unauthorized" };

  const church = await db.query.churches.findFirst({
    where: eq(churches.id, ctx.membership.churchId),
    columns: {
      id: true,
      embedPublicKey: true,
      embedEnabled: true,
      websiteDomain: true,
    },
  });
  if (!church) return { error: "Church not found" };

  return {
    success: true,
    embedPublicKey: church.embedPublicKey,
    embedEnabled: church.embedEnabled,
    websiteDomain: church.websiteDomain,
  };
}

export async function generateEmbedPublicKey() {
  const gated = await requireEnterpriseContext();
  if ("error" in gated) return { error: gated.error };
  const { ctx } = gated;

  // Ensure uniqueness on the tiny chance of a collision. base64url of 18
  // bytes has 144 bits of entropy — a clash is astronomically unlikely,
  // but a bounded retry loop costs nothing.
  for (let attempt = 0; attempt < 5; attempt++) {
    const key = generateEmbedKey();
    try {
      await db
        .update(churches)
        .set({ embedPublicKey: key, embedEnabled: true, updatedAt: new Date() })
        .where(eq(churches.id, ctx.membership.churchId));
      return { success: true, embedPublicKey: key };
    } catch (err) {
      if (attempt === 4) throw err;
      // On unique-constraint collision, try again with a fresh key.
      continue;
    }
  }
  return { error: "Failed to generate embed key" };
}

export async function updateEmbedOutreachSettings(input: {
  proactiveOutreachEnabled?: boolean;
}) {
  const gated = await requireEnterpriseContext();
  if ("error" in gated) return { error: gated.error };
  const { ctx } = gated;

  const update: Record<string, unknown> = { updatedAt: new Date() };
  if (typeof input.proactiveOutreachEnabled === "boolean") {
    update.embedProactiveOutreachEnabled = input.proactiveOutreachEnabled;
  }

  await db
    .update(churches)
    .set(update)
    .where(eq(churches.id, ctx.membership.churchId));

  return { success: true };
}

export async function setEmbedEnabled(enabled: boolean) {
  const gated = await requireEnterpriseContext();
  if ("error" in gated) return { error: gated.error };
  const { ctx } = gated;

  // Can't enable an embed that has no key yet.
  if (enabled) {
    const church = await db.query.churches.findFirst({
      where: eq(churches.id, ctx.membership.churchId),
      columns: { embedPublicKey: true },
    });
    if (!church?.embedPublicKey) {
      return {
        error:
          "Generate an embed key first before enabling the widget.",
      };
    }
  }

  await db
    .update(churches)
    .set({ embedEnabled: enabled, updatedAt: new Date() })
    .where(eq(churches.id, ctx.membership.churchId));

  return { success: true };
}

/**
 * Public (unauthenticated) resolver for the loader script's runtime
 * config fetch. Returns the minimum information the loader needs to
 * inject the launcher: whether the widget is enabled, which iframe URL
 * to point at, and lightweight visual hints so the launcher matches
 * the church's brand.
 *
 * Returns `null` (surfaced as 404 from the route handler) when the key
 * is unknown, the church's subscription is inactive, the plan isn't
 * Enterprise, or the admin disabled the widget. Keeping the downgrade
 * path as a silent 404 avoids rendering upgrade prompts on public
 * visitor pages.
 */
export async function resolvePublicEmbedConfig(key: string): Promise<
  | {
      appUrl: string;
      primaryColor: string | null;
      accentColor: string | null;
      churchName: string;
    }
  | null
> {
  if (!key || !key.startsWith("dai_pk_")) return null;

  const row = await db
    .select({
      id: churches.id,
      name: churches.name,
      embedEnabled: churches.embedEnabled,
      isActive: churches.isActive,
      primaryColor: churches.primaryColor,
      accentColor: churches.accentColor,
      plan: subscriptions.plan,
      subStatus: subscriptions.status,
    })
    .from(churches)
    .leftJoin(subscriptions, eq(subscriptions.churchId, churches.id))
    .where(eq(churches.embedPublicKey, key))
    .limit(1);

  const church = row[0];
  if (!church) return null;
  if (!church.isActive || !church.embedEnabled) return null;
  if (!church.plan || !canUseEmbedWidget(church.plan)) return null;
  if (!["active", "trialing", "past_due"].includes(church.subStatus ?? ""))
    return null;
  // Feature-flag gate — lets the super-admin turn the widget off for
  // a specific church without touching their plan or the admin-side
  // embedEnabled toggle. Returning null here cascades into a silent
  // 404 at the config endpoint so nothing visible changes on the
  // church's public site beyond the widget disappearing.
  if (!(await isFeatureEnabled(church.id, "embedded_chat"))) return null;

  return {
    appUrl: process.env.NEXT_PUBLIC_APP_URL || "",
    primaryColor: church.primaryColor,
    accentColor: church.accentColor,
    churchName: church.name,
  };
}

/**
 * Origin allowlist for the iframe's `frame-ancestors` CSP. Auto-derived
 * from the church's configured website domain plus any crawl-additional
 * domains — the same surface area the admin has already approved for
 * their church's public presence.
 */
export async function resolveEmbedAllowedOrigins(
  key: string
): Promise<string[] | null> {
  if (!key || !key.startsWith("dai_pk_")) return null;

  const church = await db.query.churches.findFirst({
    where: eq(churches.embedPublicKey, key),
    columns: { id: true, websiteDomain: true },
  });
  if (!church) return null;

  const config = await db.query.churchWebsiteConfigs.findFirst({
    where: eq(churchWebsiteConfigs.churchId, church.id),
    columns: { additionalDomains: true },
  });

  const origins = new Set<string>();

  const pushOrigin = (raw: string | null | undefined) => {
    if (!raw) return;
    const trimmed = raw.trim();
    if (!trimmed) return;
    // Accept both "mychurch.com" and "https://mychurch.com"; emit
    // https:// and naked-host variants so the CSP covers both the
    // apex and (optionally) www.
    const withoutProtocol = trimmed.replace(/^https?:\/\//, "").replace(/\/$/, "");
    if (!withoutProtocol) return;
    origins.add(`https://${withoutProtocol}`);
    if (!withoutProtocol.startsWith("www.")) {
      origins.add(`https://www.${withoutProtocol}`);
    }
  };

  pushOrigin(church.websiteDomain);
  for (const d of config?.additionalDomains ?? []) pushOrigin(d);

  return [...origins];
}
