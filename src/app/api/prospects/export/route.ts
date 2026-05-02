import { getServerSession } from "next-auth";
import { and, desc, eq, inArray, or } from "drizzle-orm";
import { db } from "@/db";
import {
  prospects,
  subscriptions,
  embedWidgetSessions,
} from "@/db/schema";
import { authOptions } from "@/lib/auth";
import { getActiveMembershipForUser } from "@/lib/active-church";
import { isEmbeddedChatAvailable } from "@/lib/plan-gating";

/**
 * Export every prospect for the active church as CSV. Inlines the auth
 * lookup instead of calling `requireMembership()` because that helper
 * `redirect()`s on failure — a browser following the 307 would save the
 * sign-in HTML as `prospects.csv`, with no error surfaced to the user.
 *
 * The summary column is the freshest non-null `conversation_summary`
 * across all of the prospect's sessions (linked via
 * `metadata.sessionHistory[]` and the canonical `chat_id`). No new LLM
 * calls — the embed chat route refreshes summaries fire-and-forget after
 * each turn.
 */
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 });
  }

  const active = await getActiveMembershipForUser(session.user.id);
  if (!active) {
    return new Response("Forbidden", { status: 403 });
  }
  const { church } = active;

  const sub = await db.query.subscriptions.findFirst({
    where: eq(subscriptions.churchId, church.id),
  });
  if (!sub || !(await isEmbeddedChatAvailable(church.id, sub.plan))) {
    return new Response("Forbidden", { status: 403 });
  }

  const rows = await db
    .select({
      id: prospects.id,
      name: prospects.name,
      email: prospects.email,
      phone: prospects.phone,
      status: prospects.status,
      sourceType: prospects.sourceType,
      sourceUrl: prospects.sourceUrl,
      metadata: prospects.metadata,
      notes: prospects.notes,
      chatId: prospects.chatId,
      createdAt: prospects.createdAt,
    })
    .from(prospects)
    .where(eq(prospects.churchId, church.id))
    .orderBy(desc(prospects.createdAt));

  // Build the union of all session ids to fetch in one query: every
  // session referenced from any prospect's metadata.sessionHistory plus
  // every prospect's canonical chatId (which points to a session whose
  // id may NOT be in sessionHistory — merge-on-return only appends
  // *additional* sessions).
  const sessionIds = new Set<string>();
  const chatIds = new Set<string>();
  for (const r of rows) {
    const history = r.metadata?.sessionHistory ?? [];
    for (const id of history) sessionIds.add(id);
    if (r.chatId) chatIds.add(r.chatId);
  }

  const sessionRows =
    sessionIds.size || chatIds.size
      ? await db
          .select({
            id: embedWidgetSessions.id,
            chatId: embedWidgetSessions.chatId,
            conversationSummary: embedWidgetSessions.conversationSummary,
            summaryUpdatedAt: embedWidgetSessions.summaryUpdatedAt,
          })
          .from(embedWidgetSessions)
          .where(
            and(
              eq(embedWidgetSessions.churchId, church.id),
              or(
                sessionIds.size
                  ? inArray(embedWidgetSessions.id, [...sessionIds])
                  : undefined,
                chatIds.size
                  ? inArray(embedWidgetSessions.chatId, [...chatIds])
                  : undefined
              )
            )
          )
      : [];

  // Walk sessions and pick the freshest non-null summary per prospect.
  // A session belongs to a prospect if (a) its id is in that prospect's
  // sessionHistory or (b) its chatId equals the prospect's chatId.
  const summaryByProspectId = new Map<string, string>();
  const summaryUpdatedByProspectId = new Map<string, Date>();
  for (const r of rows) {
    const history = new Set(r.metadata?.sessionHistory ?? []);
    const matching = sessionRows.filter(
      (s) =>
        (history.has(s.id) || s.chatId === r.chatId) &&
        s.conversationSummary &&
        s.conversationSummary.trim().length > 0
    );
    let best: { text: string; at: Date | null } | null = null;
    for (const s of matching) {
      const at = s.summaryUpdatedAt ?? null;
      if (
        !best ||
        (at && (!best.at || at.getTime() > best.at.getTime()))
      ) {
        best = { text: s.conversationSummary as string, at };
      }
    }
    if (best) {
      summaryByProspectId.set(r.id, best.text);
      if (best.at) summaryUpdatedByProspectId.set(r.id, best.at);
    }
  }

  // Session count = unique chatIds derived from the prospect's links.
  // Mirrors the detail page's chatList sizing.
  function countSessions(r: (typeof rows)[number]): number {
    const ids = new Set<string>();
    if (r.chatId) ids.add(r.chatId);
    const history = r.metadata?.sessionHistory ?? [];
    for (const sid of history) {
      const s = sessionRows.find((x) => x.id === sid);
      if (s) ids.add(s.chatId);
    }
    return ids.size;
  }

  const header = [
    "Name",
    "Email",
    "Phone",
    "Status",
    "Source Type",
    "Source URL",
    "Source Page Title",
    "Captured At",
    "Session Count",
    "Notes",
    "Conversation Summary",
  ];

  const lines: string[] = [header.map(csvField).join(",")];
  for (const r of rows) {
    lines.push(
      [
        r.name,
        r.email,
        r.phone,
        r.status,
        r.sourceType,
        r.sourceUrl,
        r.metadata?.sourcePageTitle ?? null,
        r.createdAt.toISOString(),
        countSessions(r),
        r.notes,
        summaryByProspectId.get(r.id) ?? null,
      ]
        .map(csvField)
        .join(",")
    );
  }

  const body = "﻿" + lines.join("\r\n") + "\r\n";

  const today = new Date().toISOString().slice(0, 10);
  const filename = `prospects-${church.slug}-${today}.csv`;

  return new Response(body, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}

function csvField(v: string | number | null | undefined): string {
  if (v === null || v === undefined) return "";
  let s = String(v);
  // Defang CSV-injection: a leading =, +, -, @, tab, or CR is interpreted
  // as a formula by Excel and Google Sheets. Prefix a single quote so the
  // field renders as text. The single quote is stripped by the spreadsheet
  // app on display.
  if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
  // RFC 4180: fields containing a quote, comma, CR, or LF must be
  // wrapped in quotes; internal quotes are doubled.
  if (/[",\r\n]/.test(s)) s = '"' + s.replace(/"/g, '""') + '"';
  return s;
}
