"use server";

import { getServerSession } from "next-auth";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { tasks } from "@trigger.dev/sdk/v3";
import { db } from "@/db";
import { churches, churchWebsiteConfigs } from "@/db/schema";
import { authOptions } from "@/lib/auth";
import { getActiveMembershipForUser } from "@/lib/active-church";
import { getHostname, normalizeUrl } from "@/lib/firecrawl";

async function getAuthContext() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return null;

  const active = await getActiveMembershipForUser(session.user.id);
  if (!active) return null;

  return { userId: session.user.id, membership: active.membership };
}

// Glob patterns: must start with "/" or contain "*". This is intentionally
// loose — Firecrawl validates the actual pattern, we just need to keep
// admins from saving a bare hostname or random text in the path filter.
const PATTERN_REGEX = /^[\/\w\-.*?[\]{}|()@:%+=#~!,;'$&]+$/;
const HOSTNAME_REGEX = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/i;

const websiteConfigSchema = z.object({
  websiteDomain: z
    .string()
    .trim()
    .max(253)
    .nullable()
    .optional()
    .transform((v) => (v && v.length > 0 ? v : null)),
  additionalDomains: z
    .array(
      z
        .string()
        .trim()
        .min(1)
        .max(253)
        .refine((v) => HOSTNAME_REGEX.test(v.replace(/^https?:\/\//i, "").split("/")[0]), {
          message: "Each additional domain must be a valid hostname like 'example.com'",
        })
    )
    .max(10)
    .default([]),
  includePatterns: z
    .array(
      z
        .string()
        .trim()
        .min(1)
        .max(200)
        .refine((v) => PATTERN_REGEX.test(v), {
          message: "Patterns should look like '/sermons/*' or '/about*'",
        })
    )
    .max(50)
    .default([]),
  excludePatterns: z
    .array(
      z
        .string()
        .trim()
        .min(1)
        .max(200)
        .refine((v) => PATTERN_REGEX.test(v), {
          message: "Patterns should look like '/donate*' or '/admin/*'",
        })
    )
    .max(50)
    .default([]),
});

export type WebsiteConfigInput = z.input<typeof websiteConfigSchema>;

export async function getWebsiteConfig() {
  const ctx = await getAuthContext();
  if (!ctx) return { error: "Unauthorized" as const };

  const churchId = ctx.membership.churchId;

  const [church] = await db
    .select({ websiteDomain: churches.websiteDomain })
    .from(churches)
    .where(eq(churches.id, churchId))
    .limit(1);

  let [config] = await db
    .select()
    .from(churchWebsiteConfigs)
    .where(eq(churchWebsiteConfigs.churchId, churchId))
    .limit(1);

  // Lazy-create the row so churches that signed up before this feature
  // don't have to be backfilled separately.
  if (!config) {
    [config] = await db
      .insert(churchWebsiteConfigs)
      .values({ churchId })
      .returning();
  }

  return {
    websiteDomain: church?.websiteDomain ?? null,
    additionalDomains: config.additionalDomains,
    includePatterns: config.includePatterns,
    excludePatterns: config.excludePatterns,
    lastCrawlAt: config.lastCrawlAt,
    lastCrawlStatus: config.lastCrawlStatus,
    lastCrawlPagesIngested: config.lastCrawlPagesIngested,
    lastCrawlError: config.lastCrawlError,
  };
}

export async function updateWebsiteConfig(input: WebsiteConfigInput) {
  const ctx = await getAuthContext();
  if (!ctx) return { error: "Unauthorized" };
  if (!["admin", "owner"].includes(ctx.membership.role)) {
    return { error: "Only admins or owners can change website settings" };
  }

  const parsed = websiteConfigSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const churchId = ctx.membership.churchId;

  // Validate the primary domain separately so we can reject obvious
  // junk before passing it to Firecrawl. `getHostname` will normalize
  // "https://" prefixes etc., so admins can paste a full URL.
  let normalizedDomain: string | null = null;
  if (parsed.data.websiteDomain) {
    const host = getHostname(parsed.data.websiteDomain);
    if (!host || !HOSTNAME_REGEX.test(host)) {
      return { error: "Enter a valid website domain like 'mychurch.com'" };
    }
    normalizedDomain = normalizeUrl(parsed.data.websiteDomain);
  }

  await db.transaction(async (tx) => {
    await tx
      .update(churches)
      .set({ websiteDomain: normalizedDomain, updatedAt: new Date() })
      .where(eq(churches.id, churchId));

    const existing = await tx
      .select({ id: churchWebsiteConfigs.id })
      .from(churchWebsiteConfigs)
      .where(eq(churchWebsiteConfigs.churchId, churchId))
      .limit(1);

    if (existing.length === 0) {
      await tx.insert(churchWebsiteConfigs).values({
        churchId,
        additionalDomains: parsed.data.additionalDomains,
        includePatterns: parsed.data.includePatterns,
        excludePatterns: parsed.data.excludePatterns,
      });
    } else {
      await tx
        .update(churchWebsiteConfigs)
        .set({
          additionalDomains: parsed.data.additionalDomains,
          includePatterns: parsed.data.includePatterns,
          excludePatterns: parsed.data.excludePatterns,
          updatedAt: new Date(),
        })
        .where(eq(churchWebsiteConfigs.churchId, churchId));
    }
  });

  return { success: true };
}

export async function triggerManualRecrawl() {
  const ctx = await getAuthContext();
  if (!ctx) return { error: "Unauthorized" };
  if (!["admin", "owner"].includes(ctx.membership.role)) {
    return { error: "Only admins or owners can start a website crawl" };
  }

  const churchId = ctx.membership.churchId;

  const [church] = await db
    .select({ websiteDomain: churches.websiteDomain })
    .from(churches)
    .where(eq(churches.id, churchId))
    .limit(1);

  if (!church?.websiteDomain) {
    return {
      error:
        "Add your church website above before starting a crawl.",
    };
  }

  const [config] = await db
    .select({ status: churchWebsiteConfigs.lastCrawlStatus })
    .from(churchWebsiteConfigs)
    .where(eq(churchWebsiteConfigs.churchId, churchId))
    .limit(1);

  if (config?.status === "running" || config?.status === "queued") {
    return {
      error: "A crawl is already running. Try again once it finishes.",
    };
  }

  // Mark queued *before* triggering so the UI flips immediately even
  // if Trigger.dev pickup is slow. The job will overwrite this with
  // "running" as soon as it starts.
  await db
    .update(churchWebsiteConfigs)
    .set({
      lastCrawlStatus: "queued",
      lastCrawlError: null,
      updatedAt: new Date(),
    })
    .where(eq(churchWebsiteConfigs.churchId, churchId));

  try {
    await tasks.trigger("crawl-church-website", {
      churchId,
      triggeredBy: "manual" as const,
    });
  } catch (err) {
    console.error("[website-crawling] failed to trigger crawl-church-website", err);
    await db
      .update(churchWebsiteConfigs)
      .set({
        lastCrawlStatus: "failed",
        lastCrawlError: "Failed to start crawl. Please try again.",
        updatedAt: new Date(),
      })
      .where(eq(churchWebsiteConfigs.churchId, churchId));
    return { error: "Failed to start crawl. Please try again." };
  }

  return { success: true };
}
