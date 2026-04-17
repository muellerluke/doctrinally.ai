import { describe, it, expect, vi } from "vitest";
import bcrypt from "bcryptjs";
import { getTestDb } from "../../helpers/db";
import {
  signedWebhookRequest,
  checkoutCompletedEvent,
  subscriptionUpdatedEvent,
} from "../../helpers/stripe-events";

// Per-test session override. Real `next-auth` has complex next/headers deps
// when invoked outside a request context, so we stub `getServerSession` —
// but every other piece of the journey (bcrypt, DB, Stripe HMAC, migrations,
// webhook routing, AuthJWT secret) is exercised for real.
let session: { user: { id: string; email: string; name: string } } | null = null;
vi.mock("next-auth", () => ({
  getServerSession: vi.fn(async () => session),
}));

// Real signature verification on inbound webhook. Outbound Stripe calls are
// captured so we can assert arg shape.
const customersCreate = vi.fn(async (args: { email: string; metadata: Record<string, string> }) => ({
  id: `cus_test_${Date.now()}`,
  email: args.email,
  metadata: args.metadata,
}));
const checkoutSessionsCreate = vi.fn(async () => ({
  id: `cs_test_${Date.now()}`,
  url: "https://checkout.stripe.test/session",
}));
const subscriptionsRetrieve = vi.fn();

vi.mock("@/lib/stripe", async () => {
  const actual = await vi.importActual<typeof import("stripe")>("stripe");
  const RealStripe = actual.default;
  const realStripe = new RealStripe("sk_test_dummy");
  return {
    stripe: {
      webhooks: realStripe.webhooks,
      customers: { create: customersCreate },
      checkout: { sessions: { create: checkoutSessionsCreate, retrieve: vi.fn() } },
      subscriptions: { retrieve: subscriptionsRetrieve },
      billingPortal: { sessions: { create: vi.fn() } },
      invoiceItems: { create: vi.fn() },
    },
    getStripePriceId: (plan: "standard" | "enterprise") =>
      plan === "enterprise" ? "price_test_enterprise" : "price_test_standard",
  };
});

// Lazy imports so the mocks above apply before these modules load.
const { signUp } = await import("@/lib/actions/auth");
const { createChurch } = await import("@/lib/actions/onboarding");
const { POST: stripeWebhookPOST } = await import("@/app/api/webhooks/stripe/route");

describe("Full onboarding journey (flagship)", () => {
  it("sign-up → create church → Stripe webhooks → trialing → active → chat-ready", async () => {
    const db = getTestDb();

    // ─── 1. Real sign-up with real bcrypt ─────────────────────────────
    const signUpResult = await signUp({
      name: "Pastor Jane",
      email: "jane@nc.church",
      password: "StrongPass1",
    });
    expect(signUpResult).toMatchObject({ success: true });

    const user = await db.query.users.findFirst({
      where: (u, { eq }) => eq(u.email, "jane@nc.church"),
    });
    expect(user).toBeDefined();
    expect(user!.hashedPassword).toBeTruthy();
    // Real bcrypt — verifies round-trip works.
    expect(await bcrypt.compare("StrongPass1", user!.hashedPassword!)).toBe(true);

    // ─── 2. Stamp session for the newly-created user ──────────────────
    session = {
      user: { id: user!.id, email: user!.email, name: user!.name },
    };

    // ─── 3. Create the church (real DB transaction, real plan limits) ─
    const churchResult = await createChurch({
      name: "North Cross Church",
      slug: "north-cross",
      plan: "enterprise",
    });
    expect(churchResult).toMatchObject({
      success: true,
      checkoutUrl: expect.stringContaining("stripe.test"),
    });

    const church = await db.query.churches.findFirst({
      where: (c, { eq }) => eq(c.slug, "north-cross"),
    });
    expect(church).toBeDefined();
    expect(church!.isActive).toBe(false);

    const sub = await db.query.subscriptions.findFirst({
      where: (s, { eq }) => eq(s.churchId, church!.id),
    });
    expect(sub).toMatchObject({
      plan: "enterprise",
      status: "incomplete",
      questionLimit: 3000,
    });
    expect(sub!.stripeCustomerId).toMatch(/^cus_test_/);

    const stripeCustomerId = sub!.stripeCustomerId!;
    const stripeSubscriptionId = "sub_test_journey";

    const trialStartSec = Math.floor(Date.UTC(2026, 3, 17) / 1000);
    const trialEndSec = Math.floor(Date.UTC(2026, 4, 1) / 1000);
    // Respond to `stripe.subscriptions.retrieve(...)` during checkout handling.
    subscriptionsRetrieve.mockResolvedValue({
      id: stripeSubscriptionId,
      status: "trialing",
      items: {
        data: [
          {
            current_period_start: trialStartSec,
            current_period_end: trialEndSec,
          },
        ],
      },
    });

    // ─── 4. Stripe fires checkout.session.completed ───────────────────
    const checkoutEvent = checkoutCompletedEvent({
      churchId: church!.id,
      plan: "enterprise",
      stripeCustomerId,
      stripeSubscriptionId,
    });
    const checkoutResponse = await stripeWebhookPOST(signedWebhookRequest(checkoutEvent));
    expect(checkoutResponse.status).toBe(200);

    // After checkout.session.completed, the church should be active and a
    // usage record should exist for the trial period.
    const churchAfterCheckout = await db.query.churches.findFirst({
      where: (c, { eq }) => eq(c.id, church!.id),
    });
    expect(churchAfterCheckout!.isActive).toBe(true);
    const usageRow = await db.query.usageRecords.findFirst({
      where: (u, { eq }) => eq(u.churchId, church!.id),
    });
    expect(usageRow).toBeDefined();
    expect(usageRow!.questions).toBe(0);

    // ─── 5. Stripe fires customer.subscription.updated → trialing ─────
    const trialingResponse = await stripeWebhookPOST(
      signedWebhookRequest(
        subscriptionUpdatedEvent({
          churchId: church!.id,
          plan: "enterprise",
          stripeSubscriptionId,
          status: "trialing",
          periodStartSec: trialStartSec,
          periodEndSec: trialEndSec,
        })
      )
    );
    expect(trialingResponse.status).toBe(200);

    const subAfterTrialing = await db.query.subscriptions.findFirst({
      where: (s, { eq }) => eq(s.churchId, church!.id),
    });
    expect(subAfterTrialing!.status).toBe("trialing");
    expect(subAfterTrialing!.questionLimit).toBe(3000);
    expect(subAfterTrialing!.currentPeriodStart?.getTime()).toBe(trialStartSec * 1000);
    expect(subAfterTrialing!.currentPeriodEnd?.getTime()).toBe(trialEndSec * 1000);

    // ─── 6. Stripe fires subscription.updated → active ────────────────
    const activeResponse = await stripeWebhookPOST(
      signedWebhookRequest(
        subscriptionUpdatedEvent({
          churchId: church!.id,
          plan: "enterprise",
          stripeSubscriptionId,
          status: "active",
          periodStartSec: trialStartSec,
          periodEndSec: trialEndSec,
        })
      )
    );
    expect(activeResponse.status).toBe(200);

    const subAfterActive = await db.query.subscriptions.findFirst({
      where: (s, { eq }) => eq(s.churchId, church!.id),
    });
    expect(subAfterActive!.status).toBe("active");
    expect(subAfterActive!.questionLimit).toBe(3000); // limits stay stable

    // ─── 7. Assert the outbound Stripe calls had the right shape ─────
    expect(customersCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        email: "jane@nc.church",
        metadata: expect.objectContaining({ churchId: church!.id }),
      })
    );
    expect(checkoutSessionsCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        mode: "subscription",
        customer: stripeCustomerId,
        subscription_data: expect.objectContaining({
          trial_period_days: 14,
          metadata: expect.objectContaining({
            churchId: church!.id,
            plan: "enterprise",
          }),
        }),
      })
    );
  });
});
