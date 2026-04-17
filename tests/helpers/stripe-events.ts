import Stripe from "stripe";

// Signing/verification only — no live API calls happen with this client.
const stripeSigner = new Stripe("sk_test_dummy_for_signing");

/**
 * Build a signed Stripe webhook Request using the real `generateTestHeaderString`
 * helper. The route handler's real `stripe.webhooks.constructEvent` verifies
 * the signature against STRIPE_WEBHOOK_SECRET from .env.test.
 */
export function signedWebhookRequest(
  event: Record<string, unknown> & { type: string }
): Request {
  const body = JSON.stringify(event);
  const signature = stripeSigner.webhooks.generateTestHeaderString({
    payload: body,
    secret: process.env.STRIPE_WEBHOOK_SECRET!,
  });
  return new Request("http://localhost/api/webhooks/stripe", {
    method: "POST",
    headers: { "stripe-signature": signature, "Content-Type": "application/json" },
    body,
  });
}

// ─── Event fixture builders ─────────────────────────────────────────────

export function checkoutCompletedEvent(options: {
  churchId: string;
  plan: "standard" | "enterprise";
  stripeCustomerId: string;
  stripeSubscriptionId: string;
}) {
  return {
    id: `evt_${Math.random().toString(36).slice(2)}`,
    type: "checkout.session.completed" as const,
    data: {
      object: {
        id: `cs_test_${Math.random().toString(36).slice(2)}`,
        customer: options.stripeCustomerId,
        subscription: options.stripeSubscriptionId,
        metadata: { churchId: options.churchId, plan: options.plan },
      },
    },
  };
}

export function subscriptionUpdatedEvent(options: {
  churchId: string;
  plan: "standard" | "enterprise";
  stripeSubscriptionId: string;
  status: "active" | "trialing" | "past_due" | "canceled" | "incomplete";
  periodStartSec?: number;
  periodEndSec?: number;
}) {
  return {
    id: `evt_${Math.random().toString(36).slice(2)}`,
    type: "customer.subscription.updated" as const,
    data: {
      object: {
        id: options.stripeSubscriptionId,
        status: options.status,
        metadata: { churchId: options.churchId, plan: options.plan },
        items: {
          data:
            options.periodStartSec && options.periodEndSec
              ? [
                  {
                    current_period_start: options.periodStartSec,
                    current_period_end: options.periodEndSec,
                  },
                ]
              : [],
        },
      },
    },
  };
}

export function invoiceCreatedEvent(options: {
  invoiceId: string;
  stripeSubscriptionId: string;
}) {
  return {
    id: `evt_${Math.random().toString(36).slice(2)}`,
    type: "invoice.created" as const,
    data: {
      object: {
        id: options.invoiceId,
        parent: {
          type: "subscription_details",
          subscription_details: { subscription: options.stripeSubscriptionId },
        },
      },
    },
  };
}
