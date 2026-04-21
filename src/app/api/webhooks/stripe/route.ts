import { NextResponse } from "next/server";
import { eq, and } from "drizzle-orm";
import { stripe } from "@/lib/stripe";
import { env } from "@/lib/env";
import { db } from "@/db";
import { churches, subscriptions, usageRecords } from "@/db/schema";
import { getPlanLimits, getOverageRates } from "@/lib/plans";
import type { PlanType } from "@/lib/plans";
import type Stripe from "stripe";

export async function POST(request: Request) {
  const body = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("Webhook signature verification failed:", message);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutCompleted(
          event.data.object as Stripe.Checkout.Session
        );
        break;
      case "customer.subscription.updated":
        await handleSubscriptionUpdated(
          event.data.object as Stripe.Subscription
        );
        break;
      case "customer.subscription.deleted":
        await handleSubscriptionDeleted(
          event.data.object as Stripe.Subscription
        );
        break;
      case "invoice.payment_succeeded":
        await handleInvoicePaymentSucceeded(
          event.data.object as Stripe.Invoice
        );
        break;
      case "invoice.payment_failed":
        await handleInvoicePaymentFailed(event.data.object as Stripe.Invoice);
        break;
      case "invoice.created":
        await handleInvoiceCreated(event.data.object as Stripe.Invoice);
        break;
    }
  } catch (err) {
    console.error(`Error handling ${event.type}:`, err);
  }

  return NextResponse.json({ received: true });
}

function getSubscriptionPeriod(subscription: Stripe.Subscription) {
  // In Stripe v21 (dahlia), period is on subscription items
  const item = subscription.items?.data?.[0];
  if (item) {
    return {
      periodStart: new Date(item.current_period_start * 1000),
      periodEnd: new Date(item.current_period_end * 1000),
    };
  }
  return null;
}

function getInvoiceSubscriptionId(invoice: Stripe.Invoice): string | null {
  // In Stripe v21, subscription is on invoice.parent.subscription_details
  if (invoice.parent?.type === "subscription_details") {
    const sub = invoice.parent.subscription_details?.subscription;
    if (typeof sub === "string") return sub;
    if (sub && typeof sub === "object") return sub.id;
  }
  return null;
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const churchId = session.metadata?.churchId;
  if (!churchId) return;

  const existing = await db.query.subscriptions.findFirst({
    where: eq(subscriptions.churchId, churchId),
  });

  if (!existing || existing.status !== "incomplete") return;

  const subscriptionId =
    typeof session.subscription === "string"
      ? session.subscription
      : session.subscription?.id;

  if (!subscriptionId) return;

  const stripeSubscription =
    await stripe.subscriptions.retrieve(subscriptionId);
  const period = getSubscriptionPeriod(stripeSubscription);

  if (!period) return;

  // Honor trial status from Stripe so the DB matches reality.
  const isTrialing = stripeSubscription.status === "trialing";
  const nextStatus = isTrialing ? "trialing" : "active";

  await db.transaction(async (tx) => {
    await tx
      .update(subscriptions)
      .set({
        stripeSubscriptionId: stripeSubscription.id,
        status: nextStatus,
        currentPeriodStart: period.periodStart,
        currentPeriodEnd: period.periodEnd,
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
        periodStart: period.periodStart,
        periodEnd: period.periodEnd,
      })
      .onConflictDoNothing();
  });

}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  const churchId = subscription.metadata?.churchId;
  if (!churchId) return;

  const statusMap: Record<string, typeof subscriptions.$inferInsert.status> = {
    active: "active",
    past_due: "past_due",
    canceled: "canceled",
    trialing: "trialing",
    incomplete: "incomplete",
  };

  const mappedStatus = statusMap[subscription.status] ?? "incomplete";
  const period = getSubscriptionPeriod(subscription);

  // Trials run with full plan limits, so trialing → active transitions don't
  // change the stored limit; we still refresh the row in case the plan changed.
  const plan = subscription.metadata?.plan as PlanType | undefined;
  const limits = plan ? getPlanLimits(plan) : null;

  await db
    .update(subscriptions)
    .set({
      ...(plan &&
        limits && {
          plan,
          questionLimit: limits.questionLimit,
        }),
      status: mappedStatus,
      ...(period && {
        currentPeriodStart: period.periodStart,
        currentPeriodEnd: period.periodEnd,
      }),
      updatedAt: new Date(),
    })
    .where(eq(subscriptions.churchId, churchId));
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const churchId = subscription.metadata?.churchId;
  if (!churchId) return;

  await db.transaction(async (tx) => {
    await tx
      .update(subscriptions)
      .set({ status: "canceled", updatedAt: new Date() })
      .where(eq(subscriptions.churchId, churchId));

    await tx
      .update(churches)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(churches.id, churchId));
  });

}

async function handleInvoicePaymentSucceeded(invoice: Stripe.Invoice) {
  const subscriptionId = getInvoiceSubscriptionId(invoice);
  if (!subscriptionId) return;

  const sub = await db.query.subscriptions.findFirst({
    where: eq(subscriptions.stripeSubscriptionId, subscriptionId),
  });

  if (!sub) return;

  // Reactivate if past_due
  if (sub.status === "past_due") {
    await db
      .update(subscriptions)
      .set({ status: "active", updatedAt: new Date() })
      .where(eq(subscriptions.id, sub.id));
  }

  // Create usage record for new period if needed
  const stripeSubscription =
    await stripe.subscriptions.retrieve(subscriptionId);
  const period = getSubscriptionPeriod(stripeSubscription);

  if (period) {
    await db
      .update(subscriptions)
      .set({
        currentPeriodStart: period.periodStart,
        currentPeriodEnd: period.periodEnd,
        updatedAt: new Date(),
      })
      .where(eq(subscriptions.id, sub.id));

    await db
      .insert(usageRecords)
      .values({
        churchId: sub.churchId,
        periodStart: period.periodStart,
        periodEnd: period.periodEnd,
      })
      .onConflictDoNothing();
  }
}

async function handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
  const subscriptionId = getInvoiceSubscriptionId(invoice);
  if (!subscriptionId) return;

  await db
    .update(subscriptions)
    .set({ status: "past_due", updatedAt: new Date() })
    .where(eq(subscriptions.stripeSubscriptionId, subscriptionId));

  const sub = await db.query.subscriptions.findFirst({
    where: eq(subscriptions.stripeSubscriptionId, subscriptionId),
  });
  if (sub) {
  }
}

async function handleInvoiceCreated(invoice: Stripe.Invoice) {
  // Add overage charges to the draft invoice before it's finalized (~1 hour window).
  // At this point the old billing period has ended, so its usage record is final.
  const subscriptionId = getInvoiceSubscriptionId(invoice);
  if (!subscriptionId) return;

  const sub = await db.query.subscriptions.findFirst({
    where: eq(subscriptions.stripeSubscriptionId, subscriptionId),
  });

  if (!sub?.stripeCustomerId || !sub.currentPeriodStart) return;

  // Find the closing period's usage record (the period that just ended)
  const usage = await db.query.usageRecords.findFirst({
    where: and(
      eq(usageRecords.churchId, sub.churchId),
      eq(usageRecords.periodStart, sub.currentPeriodStart)
    ),
  });

  if (!usage) return;

  const rates = getOverageRates(sub.plan as PlanType);

  // Only charge message overage if the church has opted in. When enabled,
  // cap the overage at the admin-configured maximum.
  let questionOverage = 0;
  if (sub.messageOverageEnabled) {
    const rawOverage = Math.max(0, usage.questions - sub.questionLimit);
    questionOverage = Math.min(rawOverage, sub.messageOverageCap);
  }

  if (questionOverage <= 0) return;

  if (questionOverage > 0) {
    await stripe.invoiceItems.create({
      customer: sub.stripeCustomerId,
      invoice: invoice.id,
      description: `Message overage (${questionOverage} over ${sub.questionLimit} limit, capped at ${sub.messageOverageCap})`,
      amount: Math.round(questionOverage * rates.question * 100),
      currency: "usd",
    });
  }
}
