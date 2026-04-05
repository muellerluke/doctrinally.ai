"use server";

import { getServerSession } from "next-auth";
import { eq, and, lte, gte } from "drizzle-orm";
import { db } from "@/db";
import {
  churches,
  subscriptions,
  memberships,
  usageRecords,
} from "@/db/schema";
import { authOptions } from "@/lib/auth";
import { stripe } from "@/lib/stripe";
import { env } from "@/lib/env";
import { getPlanLimits, getOverageRates, PLANS } from "@/lib/plans";
import type { PlanType } from "@/lib/plans";

export async function verifyCheckoutSession(sessionId: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return { error: "You must be signed in" };
  }

  const checkoutSession = await stripe.checkout.sessions.retrieve(sessionId, {
    expand: ["subscription"],
  });

  // For trial checkouts, Stripe returns payment_status="no_payment_required"
  // since no charge happens until day 15. Accept both.
  if (
    checkoutSession.payment_status !== "paid" &&
    checkoutSession.payment_status !== "no_payment_required"
  ) {
    return { error: "Payment was not completed" };
  }

  const churchId = checkoutSession.metadata?.churchId;
  const plan = checkoutSession.metadata?.plan as PlanType | undefined;
  if (!churchId || !plan) {
    return { error: "Invalid checkout session" };
  }

  // Get subscription ID from checkout session
  const subscriptionRef = checkoutSession.subscription;
  const subscriptionId =
    typeof subscriptionRef === "string"
      ? subscriptionRef
      : subscriptionRef?.id;

  if (!subscriptionId) {
    return { error: "Subscription data unavailable" };
  }

  // Idempotent activation - only update if still incomplete
  const existing = await db.query.subscriptions.findFirst({
    where: eq(subscriptions.churchId, churchId),
  });

  if (!existing) {
    return { error: "Subscription record not found" };
  }

  if (existing.status === "incomplete") {
    // Fetch full subscription to get period from items
    const stripeSubscription =
      await stripe.subscriptions.retrieve(subscriptionId);
    const item = stripeSubscription.items?.data?.[0];

    if (!item) {
      return { error: "Subscription has no items" };
    }

    const periodStart = new Date(item.current_period_start * 1000);
    const periodEnd = new Date(item.current_period_end * 1000);

    // Respect Stripe's actual status — for trial checkouts this will be
    // "trialing" and current_period_end will be the trial end date.
    const nextStatus =
      stripeSubscription.status === "trialing" ? "trialing" : "active";

    await db.transaction(async (tx) => {
      await tx
        .update(subscriptions)
        .set({
          stripeSubscriptionId: stripeSubscription.id,
          status: nextStatus,
          currentPeriodStart: periodStart,
          currentPeriodEnd: periodEnd,
          updatedAt: new Date(),
        })
        .where(eq(subscriptions.churchId, churchId));

      await tx
        .update(churches)
        .set({ isActive: true, updatedAt: new Date() })
        .where(eq(churches.id, churchId));

      await tx
        .insert(usageRecords)
        .values({
          churchId,
          periodStart,
          periodEnd,
          documentUploads: 0,
          questions: 0,
        })
        .onConflictDoNothing();
    });
  }

  return { success: true };
}

export async function createBillingPortalSession() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return { error: "You must be signed in" };
  }

  // Verify user is an owner
  const membership = await db.query.memberships.findFirst({
    where: eq(memberships.userId, session.user.id),
  });

  if (!membership || membership.role !== "owner") {
    return { error: "Only owners can manage billing" };
  }

  const sub = await db.query.subscriptions.findFirst({
    where: eq(subscriptions.churchId, membership.churchId),
  });

  if (!sub?.stripeCustomerId) {
    return { error: "No billing account found" };
  }

  const portalSession = await stripe.billingPortal.sessions.create({
    customer: sub.stripeCustomerId,
    return_url: `${env.NEXT_PUBLIC_APP_URL}/billing`,
  });

  return { success: true, url: portalSession.url };
}

export async function getSubscriptionWithUsage(churchId: string) {
  const sub = await db.query.subscriptions.findFirst({
    where: eq(subscriptions.churchId, churchId),
  });

  if (!sub) {
    return null;
  }

  const now = new Date();
  const usage = await db.query.usageRecords.findFirst({
    where: and(
      eq(usageRecords.churchId, churchId),
      lte(usageRecords.periodStart, now),
      gte(usageRecords.periodEnd, now)
    ),
  });

  const rates = getOverageRates();
  const uploadOverage = Math.max(
    0,
    (usage?.documentUploads ?? 0) - sub.documentUploadLimit
  );
  const questionOverage = Math.max(
    0,
    (usage?.questions ?? 0) - sub.questionLimit
  );

  const plan = sub.plan as PlanType;
  const planDetails = PLANS[plan];

  return {
    plan: sub.plan,
    planName: planDetails.name,
    planPrice: planDetails.price,
    status: sub.status,
    currentPeriodStart: sub.currentPeriodStart,
    currentPeriodEnd: sub.currentPeriodEnd,
    documentUploadLimit: sub.documentUploadLimit,
    questionLimit: sub.questionLimit,
    documentUploads: usage?.documentUploads ?? 0,
    questions: usage?.questions ?? 0,
    uploadOverage,
    questionOverage,
    uploadOverageCost: uploadOverage * rates.documentUpload,
    questionOverageCost: questionOverage * rates.question,
    totalOverageCost:
      uploadOverage * rates.documentUpload +
      questionOverage * rates.question,
    features: planDetails.features,
  };
}
