import { describe, it, expect, beforeEach, vi } from "vitest";
import { eq } from "drizzle-orm";
import { getTestDb, resetTestDbData } from "../../helpers/db";
import { makeUser } from "../../helpers/factories";
import { mockStripe } from "../../helpers/mocks";

// Mock NextAuth — session is returned based on a per-test override.
let currentSession: { user: { id: string; email: string; name: string } } | null = null;
vi.mock("next-auth", () => ({
  getServerSession: vi.fn(async () => currentSession),
}));

// Mock the Stripe client and price-id helper.
vi.mock("@/lib/stripe", () => ({
  stripe: mockStripe,
  getStripePriceId: vi.fn((plan: "standard" | "enterprise") =>
    plan === "enterprise" ? "price_test_enterprise" : "price_test_standard"
  ),
}));

// Import AFTER mocks are declared so @/db, next-auth, stripe all resolve to
// the mocked versions.
const { createChurch } = await import("@/lib/actions/onboarding");

describe("createChurch", () => {
  beforeEach(async () => {
    await resetTestDbData();
    vi.clearAllMocks();
    currentSession = null;
  });

  it("creates the church, owner membership, and a pending subscription with plan limits", async () => {
    const user = await makeUser({
      email: "owner@example.com",
      name: "Owner",
    });
    currentSession = {
      user: { id: user.id, email: user.email, name: user.name },
    };

    const result = await createChurch({
      name: "North Cross Church",
      slug: "north-cross",
      plan: "enterprise",
    });

    expect(result).toMatchObject({
      success: true,
      checkoutUrl: expect.stringContaining("stripe.test"),
    });

    const db = getTestDb();
    const church = await db.query.churches.findFirst({
      where: (c, { eq }) => eq(c.slug, "north-cross"),
    });
    expect(church).toBeDefined();
    expect(church!.name).toBe("North Cross Church");
    expect(church!.isActive).toBe(false); // becomes true only after Stripe webhook

    const membership = await db.query.memberships.findFirst({
      where: (m, { eq }) => eq(m.churchId, church!.id),
    });
    expect(membership).toMatchObject({
      userId: user.id,
      role: "owner",
    });

    const subscription = await db.query.subscriptions.findFirst({
      where: (s, { eq }) => eq(s.churchId, church!.id),
    });
    // THIS IS THE REGRESSION ASSERTION — if the schema re-adds
    // `document_upload_limit` as NOT NULL (or any other orphan NOT NULL
    // column Drizzle doesn't know about), this insert will fail and this
    // test will fail before the prod outage can recur.
    expect(subscription).toMatchObject({
      plan: "enterprise",
      status: "incomplete",
      questionLimit: 3000,
      stripeCustomerId: expect.stringContaining("cus_test_"),
    });

    expect(mockStripe.customers.create).toHaveBeenCalledWith(
      expect.objectContaining({
        email: "owner@example.com",
        metadata: expect.objectContaining({ churchId: church!.id }),
      })
    );
    expect(mockStripe.checkout.sessions.create).toHaveBeenCalledWith(
      expect.objectContaining({
        mode: "subscription",
        customer: expect.stringContaining("cus_test_"),
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

  it("uses standard plan limits (1500) when plan = standard", async () => {
    const user = await makeUser();
    currentSession = {
      user: { id: user.id, email: user.email, name: user.name },
    };

    await createChurch({ name: "Small Church", plan: "standard" });

    const db = getTestDb();
    const subs = await db.query.subscriptions.findMany();
    expect(subs).toHaveLength(1);
    expect(subs[0].plan).toBe("standard");
    expect(subs[0].questionLimit).toBe(1500);
  });

  it("rejects when the slug is already taken", async () => {
    const user = await makeUser();
    currentSession = {
      user: { id: user.id, email: user.email, name: user.name },
    };

    await createChurch({ name: "First Church", slug: "same-slug", plan: "standard" });
    const result = await createChurch({
      name: "Second Church",
      slug: "same-slug",
      plan: "standard",
    });
    expect(result).toMatchObject({
      error: expect.stringContaining("already taken"),
    });
  });

  it("rejects when unauthenticated", async () => {
    currentSession = null;
    const result = await createChurch({
      name: "Anon Church",
      plan: "standard",
    });
    expect(result).toMatchObject({ error: "You must be signed in" });
  });

  it("rejects invalid slug format", async () => {
    const user = await makeUser();
    currentSession = {
      user: { id: user.id, email: user.email, name: user.name },
    };
    const result = await createChurch({
      name: "Bad Slug Church",
      slug: "Bad Slug", // uppercase + space
      plan: "standard",
    });
    expect(result).toMatchObject({ error: expect.any(String) });
    expect("success" in result ? result.success : false).toBe(false);
  });
});

// Suppress the unused `eq` warning from the top-level import — it's used inside
// the nested drizzle query builder closures.
void eq;
