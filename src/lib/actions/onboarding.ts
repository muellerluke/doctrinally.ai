"use server";

import { getServerSession } from "next-auth";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { churches, memberships, subscriptions } from "@/db/schema";
import { authOptions } from "@/lib/auth";
import { onboardingSchema } from "@/lib/validations/onboarding";
import { slugify } from "@/lib/utils";
import { stripe, getStripePriceId } from "@/lib/stripe";
import { getPlanLimits } from "@/lib/plans";
import { env } from "@/lib/env";

export async function createChurch(input: {
  name: string;
  slug?: string;
  plan: "standard" | "enterprise";
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

  const limits = getPlanLimits(parsed.data.plan);

  const result = await db.transaction(async (tx) => {
    const [church] = await tx
      .insert(churches)
      .values({
        name: parsed.data.name,
        slug: parsed.data.slug,
        isActive: false,
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
      documentUploadLimit: limits.documentUploadLimit,
      questionLimit: limits.questionLimit,
    });

    return church;
  });

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
    success_url: `${env.NEXT_PUBLIC_APP_URL}/onboarding/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${env.NEXT_PUBLIC_APP_URL}/onboarding?canceled=true`,
    metadata: { churchId: result.id, plan: parsed.data.plan },
    subscription_data: {
      metadata: { churchId: result.id, plan: parsed.data.plan },
    },
  });

  return { success: true, checkoutUrl: checkoutSession.url };
}
