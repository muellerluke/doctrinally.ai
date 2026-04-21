import { eq, and, lte, gte, sql } from "drizzle-orm";
import { db } from "@/db";
import { usageRecords, subscriptions } from "@/db/schema";
import { getOverageRates, hasSermonWriter, type PlanType } from "@/lib/plans";

export async function incrementQuestionCount(churchId: string) {
  const now = new Date();
  const record = await db.query.usageRecords.findFirst({
    where: and(
      eq(usageRecords.churchId, churchId),
      lte(usageRecords.periodStart, now),
      gte(usageRecords.periodEnd, now)
    ),
  });

  if (!record) return;

  await db
    .update(usageRecords)
    .set({
      questions: sql`${usageRecords.questions} + 1`,
      updatedAt: new Date(),
    })
    .where(eq(usageRecords.id, record.id));
}

export async function incrementVisitorCount(churchId: string) {
  const now = new Date();
  const record = await db.query.usageRecords.findFirst({
    where: and(
      eq(usageRecords.churchId, churchId),
      lte(usageRecords.periodStart, now),
      gte(usageRecords.periodEnd, now)
    ),
  });

  if (!record) return;

  await db
    .update(usageRecords)
    .set({
      visitors: sql`${usageRecords.visitors} + 1`,
      updatedAt: new Date(),
    })
    .where(eq(usageRecords.id, record.id));
}

export async function getCurrentUsage(churchId: string) {
  const now = new Date();
  return db.query.usageRecords.findFirst({
    where: and(
      eq(usageRecords.churchId, churchId),
      lte(usageRecords.periodStart, now),
      gte(usageRecords.periodEnd, now)
    ),
  });
}

export async function getOverageReport(churchId: string) {
  const [usage, sub] = await Promise.all([
    getCurrentUsage(churchId),
    db.query.subscriptions.findFirst({
      where: eq(subscriptions.churchId, churchId),
    }),
  ]);

  if (!usage || !sub) return null;

  const rates = getOverageRates(sub.plan as PlanType);
  const questionOverage = Math.max(0, usage.questions - sub.questionLimit);

  return {
    questions: usage.questions,
    questionLimit: sub.questionLimit,
    questionOverage,
    questionOverageCost: questionOverage * rates.question,
    totalOverageCost: questionOverage * rates.question,
  };
}

/**
 * Returns the effective message limit for a church, accounting for the
 * overage switch and cap. When overage is disabled the limit equals the
 * plan's questionLimit. When enabled it equals questionLimit + cap.
 */
export async function getEffectiveMessageLimit(churchId: string) {
  const sub = await db.query.subscriptions.findFirst({
    where: eq(subscriptions.churchId, churchId),
    columns: {
      questionLimit: true,
      messageOverageEnabled: true,
      messageOverageCap: true,
    },
  });

  if (!sub) return null;

  return {
    limit: sub.questionLimit,
    overageEnabled: sub.messageOverageEnabled,
    overageCap: sub.messageOverageCap,
    effectiveMax: sub.messageOverageEnabled
      ? sub.questionLimit + sub.messageOverageCap
      : sub.questionLimit,
  };
}

export async function canUseService(churchId: string): Promise<boolean> {
  const sub = await db.query.subscriptions.findFirst({
    where: eq(subscriptions.churchId, churchId),
  });

  if (!sub) return false;

  // Allow usage for active, past_due (grace period), and trialing.
  return (
    sub.status === "active" ||
    sub.status === "past_due" ||
    sub.status === "trialing"
  );
}

// -----------------------------------------------------------------------
// Sermon-writer billing
// -----------------------------------------------------------------------

/**
 * Atomically add `cents` to the current period's sermon token spend.
 * Called from the `/api/sermons/chat` streamText `onFinish` callback after
 * pricing the turn's token usage via `priceTokens()`.
 *
 * No-ops silently if there is no current period row (the church should
 * always have one, but we do not want to fail the AI response over
 * accounting). Callers should log separately.
 */
export async function incrementSermonTokenSpend(
  churchId: string,
  cents: number
) {
  if (cents <= 0) return;
  const now = new Date();
  const record = await db.query.usageRecords.findFirst({
    where: and(
      eq(usageRecords.churchId, churchId),
      lte(usageRecords.periodStart, now),
      gte(usageRecords.periodEnd, now)
    ),
  });
  if (!record) return;

  await db
    .update(usageRecords)
    .set({
      sermonTokensCents: sql`${usageRecords.sermonTokensCents} + ${cents}`,
      updatedAt: new Date(),
    })
    .where(eq(usageRecords.id, record.id));
}

/**
 * Returns the sermon-writer budget and current spend for a church's active
 * period. Returns `null` when the plan does not include the feature — callers
 * should treat that as "feature not available" rather than "budget at zero".
 */
export async function getSermonBudgetStatus(churchId: string): Promise<{
  plan: PlanType;
  enabled: boolean;
  budgetCents: number;
  spentCents: number;
  remainingCents: number;
  exhausted: boolean;
} | null> {
  const [sub, usage] = await Promise.all([
    db.query.subscriptions.findFirst({
      where: eq(subscriptions.churchId, churchId),
      columns: {
        plan: true,
        sermonBudgetCents: true,
      },
    }),
    getCurrentUsage(churchId),
  ]);

  if (!sub) return null;

  const enabled = hasSermonWriter(sub.plan);
  const budgetCents = enabled ? sub.sermonBudgetCents : 0;
  const spentCents = usage?.sermonTokensCents ?? 0;
  const remainingCents = Math.max(0, budgetCents - spentCents);

  return {
    plan: sub.plan,
    enabled,
    budgetCents,
    spentCents,
    remainingCents,
    exhausted: enabled && spentCents >= budgetCents,
  };
}
