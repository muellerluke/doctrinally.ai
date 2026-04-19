"use server";

import { getServerSession } from "next-auth";
import {
  eq,
  and,
  gte,
  lte,
  sql,
  count,
  desc,
} from "drizzle-orm";
import { format } from "date-fns";
import { db } from "@/db";
import {
  chats,
  messages,
  documents,
  memberships,
  topics,
  usageRecords,
} from "@/db/schema";
import { authOptions } from "@/lib/auth";
import { getDateBounds, getGrouping, calcDelta, type DateRange } from "@/lib/date-utils";
import { isSuperAdminEmail } from "@/lib/super-admin";
export type { DateRange } from "@/lib/date-utils";

export interface AnalyticsSummary {
  questions: number;
  questionsDelta: number | null;
  uploads: number;
  uploadsDelta: number | null;
  visitors: number;
  visitorsDelta: number | null;
  unanswered: number;
  unansweredDelta: number | null;
}

export interface TimeSeriesPoint {
  date: string;
  value: number;
}

export interface TopicCount {
  topic: string;
  count: number;
}

export interface UncoveredTopic {
  topic: string;
  count: number;
  lastAskedAt: Date;
}

// ---- Helpers ----

async function requireAdmin(churchId: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return null;

  // Platform super-admin (luke@doctrinally.ai) gets synthetic owner access
  // to any church in the DB — mirrors the impersonation path in
  // active-church.ts so the dashboard renders analytics for churches he's
  // switched into but has no real membership for.
  if (isSuperAdminEmail(session.user.email)) {
    return {
      id: "super-admin-synthetic",
      userId: session.user.id,
      churchId,
      role: "owner" as const,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  const membership = await db.query.memberships.findFirst({
    where: and(
      eq(memberships.userId, session.user.id),
      eq(memberships.churchId, churchId)
    ),
  });

  if (!membership || !["admin", "owner"].includes(membership.role)) return null;
  return membership;
}

// ---- Summary ----

export async function getAnalyticsSummary(
  churchId: string,
  range: DateRange
): Promise<AnalyticsSummary | null> {
  if (!(await requireAdmin(churchId))) return null;

  const { start, end, prevStart, prevEnd } = getDateBounds(range);

  // Questions: count user messages in non-admin-test chats
  const [curQ, prevQ] = await Promise.all([
    db
      .select({ c: count() })
      .from(messages)
      .innerJoin(chats, eq(messages.chatId, chats.id))
      .where(
        and(
          eq(chats.churchId, churchId),
          eq(chats.isAdminTest, false),
          eq(messages.role, "user"),
          gte(messages.createdAt, start),
          lte(messages.createdAt, end)
        )
      ),
    db
      .select({ c: count() })
      .from(messages)
      .innerJoin(chats, eq(messages.chatId, chats.id))
      .where(
        and(
          eq(chats.churchId, churchId),
          eq(chats.isAdminTest, false),
          eq(messages.role, "user"),
          gte(messages.createdAt, prevStart),
          lte(messages.createdAt, prevEnd)
        )
      ),
  ]);

  // Uploads
  const [curU, prevU] = await Promise.all([
    db
      .select({ c: count() })
      .from(documents)
      .where(
        and(
          eq(documents.churchId, churchId),
          gte(documents.createdAt, start),
          lte(documents.createdAt, end)
        )
      ),
    db
      .select({ c: count() })
      .from(documents)
      .where(
        and(
          eq(documents.churchId, churchId),
          gte(documents.createdAt, prevStart),
          lte(documents.createdAt, prevEnd)
        )
      ),
  ]);

  // Visitors: sum from usage_records
  const [curV, prevV] = await Promise.all([
    db
      .select({ v: sql<number>`coalesce(sum(${usageRecords.visitors}), 0)` })
      .from(usageRecords)
      .where(
        and(
          eq(usageRecords.churchId, churchId),
          gte(usageRecords.periodStart, start)
        )
      ),
    db
      .select({ v: sql<number>`coalesce(sum(${usageRecords.visitors}), 0)` })
      .from(usageRecords)
      .where(
        and(
          eq(usageRecords.churchId, churchId),
          gte(usageRecords.periodStart, prevStart),
          lte(usageRecords.periodEnd, prevEnd)
        )
      ),
  ]);

  // Unanswered: assistant messages without citations in non-admin-test chats
  const [curUn, prevUn] = await Promise.all([
    db
      .select({ c: count() })
      .from(messages)
      .innerJoin(chats, eq(messages.chatId, chats.id))
      .where(
        and(
          eq(chats.churchId, churchId),
          eq(chats.isAdminTest, false),
          eq(messages.role, "assistant"),
          eq(messages.hasCitations, false),
          gte(messages.createdAt, start),
          lte(messages.createdAt, end)
        )
      ),
    db
      .select({ c: count() })
      .from(messages)
      .innerJoin(chats, eq(messages.chatId, chats.id))
      .where(
        and(
          eq(chats.churchId, churchId),
          eq(chats.isAdminTest, false),
          eq(messages.role, "assistant"),
          eq(messages.hasCitations, false),
          gte(messages.createdAt, prevStart),
          lte(messages.createdAt, prevEnd)
        )
      ),
  ]);

  const questions = curQ[0]?.c ?? 0;
  const uploads = curU[0]?.c ?? 0;
  const visitors = Number(curV[0]?.v) || 0;
  const unanswered = curUn[0]?.c ?? 0;

  return {
    questions,
    questionsDelta: calcDelta(questions, prevQ[0]?.c ?? 0),
    uploads,
    uploadsDelta: calcDelta(uploads, prevU[0]?.c ?? 0),
    visitors,
    visitorsDelta: calcDelta(visitors, Number(prevV[0]?.v) || 0),
    unanswered,
    unansweredDelta: calcDelta(unanswered, prevUn[0]?.c ?? 0),
  };
}

// ---- Trends ----

export async function getQuestionTrend(
  churchId: string,
  range: DateRange
): Promise<TimeSeriesPoint[]> {
  if (!(await requireAdmin(churchId))) return [];

  const { start, end } = getDateBounds(range);
  const grouping = getGrouping(range);

  try {
    const rows = await db.execute(sql`
      SELECT
        date_trunc(${sql.raw(`'${grouping}'`)}, m.created_at)::date AS date,
        count(*)::int AS value
      FROM messages m
      JOIN chats c ON c.id = m.chat_id
      WHERE c.church_id = ${churchId}
        AND c.is_admin_test = false
        AND m.role = 'user'
        AND m.created_at >= ${start.toISOString()}::timestamptz
        AND m.created_at <= ${end.toISOString()}::timestamptz
      GROUP BY 1
      ORDER BY 1
    `);

    return (rows as unknown as { date: string; value: number }[]).map((r) => ({
      date: format(new Date(r.date), "yyyy-MM-dd"),
      value: r.value,
    }));
  } catch (err) {
    console.error("getQuestionTrend failed:", err);
    return [];
  }
}

export async function getUploadTrend(
  churchId: string,
  range: DateRange
): Promise<TimeSeriesPoint[]> {
  if (!(await requireAdmin(churchId))) return [];

  const { start, end } = getDateBounds(range);
  const grouping = getGrouping(range);

  try {
    const rows = await db.execute(sql`
      SELECT
        date_trunc(${sql.raw(`'${grouping}'`)}, created_at)::date AS date,
        count(*)::int AS value
      FROM documents
      WHERE church_id = ${churchId}
        AND created_at >= ${start.toISOString()}::timestamptz
        AND created_at <= ${end.toISOString()}::timestamptz
      GROUP BY 1
      ORDER BY 1
    `);

    return (rows as unknown as { date: string; value: number }[]).map((r) => ({
      date: format(new Date(r.date), "yyyy-MM-dd"),
      value: r.value,
    }));
  } catch (err) {
    console.error("getUploadTrend failed:", err);
    return [];
  }
}

// ---- Topics ----

export async function getTopTopics(
  churchId: string,
  range: DateRange,
  limit = 10
): Promise<TopicCount[]> {
  if (!(await requireAdmin(churchId))) return [];

  const { start, end } = getDateBounds(range);

  try {
    const rows = await db.execute(sql`
      SELECT t.label AS topic, count(*)::int AS cnt
      FROM messages m
      JOIN chats c ON c.id = m.chat_id
      JOIN topics t ON t.id = m.topic_id
      WHERE c.church_id = ${churchId}
        AND c.is_admin_test = false
        AND m.topic_id IS NOT NULL
        AND m.role = 'user'
        AND m.created_at >= ${start.toISOString()}::timestamptz
        AND m.created_at <= ${end.toISOString()}::timestamptz
      GROUP BY t.label
      ORDER BY cnt DESC
      LIMIT ${limit}
    `);

    return (rows as unknown as { topic: string; cnt: number }[]).map((r) => ({
      topic: r.topic,
      count: r.cnt,
    }));
  } catch (err) {
    console.error("getTopTopics failed:", err);
    return [];
  }
}

// ---- Uncovered Topics ----

export async function getUncoveredTopics(
  churchId: string,
  range: DateRange,
  limit = 8
): Promise<UncoveredTopic[]> {
  if (!(await requireAdmin(churchId))) return [];

  const { start, end } = getDateBounds(range);

  try {
    // Find topics where questions were asked but the AI had no citations
    // to draw from. These represent gaps in the church's content library.
    // Only topic labels are shown — never verbatim member questions.
    const rows = await db.execute(sql`
      SELECT
        t.label AS topic,
        count(*)::int AS cnt,
        max(um.created_at) AS last_asked_at
      FROM messages um
      JOIN chats c ON c.id = um.chat_id
      JOIN messages am ON am.chat_id = um.chat_id
        AND am.role = 'assistant'
        AND am.has_citations = false
        AND am.created_at > um.created_at
      JOIN topics t ON t.id = um.topic_id
      WHERE c.church_id = ${churchId}
        AND c.is_admin_test = false
        AND um.role = 'user'
        AND um.topic_id IS NOT NULL
        AND um.created_at >= ${start.toISOString()}::timestamptz
        AND um.created_at <= ${end.toISOString()}::timestamptz
      GROUP BY t.label
      ORDER BY cnt DESC
      LIMIT ${limit}
    `);

    return (rows as unknown as { topic: string; cnt: number; last_asked_at: Date }[]).map(
      (r) => ({
        topic: r.topic,
        count: r.cnt,
        lastAskedAt: new Date(r.last_asked_at),
      })
    );
  } catch (err) {
    console.error("getUncoveredTopics failed:", err);
    return [];
  }
}
