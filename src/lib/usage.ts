import { eq, and, lte, gte, sql } from "drizzle-orm";
import { db } from "@/db";
import { usageRecords, subscriptions } from "@/db/schema";
import { getOverageRates } from "@/lib/plans";

export async function incrementDocumentUpload(churchId: string) {
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
      documentUploads: sql`${usageRecords.documentUploads} + 1`,
      updatedAt: new Date(),
    })
    .where(eq(usageRecords.id, record.id));
}

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

  const rates = getOverageRates();
  const uploadOverage = Math.max(
    0,
    usage.documentUploads - sub.documentUploadLimit
  );
  const questionOverage = Math.max(0, usage.questions - sub.questionLimit);

  return {
    documentUploads: usage.documentUploads,
    questions: usage.questions,
    documentUploadLimit: sub.documentUploadLimit,
    questionLimit: sub.questionLimit,
    uploadOverage,
    questionOverage,
    uploadOverageCost: uploadOverage * rates.documentUpload,
    questionOverageCost: questionOverage * rates.question,
    totalOverageCost:
      uploadOverage * rates.documentUpload +
      questionOverage * rates.question,
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
