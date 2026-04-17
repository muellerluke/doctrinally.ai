import { describe, it, expect, vi } from "vitest";
import { getTestDb } from "../../helpers/db";
import {
  makeUser,
  makeChurch,
  makeMembership,
  makeSubscription,
} from "../../helpers/factories";
import {
  signedWebhookRequest,
  subscriptionUpdatedEvent,
} from "../../helpers/stripe-events";

// Mock only outbound Stripe API calls — signature verification runs for real.
vi.mock("@/lib/stripe", async () => {
  const actual = await vi.importActual<typeof import("stripe")>("stripe");
  const RealStripe = actual.default;
  const realStripe = new RealStripe("sk_test_dummy");
  return {
    // Real stripe client for signature verification, mocked outbound methods.
    stripe: {
      webhooks: realStripe.webhooks,
      customers: { create: vi.fn() },
      checkout: { sessions: { create: vi.fn(), retrieve: vi.fn() } },
      subscriptions: { retrieve: vi.fn() },
      billingPortal: { sessions: { create: vi.fn() } },
      invoiceItems: { create: vi.fn() },
    },
    getStripePriceId: vi.fn(),
  };
});

const { POST } = await import("@/app/api/webhooks/stripe/route");

describe("Stripe webhook: customer.subscription.updated (real signatures)", () => {
  it("flips trialing → active and updates period", async () => {
    const user = await makeUser();
    const church = await makeChurch();
    await makeMembership(user.id, church.id, "owner");
    await makeSubscription(church.id, {
      plan: "standard",
      status: "trialing",
      questionLimit: 1500,
      stripeSubscriptionId: "sub_test_update",
    });

    const periodStartSec = Math.floor(Date.UTC(2026, 3, 1) / 1000);
    const periodEndSec = Math.floor(Date.UTC(2026, 4, 1) / 1000);

    const response = await POST(
      signedWebhookRequest(
        subscriptionUpdatedEvent({
          churchId: church.id,
          plan: "standard",
          stripeSubscriptionId: "sub_test_update",
          status: "active",
          periodStartSec,
          periodEndSec,
        })
      )
    );
    expect(response.status).toBe(200);

    const db = getTestDb();
    const sub = await db.query.subscriptions.findFirst({
      where: (s, { eq }) => eq(s.churchId, church.id),
    });
    expect(sub!.status).toBe("active");
    expect(sub!.questionLimit).toBe(1500);
    expect(sub!.currentPeriodStart?.getTime()).toBe(periodStartSec * 1000);
    expect(sub!.currentPeriodEnd?.getTime()).toBe(periodEndSec * 1000);
  });

  it("bumps plan + limits when upgrading standard → enterprise", async () => {
    const user = await makeUser();
    const church = await makeChurch();
    await makeMembership(user.id, church.id, "owner");
    await makeSubscription(church.id, {
      plan: "standard",
      status: "active",
      questionLimit: 1500,
      stripeSubscriptionId: "sub_test_upgrade",
    });

    const response = await POST(
      signedWebhookRequest(
        subscriptionUpdatedEvent({
          churchId: church.id,
          plan: "enterprise",
          stripeSubscriptionId: "sub_test_upgrade",
          status: "active",
        })
      )
    );
    expect(response.status).toBe(200);

    const db = getTestDb();
    const sub = await db.query.subscriptions.findFirst({
      where: (s, { eq }) => eq(s.churchId, church.id),
    });
    expect(sub!.plan).toBe("enterprise");
    expect(sub!.questionLimit).toBe(3000);
  });

  it("rejects unsigned webhooks with 400", async () => {
    const request = new Request("http://localhost/api/webhooks/stripe", {
      method: "POST",
      body: "{}",
    });
    const response = await POST(request);
    expect(response.status).toBe(400);
  });

  it("rejects tampered signatures", async () => {
    const request = new Request("http://localhost/api/webhooks/stripe", {
      method: "POST",
      headers: { "stripe-signature": "t=1,v1=nonsense" },
      body: JSON.stringify({ type: "customer.subscription.updated" }),
    });
    const response = await POST(request);
    expect(response.status).toBe(400);
  });

  it("rejects a signature for a different payload (real HMAC check)", async () => {
    // Sign one body, swap in a different body — should fail constructEvent.
    const signed = signedWebhookRequest({ type: "customer.subscription.updated" });
    const tampered = new Request(signed.url, {
      method: "POST",
      headers: signed.headers,
      body: JSON.stringify({ type: "different.event.type", data: {} }),
    });
    const response = await POST(tampered);
    expect(response.status).toBe(400);
  });
});
