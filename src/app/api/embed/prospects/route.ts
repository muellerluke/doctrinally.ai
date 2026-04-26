import { NextResponse } from "next/server";
import { eq, and, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  embedWidgetSessions,
  prospects,
  subscriptions,
} from "@/db/schema";
import {
  checkOrigin,
  checkSecFetchHeaders,
  corsHeaders,
  handleOptions,
  readKey,
} from "@/lib/embed/origin";
import { verifyToken } from "@/lib/embed/session-token";
import { consumeToken } from "@/lib/embed/rate-limit";
import { isEmbeddedChatAvailable } from "@/lib/plan-gating";
import {
  getRequestIp,
  hashIp,
  verifyAndUpdateSessionIp,
} from "@/lib/embed/ip";
import { logger } from "@/lib/logger";

/**
 * Capture contact info from any form-based widget surface. Today the
 * widget captures via the AI's `captureProspect` tool inline in the
 * chat; this endpoint backs any future inline form (e.g. an "I just
 * want a callback" button outside the chat thread).
 *
 * Gated by:
 *   - valid session token (matching origin)
 *   - 1/session rate limit (plus a broader anti-spam bucket)
 *   - email-format check when email is provided
 *   - phone-format check when phone is provided
 *   - at-least-one of email/phone must be present
 *
 * Merge-on-return: if a prospect already exists with the same
 * (churchId, email) — or, when the visitor only provided a phone,
 * (churchId, phone) — update the existing row and append the new
 * session id to `metadata.sessionHistory`. Keeps the original
 * `chat_id` so the transcript link points at the first conversation.
 */

export const runtime = "nodejs";

const EMAIL_RX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
// Same lenient shape as the chat tool — preserves visitor-supplied
// formatting rather than normalizing to E.164.
const PHONE_RX = /^[+\d][\d\s().-]{6,29}$/;

export async function OPTIONS(request: Request) {
  const key = readKey(request);
  if (!key) return new NextResponse(null, { status: 400 });
  return handleOptions(request, key);
}

export async function POST(request: Request) {
  const key = readKey(request);
  if (!key) return new NextResponse("missing key", { status: 400 });

  const originCheck = await checkOrigin(request, key);
  if (!originCheck.ok || !originCheck.origin) {
    return new NextResponse("origin not allowed", { status: 403 });
  }
  const cors = corsHeaders(originCheck.origin);

  const secFetchReason = checkSecFetchHeaders(request);
  if (secFetchReason) {
    logger.warn("[embed/prospects] sec-fetch reject", { reason: secFetchReason });
    return new NextResponse("bad request", { status: 400, headers: cors });
  }

  const token = request.headers.get("x-doctrinally-session");
  const verified = verifyToken(token);
  if (!verified.ok || verified.value.origin !== originCheck.origin) {
    return new NextResponse("unauthorized", { status: 401, headers: cors });
  }

  // Per-session prospect creation is tiny — normal behavior is 0 or 1
  // submissions per session over the life of the token. The bucket
  // catches anything abnormal.
  if (!consumeToken("prospect:session", verified.value.sessionId)) {
    return new NextResponse("rate limited", { status: 429, headers: cors });
  }

  const sub = await db.query.subscriptions.findFirst({
    where: eq(subscriptions.churchId, verified.value.churchId),
  });
  if (!sub || !(await isEmbeddedChatAvailable(verified.value.churchId, sub.plan))) {
    return new NextResponse("widget not enabled", {
      status: 403,
      headers: cors,
    });
  }

  const body = (await request.json().catch(() => null)) as {
    name?: string;
    email?: string;
    phone?: string;
    pageUrl?: string;
    pageTitle?: string;
  } | null;
  if (!body) {
    return new NextResponse("bad request", { status: 400, headers: cors });
  }

  const trimmedName = (body.name ?? "").trim();
  const name =
    trimmedName.length >= 2 && trimmedName.length <= 120
      ? trimmedName
      : null;
  const emailRaw = (body.email ?? "").trim().toLowerCase();
  const email = emailRaw.length > 0 ? emailRaw : null;
  const phoneRaw = (body.phone ?? "").trim();
  const phone = phoneRaw.length > 0 ? phoneRaw : null;

  // Name is optional (visitors are often willing to share a phone or
  // email before a name) but if they did supply one, it has to look
  // plausible — too-short strings are noise.
  if (trimmedName && (trimmedName.length < 2 || trimmedName.length > 120)) {
    return NextResponse.json(
      { error: "name_invalid", message: "That name looks off." },
      { status: 400, headers: cors }
    );
  }
  if (email && (!EMAIL_RX.test(email) || email.length > 254)) {
    return NextResponse.json(
      { error: "email_invalid", message: "That email address looks off." },
      { status: 400, headers: cors }
    );
  }
  if (phone && (!PHONE_RX.test(phone) || phone.length > 30)) {
    return NextResponse.json(
      { error: "phone_invalid", message: "That phone number looks off." },
      { status: 400, headers: cors }
    );
  }
  if (!email && !phone) {
    return NextResponse.json(
      {
        error: "contact_required",
        message: "Please share an email or a phone number so we can follow up.",
      },
      { status: 400, headers: cors }
    );
  }

  const session = await db.query.embedWidgetSessions.findFirst({
    where: eq(embedWidgetSessions.sessionTokenHash, verified.value.tokenHash),
  });
  if (!session) {
    return new NextResponse("session not found", {
      status: 401,
      headers: cors,
    });
  }

  // Session-IP binding (same gate as /chat). Especially important
  // here because the prospect form is the highest-value mutation in
  // the widget — a stolen token used to spam fake leads has to
  // clear this on top of the per-session prospect bucket and the
  // origin/IP gates.
  const ipHash = hashIp(getRequestIp(request));
  const ipCheck = await verifyAndUpdateSessionIp({
    sessionId: session.id,
    ipHash,
  });
  if (!ipCheck.ok) {
    logger.warn("[embed/prospects] ip cap exceeded", {
      sessionId: verified.value.sessionId,
      ipsUsed: ipCheck.ipsUsed,
    });
    return new NextResponse("session bound to too many IPs", {
      status: 401,
      headers: cors,
    });
  }

  // Merge key preference: email first (the more stable identifier),
  // then phone for phone-only captures. Both unique constraints treat
  // NULL as distinct, so multiple email-only or phone-only prospects
  // for one church coexist without conflict.
  const existing = email
    ? await db.query.prospects.findFirst({
        where: and(
          eq(prospects.churchId, verified.value.churchId),
          eq(prospects.email, email)
        ),
      })
    : phone
    ? await db.query.prospects.findFirst({
        where: and(
          eq(prospects.churchId, verified.value.churchId),
          eq(prospects.phone, phone)
        ),
      })
    : null;

  let prospectId: string;
  if (existing) {
    // Merge path — update the existing row. Preserve the original
    // chat id so the transcript link keeps pointing at the first
    // conversation. Append the new session to the history trail.
    // Update each contact field opportunistically: if this submission
    // brought a new value, take it; otherwise keep what was there.
    const priorHistory = existing.metadata?.sessionHistory ?? [];
    const sessionHistory = Array.from(
      new Set([...priorHistory, verified.value.sessionId])
    );
    await db
      .update(prospects)
      .set({
        name: name ?? existing.name,
        email: email ?? existing.email,
        phone: phone ?? existing.phone,
        metadata: {
          ...(existing.metadata ?? {}),
          sessionHistory,
          lastSeenAt: new Date().toISOString(),
        },
        updatedAt: new Date(),
      })
      .where(eq(prospects.id, existing.id));
    prospectId = existing.id;
  } else {
    // Branch the insert by which channel is the merge key. The
    // onConflictDoUpdate target has to match a real unique index, so
    // we point it at whichever is populated for this submission.
    const conflictTarget = email
      ? [prospects.churchId, prospects.email]
      : [prospects.churchId, prospects.phone];
    const pageTitle = body.pageTitle?.slice(0, 300);
    const [inserted] = await db
      .insert(prospects)
      .values({
        churchId: verified.value.churchId,
        chatId: session.chatId,
        sessionId: verified.value.sessionId,
        name,
        email,
        phone,
        sourceType: "embed_widget",
        sourceRef: verified.value.sessionId,
        sourceUrl: body.pageUrl?.slice(0, 500),
        metadata: {
          sessionHistory: [verified.value.sessionId],
          firstSeenAt: new Date().toISOString(),
          ...(pageTitle ? { sourcePageTitle: pageTitle } : {}),
        },
      })
      .onConflictDoUpdate({
        // Defensive: two concurrent inserts with the same merge key
        // — one wins, the other updates. Mirrors the merge-on-return
        // branch above.
        target: conflictTarget,
        set: {
          ...(name ? { name } : {}),
          ...(email ? { email } : {}),
          ...(phone ? { phone } : {}),
          updatedAt: new Date(),
          metadata: sql`jsonb_set(${prospects.metadata}, '{sessionHistory}', coalesce(${prospects.metadata} -> 'sessionHistory', '[]'::jsonb) || to_jsonb(${verified.value.sessionId}::text))`,
        },
      })
      .returning({ id: prospects.id });
    prospectId = inserted.id;
  }

  await db
    .update(embedWidgetSessions)
    .set({ prospectId, lastSeenAt: new Date() })
    .where(eq(embedWidgetSessions.id, session.id));

  logger.info("[embed/prospects] captured", {
    churchId: verified.value.churchId,
    prospectId,
    sessionId: verified.value.sessionId,
    merged: !!existing,
  });

  return NextResponse.json(
    { ok: true, prospectId, merged: !!existing },
    { headers: cors }
  );
}
