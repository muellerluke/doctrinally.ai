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
import { onboardingSchema } from "@/lib/validations/onboarding";
import { slugify } from "@/lib/utils";
import { stripe, getStripePriceId } from "@/lib/stripe";
import { getPlanLimits, TRIAL_DAYS } from "@/lib/plans";
import { env } from "@/lib/env";
import { canUseYouTubeSync } from "@/lib/plan-gating";
import { resolveChannel } from "@/trigger/utils/youtube-channel";
import { upsertChurchSyncSchedule } from "@/lib/youtube-sync/trigger-schedules";
import { normalizeUrl } from "@/lib/firecrawl";

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
  let resolvedChannel: Awaited<ReturnType<typeof resolveChannel>> | null = null;
  if (wantsYouTubeSync) {
    try {
      resolvedChannel = await resolveChannel(input.youtubeChannelUrl!);
    } catch (err) {
      return {
        error:
          err instanceof Error
            ? `Could not find YouTube channel: ${err.message}`
            : "Could not find YouTube channel",
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
