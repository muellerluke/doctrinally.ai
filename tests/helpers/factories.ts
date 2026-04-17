import { randomUUID } from "node:crypto";
import { getTestDb } from "./db";
import {
  users,
  churches,
  memberships,
  subscriptions,
  usageRecords,
  documents,
} from "@/db/schema";

type Document = typeof documents.$inferSelect;

let emailCounter = 0;
const uniqueEmail = () => `test-${Date.now()}-${emailCounter++}@example.com`;

const uniqueSlug = () => `test-${randomUUID().slice(0, 8)}`;

export async function makeUser(overrides: Partial<typeof users.$inferInsert> = {}) {
  const db = getTestDb();
  const [user] = await db
    .insert(users)
    .values({
      name: "Test User",
      email: uniqueEmail(),
      hashedPassword: "$2a$10$deadbeef.fake.bcrypt.hash",
      ...overrides,
    })
    .returning();
  return user;
}

export async function makeChurch(
  overrides: Partial<typeof churches.$inferInsert> = {}
) {
  const db = getTestDb();
  const [church] = await db
    .insert(churches)
    .values({
      name: "Test Church",
      slug: uniqueSlug(),
      isActive: false,
      ...overrides,
    })
    .returning();
  return church;
}

export async function makeMembership(
  userId: string,
  churchId: string,
  role: "owner" | "admin" | "member" = "owner"
) {
  const db = getTestDb();
  const [m] = await db
    .insert(memberships)
    .values({ userId, churchId, role })
    .returning();
  return m;
}

export async function makeSubscription(
  churchId: string,
  overrides: Partial<typeof subscriptions.$inferInsert> = {}
) {
  const db = getTestDb();
  const [sub] = await db
    .insert(subscriptions)
    .values({
      churchId,
      plan: "standard",
      status: "trialing",
      questionLimit: 1500,
      ...overrides,
    })
    .returning();
  return sub;
}

export async function makeUsageRecord(
  churchId: string,
  overrides: Partial<typeof usageRecords.$inferInsert> = {}
) {
  const db = getTestDb();
  const now = new Date();
  const [u] = await db
    .insert(usageRecords)
    .values({
      churchId,
      periodStart: new Date(now.getFullYear(), now.getMonth(), 1),
      periodEnd: new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59),
      questions: 0,
      visitors: 0,
      ...overrides,
    })
    .returning();
  return u;
}

export async function makeDocument(
  churchId: string,
  overrides: Partial<typeof documents.$inferInsert> = {}
): Promise<Document> {
  const db = getTestDb();
  const [d] = await db
    .insert(documents)
    .values({
      churchId,
      title: "Test Document",
      type: "pdf",
      status: "uploaded",
      ...overrides,
    })
    .returning();
  return d;
}

// Convenience: spin up owner → church → active subscription in one call.
export async function makeOwnerWithChurch(options?: {
  plan?: "standard" | "enterprise";
  status?: "trialing" | "active" | "past_due" | "canceled" | "incomplete";
  questionLimit?: number;
}) {
  const user = await makeUser();
  const church = await makeChurch({ isActive: true });
  await makeMembership(user.id, church.id, "owner");
  const subscription = await makeSubscription(church.id, {
    plan: options?.plan ?? "standard",
    status: options?.status ?? "active",
    questionLimit:
      options?.questionLimit ?? (options?.plan === "enterprise" ? 3000 : 1500),
  });
  const usage = await makeUsageRecord(church.id);
  return { user, church, subscription, usage };
}
