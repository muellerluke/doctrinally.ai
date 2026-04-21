"use server";

import { getServerSession } from "next-auth";
import { eq } from "drizzle-orm";
import { after } from "next/server";
import { tasks } from "@trigger.dev/sdk/v3";
import { db } from "@/db";
import {
  churches,
  churchWebsiteConfigs,
  memberships,
  subscriptions,
  youtubeChannelSyncs,
} from "@/db/schema";
import { authOptions } from "@/lib/auth";
import { churchInfoSchema, onboardingSchema } from "@/lib/validations/onboarding";
import { slugify } from "@/lib/utils";
import { stripe, getStripePriceId } from "@/lib/stripe";
import { getPlanLimits, TRIAL_DAYS } from "@/lib/plans";
import { env } from "@/lib/env";
import { canUseYouTubeSync } from "@/lib/plan-gating";
import {
  fetchChannelVideos,
  resolveChannel,
} from "@/trigger/utils/youtube-channel";
import { hasYouTubeCaptions } from "@/trigger/utils/youtube";
import { upsertChurchSyncSchedule } from "@/lib/youtube-sync/trigger-schedules";
import { normalizeUrl } from "@/lib/firecrawl";

/**
 * Real-time slug availability check for onboarding step 1. Runs unauthenticated
 * because the user hasn't finished onboarding yet. Returns `available: true` only
 * if the slug passes the shared format rules AND is not already taken — the caller
 * can show "taken" and "invalid format" with the same inline UI.
 */
export async function checkSlugAvailable(
  slug: string
): Promise<{ available: boolean; reason?: "invalid" | "taken" }> {
  const parsed = churchInfoSchema.shape.slug.safeParse(slug);
  if (!parsed.success) {
    return { available: false, reason: "invalid" };
  }
  const existing = await db.query.churches.findFirst({
    where: eq(churches.slug, parsed.data),
    columns: { id: true },
  });
  return existing ? { available: false, reason: "taken" } : { available: true };
}

/**
 * Fast preflight during onboarding step 3. Validates the channel exists and
 * checks whether the three most recent videos have captions available.
 *
 * We sample only a handful of videos so the check resolves in ~5–15s and
 * never blocks the onboarding flow. The full-channel scan runs in the
 * background after Stripe checkout and emails the owner a complete report.
 */
export async function quickScanChannelCaptions(
  channelUrl: string
): Promise<
  | {
      success: true;
      channelTitle: string;
      sampleSize: number;
      withCaptions: number;
      withoutCaptions: number;
    }
  | { success: false; error: string }
> {
  if (!channelUrl.trim()) {
    return { success: false, error: "Channel URL is required" };
  }

  let resolved;
  try {
    resolved = await resolveChannel(channelUrl);
  } catch (err) {
    return {
      success: false,
      error:
        err instanceof Error
          ? `Could not find YouTube channel: ${err.message}`
          : "Could not find YouTube channel",
    };
  }

  let videos;
  try {
    videos = await fetchChannelVideos(resolved.channelId, 10);
  } catch {
    // Channel listed fine but video fetch failed — treat as transient.
    return {
      success: false,
      error: "YouTube is being slow right now. Try again in a moment.",
    };
  }

  const sample = videos.slice(0, 3);
  if (sample.length === 0) {
    return {
      success: true,
      channelTitle: resolved.title,
      sampleSize: 0,
      withCaptions: 0,
      withoutCaptions: 0,
    };
  }

  let withCaptions = 0;
  let withoutCaptions = 0;

  // Serial probes keep the onboarding wait under ~10s for 3 videos and
  // avoid burning a parallel burst of InnerTube requests from the Vercel
  // server IP before background IP-diverse workers take over.
  for (const v of sample) {
    try {
      const available = await hasYouTubeCaptions(v.videoId);
      if (available) withCaptions++;
      else withoutCaptions++;
    } catch {
      // Inconclusive probe — don't fail the whole onboarding over one
      // flaky video; treat it as "with captions" so we err on the side of
      // letting the admin continue, and the background scan corrects the
      // record.
      withCaptions++;
    }
  }

  return {
    success: true,
    channelTitle: resolved.title,
    sampleSize: sample.length,
    withCaptions,
    withoutCaptions,
  };
}

export async function getExistingChurch() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return null;

  const membership = await db.query.memberships.findFirst({
    where: eq(memberships.userId, session.user.id),
  });
  if (!membership) return null;

  const church = await db.query.churches.findFirst({
    where: eq(churches.id, membership.churchId),
  });
  if (!church) return null;

  const sub = await db.query.subscriptions.findFirst({
    where: eq(subscriptions.churchId, church.id),
  });

  return { church, subscription: sub };
}

export async function resumeCheckout(plan: "standard" | "enterprise") {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return { error: "You must be signed in" };

  const membership = await db.query.memberships.findFirst({
    where: eq(memberships.userId, session.user.id),
  });
  if (!membership) return { error: "No church found" };

  const sub = await db.query.subscriptions.findFirst({
    where: eq(subscriptions.churchId, membership.churchId),
  });
  if (!sub) return { error: "No subscription found" };

  // Both plans start as a 14-day free trial on resume so churches that
  // bailed from the first checkout still get the trial offer.
  const isTrial = true;
  const limits = getPlanLimits(plan);
  await db
    .update(subscriptions)
    .set({
      plan,
      questionLimit: limits.questionLimit,
      updatedAt: new Date(),
    })
    .where(eq(subscriptions.churchId, membership.churchId));

  // Create or reuse Stripe customer
  let customerId = sub.stripeCustomerId;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: session.user.email!,
      name: session.user.name || undefined,
      metadata: { churchId: membership.churchId },
    });
    customerId = customer.id;
    await db
      .update(subscriptions)
      .set({ stripeCustomerId: customerId, updatedAt: new Date() })
      .where(eq(subscriptions.churchId, membership.churchId));
  }

  const checkoutSession = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    line_items: [{ price: getStripePriceId(plan), quantity: 1 }],
    allow_promotion_codes: true,
    payment_method_collection: "always",
    success_url: `${env.NEXT_PUBLIC_APP_URL}/onboarding/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${env.NEXT_PUBLIC_APP_URL}/onboarding?canceled=true`,
    metadata: { churchId: membership.churchId, plan },
    subscription_data: {
      metadata: { churchId: membership.churchId, plan },
      ...(isTrial && { trial_period_days: TRIAL_DAYS }),
    },
  });

  return { success: true, checkoutUrl: checkoutSession.url };
}

export async function createChurch(input: {
  name: string;
  slug?: string;
  plan: "standard" | "enterprise";
  websiteDomain?: string | null;
  /**
   * Optional YouTube auto-sync setup captured during onboarding. Only
   * persisted on Enterprise — silently ignored on Standard so the form
   * state is forgiving. The initial backfill is fired after the response
   * flushes so checkout isn't blocked by it.
   */
  youtubeChannelUrl?: string;
  youtubeSchedule?: {
    dayOfWeek: number;
    hourLocal: number;
    timezone: string;
  };
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return { error: "You must be signed in" };
  }

  const slug = input.slug || slugify(input.name);

  const parsed = onboardingSchema.safeParse({
    name: input.name,
    slug,
    plan: input.plan,
    websiteDomain: input.websiteDomain || null,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const existingSlug = await db.query.churches.findFirst({
    where: eq(churches.slug, parsed.data.slug),
  });

  if (existingSlug) {
    return {
      error: "This URL is already taken. Please choose a different one.",
    };
  }

  // Both plans start as a 14-day free trial with full plan limits.
  const isTrial = true;
  const limits = getPlanLimits(parsed.data.plan);
  const normalizedWebsite = parsed.data.websiteDomain
    ? normalizeUrl(parsed.data.websiteDomain)
    : null;

  const wantsYouTubeSync =
    canUseYouTubeSync(parsed.data.plan) && !!input.youtubeChannelUrl?.trim();

  // Validate the YouTube channel before we touch the database so the user
  // gets a clean "channel not found" message and can go back to fix it.
  // Supadata occasionally returns non-JSON (Cloudflare HTML) for transient
  // upstream issues; withRetry handles most of those, but if we still can't
  // reach the API we distinguish "channel not found" from "upstream down"
  // so the admin doesn't think their URL is bad.
  let resolvedChannel: Awaited<ReturnType<typeof resolveChannel>> | null = null;
  if (wantsYouTubeSync) {
    try {
      resolvedChannel = await resolveChannel(input.youtubeChannelUrl!);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      const isSupadataInternalError =
        err &&
        typeof err === "object" &&
        "error" in err &&
        (err as { error?: unknown }).error === "internal-error";
      const isTransient =
        isSupadataInternalError ||
        /unexpected error response|invalid response format|failed to parse response|fetch failed|ECONNRESET|ETIMEDOUT|50[0234]/i.test(
          message
        );
      if (isTransient) {
        return {
          error:
            "YouTube lookup is temporarily unavailable. Please try again in a moment, or skip this step and connect YouTube later from Settings.",
        };
      }
      return {
        error: `Could not find YouTube channel: ${message}`,
      };
    }
  }

  const result = await db.transaction(async (tx) => {
    const [church] = await tx
      .insert(churches)
      .values({
        name: parsed.data.name,
        slug: parsed.data.slug,
        isActive: false,
        websiteDomain: normalizedWebsite,
      })
      .returning({ id: churches.id, slug: churches.slug });

    await tx.insert(memberships).values({
      userId: session.user.id,
      churchId: church.id,
      role: "owner",
    });

    await tx.insert(subscriptions).values({
      churchId: church.id,
      plan: parsed.data.plan,
      status: "incomplete",
      questionLimit: limits.questionLimit,
    });

    // Seed the per-church crawl configuration with empty filter arrays
    // so the settings page can read it without an extra round trip.
    await tx.insert(churchWebsiteConfigs).values({
      churchId: church.id,
    });

    if (wantsYouTubeSync && resolvedChannel) {
      await tx.insert(youtubeChannelSyncs).values({
        churchId: church.id,
        channelUrl: input.youtubeChannelUrl!,
        channelId: resolvedChannel.channelId,
        channelHandle: resolvedChannel.handle ?? null,
        channelTitle: resolvedChannel.title,
        channelThumbnail: resolvedChannel.thumbnail ?? null,
        dayOfWeek: input.youtubeSchedule?.dayOfWeek ?? 1,
        hourLocal: input.youtubeSchedule?.hourLocal ?? 3,
        timezone: input.youtubeSchedule?.timezone ?? "UTC",
        createdBy: session.user.id,
      });
    }

    return church;
  });

  // Fire-and-forget branding bootstrap. Runs while the user is in
  // Stripe checkout, so by the time they bounce back to /settings their
  // logo and colors should already be themed. Failure is non-fatal —
  // the church just keeps default branding.
  if (normalizedWebsite) {
    try {
      await tasks.trigger("extract-website-branding", {
        churchId: result.id,
        domain: normalizedWebsite,
      });
    } catch (err) {
      console.error(
        `[onboarding] failed to trigger extract-website-branding for ${result.id}`,
        err
      );
    }
  }

  // Create Stripe customer
  const customer = await stripe.customers.create({
    email: session.user.email!,
    name: session.user.name || undefined,
    metadata: { churchId: result.id },
  });

  // Store Stripe customer ID
  await db
    .update(subscriptions)
    .set({ stripeCustomerId: customer.id, updatedAt: new Date() })
    .where(eq(subscriptions.churchId, result.id));

  // Create Checkout Session
  const checkoutSession = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customer.id,
    line_items: [{ price: getStripePriceId(parsed.data.plan), quantity: 1 }],
    allow_promotion_codes: true,
    payment_method_collection: "always",
    success_url: `${env.NEXT_PUBLIC_APP_URL}/onboarding/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${env.NEXT_PUBLIC_APP_URL}/onboarding?canceled=true`,
    metadata: { churchId: result.id, plan: parsed.data.plan },
    subscription_data: {
      metadata: { churchId: result.id, plan: parsed.data.plan },
      ...(isTrial && { trial_period_days: TRIAL_DAYS }),
    },
  });

  // If the admin wired up auto-sync, arm the weekly schedule and kick off
  // the first backfill in the background. Deliberately after() so the
  // redirect to Stripe happens immediately.
  if (wantsYouTubeSync) {
    after(async () => {
      const sync = await db.query.youtubeChannelSyncs.findFirst({
        where: eq(youtubeChannelSyncs.churchId, result.id),
      });
      if (!sync) return;
      try {
        const scheduleId = await upsertChurchSyncSchedule({
          syncId: sync.id,
          dayOfWeek: sync.dayOfWeek,
          hourLocal: sync.hourLocal,
          timezone: sync.timezone,
        });
        await db
          .update(youtubeChannelSyncs)
          .set({ triggerScheduleId: scheduleId, updatedAt: new Date() })
          .where(eq(youtubeChannelSyncs.id, sync.id));
      } catch (err) {
        console.error(
          `[createChurch] schedules.create failed for sync ${sync.id}:`,
          err
        );
      }
      try {
        await tasks.trigger("sync-youtube-channel", {
          syncId: sync.id,
          mode: "initial",
        });
      } catch (err) {
        console.error(
          `[createChurch] initial YouTube sync trigger failed for ${sync.id}:`,
          err
        );
      }
    });
  }

  return { success: true, checkoutUrl: checkoutSession.url };
}
