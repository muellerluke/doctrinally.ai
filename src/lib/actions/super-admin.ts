"use server";

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
  churches,
  users,
  memberships,
  subscriptions,
  documents,
  chats,
  messages,
} from "@/db/schema";
import { getDateBounds, getGrouping, type DateRange } from "@/lib/date-utils";

// ---- Types ----

export interface SuperAdminOverview {
  totalChurches: number;
  activeChurches: number;
  totalUsers: number;
  totalDocuments: number;
  totalMessages: number;
  failedDocuments: number;
  standardPlans: number;
  enterprisePlans: number;
  trialingChurches: number;
}

export interface ChurchActivity {
  churchName: string;
  messages: number;
  documents: number;
}

export interface ChurchRow {
  id: string;
  name: string;
  slug: string;
  plan: string | null;
  status: string | null;
  isActive: boolean;
  memberCount: number;
  documentCount: number;
  messageCount: number;
  createdAt: Date;
}

export interface UserRow {
  id: string;
  name: string | null;
  email: string;
  churches: { name: string; role: string }[];
  createdAt: Date;
}

export interface FailedDocumentRow {
  id: string;
  churchName: string;
  title: string;
  type: string;
  errorMessage: string | null;
  createdAt: Date;
}

export interface TimeSeriesPoint {
  date: string;
  value: number;
}

// ---- Overview ----

export async function getSuperAdminOverview(): Promise<SuperAdminOverview> {
  const [
    churchCount,
    activeChurchCount,
    userCount,
    docCount,
    msgCount,
    failedCount,
    standardCount,
    enterpriseCount,
    trialingCount,
  ] = await Promise.all([
    db.select({ c: count() }).from(churches),
    db.select({ c: count() }).from(churches).where(eq(churches.isActive, true)),
    db.select({ c: count() }).from(users),
    db.select({ c: count() }).from(documents),
    db
      .select({ c: count() })
      .from(messages)
      .innerJoin(chats, eq(messages.chatId, chats.id))
      .where(and(eq(chats.isAdminTest, false), eq(messages.role, "user"))),
    db
      .select({ c: count() })
      .from(documents)
      .where(eq(documents.status, "failed")),
    db
      .select({ c: count() })
      .from(subscriptions)
      .where(and(eq(subscriptions.plan, "standard"), eq(subscriptions.status, "active"))),
    db
      .select({ c: count() })
      .from(subscriptions)
      .where(and(eq(subscriptions.plan, "enterprise"), eq(subscriptions.status, "active"))),
    db
      .select({ c: count() })
      .from(subscriptions)
      .where(eq(subscriptions.status, "trialing")),
  ]);

  return {
    totalChurches: churchCount[0]?.c ?? 0,
    activeChurches: activeChurchCount[0]?.c ?? 0,
    totalUsers: userCount[0]?.c ?? 0,
    totalDocuments: docCount[0]?.c ?? 0,
    totalMessages: msgCount[0]?.c ?? 0,
    failedDocuments: failedCount[0]?.c ?? 0,
    standardPlans: standardCount[0]?.c ?? 0,
    enterprisePlans: enterpriseCount[0]?.c ?? 0,
    trialingChurches: trialingCount[0]?.c ?? 0,
  };
}

// ---- Per-Church Activity (for bar chart) ----

export async function getPerChurchActivity(
  range: DateRange
): Promise<ChurchActivity[]> {
  const { start, end } = getDateBounds(range);

  try {
    const rows = await db.execute(sql`
      SELECT
        ch.name AS church_name,
        coalesce(msg.cnt, 0)::int AS messages,
        coalesce(doc.cnt, 0)::int AS documents
      FROM churches ch
      LEFT JOIN (
        SELECT c.church_id, count(*)::int AS cnt
        FROM messages m
        JOIN chats c ON c.id = m.chat_id
        WHERE c.is_admin_test = false
          AND m.role = 'user'
          AND m.created_at >= ${start.toISOString()}::timestamptz
          AND m.created_at <= ${end.toISOString()}::timestamptz
        GROUP BY c.church_id
      ) msg ON msg.church_id = ch.id
      LEFT JOIN (
        SELECT d.church_id, count(*)::int AS cnt
        FROM documents d
        WHERE d.created_at >= ${start.toISOString()}::timestamptz
          AND d.created_at <= ${end.toISOString()}::timestamptz
        GROUP BY d.church_id
      ) doc ON doc.church_id = ch.id
      WHERE ch.is_active = true
      ORDER BY messages DESC, documents DESC
      LIMIT 30
    `);

    return (
      rows as unknown as {
        church_name: string;
        messages: number;
        documents: number;
      }[]
    ).map((r) => ({
      churchName: r.church_name,
      messages: r.messages,
      documents: r.documents,
    }));
  } catch (err) {
    console.error("getPerChurchActivity failed:", err);
    return [];
  }
}

// ---- Global Trends ----

export async function getMessageTrendAllChurches(
  range: DateRange
): Promise<TimeSeriesPoint[]> {
  const { start, end } = getDateBounds(range);
  const grouping = getGrouping(range);

  try {
    const rows = await db.execute(sql`
      SELECT
        date_trunc(${sql.raw(`'${grouping}'`)}, m.created_at)::date AS date,
        count(*)::int AS value
      FROM messages m
      JOIN chats c ON c.id = m.chat_id
      WHERE c.is_admin_test = false
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
    console.error("getMessageTrendAllChurches failed:", err);
    return [];
  }
}

export async function getDocumentTrendAllChurches(
  range: DateRange
): Promise<TimeSeriesPoint[]> {
  const { start, end } = getDateBounds(range);
  const grouping = getGrouping(range);

  try {
    const rows = await db.execute(sql`
      SELECT
        date_trunc(${sql.raw(`'${grouping}'`)}, created_at)::date AS date,
        count(*)::int AS value
      FROM documents
      WHERE created_at >= ${start.toISOString()}::timestamptz
        AND created_at <= ${end.toISOString()}::timestamptz
      GROUP BY 1
      ORDER BY 1
    `);

    return (rows as unknown as { date: string; value: number }[]).map((r) => ({
      date: format(new Date(r.date), "yyyy-MM-dd"),
      value: r.value,
    }));
  } catch (err) {
    console.error("getDocumentTrendAllChurches failed:", err);
    return [];
  }
}

// ---- All Churches ----

export async function getAllChurches(): Promise<ChurchRow[]> {
  try {
    const rows = await db.execute(sql`
      SELECT
        ch.id,
        ch.name,
        ch.slug,
        s.plan,
        s.status,
        ch.is_active,
        coalesce(mem.cnt, 0)::int AS member_count,
        coalesce(doc.cnt, 0)::int AS document_count,
        coalesce(msg.cnt, 0)::int AS message_count,
        ch.created_at
      FROM churches ch
      LEFT JOIN subscriptions s ON s.church_id = ch.id
      LEFT JOIN (
        SELECT church_id, count(*)::int AS cnt FROM memberships GROUP BY church_id
      ) mem ON mem.church_id = ch.id
      LEFT JOIN (
        SELECT church_id, count(*)::int AS cnt FROM documents GROUP BY church_id
      ) doc ON doc.church_id = ch.id
      LEFT JOIN (
        SELECT c.church_id, count(*)::int AS cnt
        FROM messages m
        JOIN chats c ON c.id = m.chat_id
        WHERE c.is_admin_test = false AND m.role = 'user'
        GROUP BY c.church_id
      ) msg ON msg.church_id = ch.id
      ORDER BY ch.created_at DESC
    `);

    return (
      rows as unknown as {
        id: string;
        name: string;
        slug: string;
        plan: string | null;
        status: string | null;
        is_active: boolean;
        member_count: number;
        document_count: number;
        message_count: number;
        created_at: string;
      }[]
    ).map((r) => ({
      id: r.id,
      name: r.name,
      slug: r.slug,
      plan: r.plan,
      status: r.status,
      isActive: r.is_active,
      memberCount: r.member_count,
      documentCount: r.document_count,
      messageCount: r.message_count,
      createdAt: new Date(r.created_at),
    }));
  } catch (err) {
    console.error("getAllChurches failed:", err);
    return [];
  }
}

// ---- All Users ----

export async function getAllUsers(): Promise<UserRow[]> {
  try {
    const allUsers = await db.query.users.findMany({
      orderBy: (u, { desc }) => [desc(u.createdAt)],
    });

    const allMemberships = await db.execute(sql`
      SELECT m.user_id, m.role, ch.name AS church_name
      FROM memberships m
      JOIN churches ch ON ch.id = m.church_id
    `);

    const membershipMap = new Map<
      string,
      { name: string; role: string }[]
    >();
    for (const row of allMemberships as unknown as {
      user_id: string;
      role: string;
      church_name: string;
    }[]) {
      const list = membershipMap.get(row.user_id) ?? [];
      list.push({ name: row.church_name, role: row.role });
      membershipMap.set(row.user_id, list);
    }

    return allUsers.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      churches: membershipMap.get(u.id) ?? [],
      createdAt: u.createdAt,
    }));
  } catch (err) {
    console.error("getAllUsers failed:", err);
    return [];
  }
}

// ---- Failed Documents ----

export async function getFailedDocuments(): Promise<FailedDocumentRow[]> {
  try {
    const rows = await db.execute(sql`
      SELECT
        d.id,
        ch.name AS church_name,
        d.title,
        d.type,
        d.error_message,
        d.created_at
      FROM documents d
      JOIN churches ch ON ch.id = d.church_id
      WHERE d.status = 'failed'
      ORDER BY d.created_at DESC
      LIMIT 50
    `);

    return (
      rows as unknown as {
        id: string;
        church_name: string;
        title: string;
        type: string;
        error_message: string | null;
        created_at: string;
      }[]
    ).map((r) => ({
      id: r.id,
      churchName: r.church_name,
      title: r.title,
      type: r.type,
      errorMessage: r.error_message,
      createdAt: new Date(r.created_at),
    }));
  } catch (err) {
    console.error("getFailedDocuments failed:", err);
    return [];
  }
}
