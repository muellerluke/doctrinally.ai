import { describe, it, expect, vi } from "vitest";
import {
  makeUser,
  makeChurch,
  makeMembership,
  makeSubscription,
  makeUsageRecord,
} from "../../helpers/factories";
import {
  signedWebhookRequest,
  invoiceCreatedEvent,
} from "../../helpers/stripe-events";

const invoiceItemsCreate = vi.fn(async () => ({ id: "ii_test" }));

vi.mock("@/lib/stripe", async () => {
  const actual = await vi.importActual<typeof import("stripe")>("stripe");
  const RealStripe = actual.default;
  const realStripe = new RealStripe("sk_test_dummy");
  return {
    stripe: {
      webhooks: realStripe.webhooks,
      customers: { create: vi.fn() },
      checkout: { sessions: { create: vi.fn(), retrieve: vi.fn() } },
      subscriptions: { retrieve: vi.fn() },
      billingPortal: { sessions: { create: vi.fn() } },
      invoiceItems: { create: invoiceItemsCreate },
    },
    getStripePriceId: vi.fn(),
  };
});

const { POST } = await import("@/app/api/webhooks/stripe/route");

async function arrange(options: {
  questionLimit: number;
  questions: number;
  messageOverageEnabled: boolean;
  messageOverageCap: number;
}) {
  const user = await makeUser();
  const church = await makeChurch();
  await makeMembership(user.id, church.id, "owner");
  const periodStart = new Date(Date.UTC(2026, 3, 1));
  const periodEnd = new Date(Date.UTC(2026, 4, 1));
  await makeSubscription(church.id, {
    plan: "standard",
    status: "active",
    questionLimit: options.questionLimit,
    messageOverageEnabled: options.messageOverageEnabled,
    messageOverageCap: options.messageOverageCap,
    stripeSubscriptionId: "sub_test_overage",
    stripeCustomerId: "cus_test_overage",
    currentPeriodStart: periodStart,
    currentPeriodEnd: periodEnd,
  });
  await makeUsageRecord(church.id, {
    periodStart,
    periodEnd,
    questions: options.questions,
    visitors: 0,
  });
}

describe("Stripe webhook: invoice.created — real signatures + overage billing", () => {
  it("charges 500 * $0.25 = $125 (12,500 cents) when usage is 500 over", async () => {
    await arrange({
      questionLimit: 1500,
      questions: 2000,
      messageOverageEnabled: true,
      messageOverageCap: 10_000,
    });

    invoiceItemsCreate.mockClear();
    const response = await POST(
      signedWebhookRequest(
        invoiceCreatedEvent({
          invoiceId: "in_test_1",
          stripeSubscriptionId: "sub_test_overage",
        })
      )
    );
    expect(response.status).toBe(200);
    expect(invoiceItemsCreate).toHaveBeenCalledTimes(1);
    expect(invoiceItemsCreate.mock.calls[0][0]).toMatchObject({
      customer: "cus_test_overage",
      invoice: "in_test_1",
      amount: 12_500,
      currency: "usd",
    });
  });

  it("caps at messageOverageCap even when usage is higher", async () => {
    await arrange({
      questionLimit: 1500,
      questions: 5000,
      messageOverageEnabled: true,
      messageOverageCap: 1000,
    });
    invoiceItemsCreate.mockClear();

    await POST(
      signedWebhookRequest(
        invoiceCreatedEvent({
          invoiceId: "in_test_2",
          stripeSubscriptionId: "sub_test_overage",
        })
      )
    );
    expect(invoiceItemsCreate.mock.calls[0][0].amount).toBe(25_000); // 1000 * $0.25
  });

  it("does nothing when overage is disabled", async () => {
    await arrange({
      questionLimit: 1500,
      questions: 2500,
      messageOverageEnabled: false,
      messageOverageCap: 10_000,
    });
    invoiceItemsCreate.mockClear();

    await POST(
      signedWebhookRequest(
        invoiceCreatedEvent({
          invoiceId: "in_test_3",
          stripeSubscriptionId: "sub_test_overage",
        })
      )
    );
    expect(invoiceItemsCreate).not.toHaveBeenCalled();
  });

  it("does nothing when usage is within the limit", async () => {
    await arrange({
      questionLimit: 1500,
      questions: 1000,
      messageOverageEnabled: true,
      messageOverageCap: 10_000,
    });
    invoiceItemsCreate.mockClear();

    await POST(
      signedWebhookRequest(
        invoiceCreatedEvent({
          invoiceId: "in_test_4",
          stripeSubscriptionId: "sub_test_overage",
        })
      )
    );
    expect(invoiceItemsCreate).not.toHaveBeenCalled();
  });
});
