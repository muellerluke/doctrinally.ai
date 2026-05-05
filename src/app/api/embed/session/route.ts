import { NextResponse } from "next/server";
import { and, desc, eq, inArray } from "drizzle-orm";
import { createHash } from "crypto";
import { db } from "@/db";
import {
  chats,
  embedWidgetSessions,
  churches,
  messages,
} from "@/db/schema";
import { resolvePublicEmbedConfig } from "@/lib/actions/embed";
import {
  checkOrigin,
  checkSecFetchHeaders,
  corsHeaders,
  handleOptions,
  readKey,
} from "@/lib/embed/origin";
import {
  issueToken,
  verifyToken,
} from "@/lib/embed/session-token";
import { consumeToken } from "@/lib/embed/rate-limit";
import {
  getRequestIp,
  hashIp,
  seedSessionIp,
  incrementAndCheckDailySessionLimit,
  MAX_SESSIONS_PER_IP_PER_DAY,
  verifyAndUpdateSessionIp,
} from "@/lib/embed/ip";
import { logger } from "@/lib/logger";
import { incrementVisitorCount } from "@/lib/usage";

/**
 * Handshake + conversation rehydrate for the embedded widget.
 *
 * The widget calls this once on load:
 *   - no token or an invalid one → create a new session + chat row,
 *     issue a signed token, return the empty conversation.
 *   - valid token → look up the session, return its chat id, hydrate
 *     the last ~30 messages so returning visitors see their history.
 *
 * All requests are gated by origin allowlist. Rate-limited by IP so a
 * misconfigured church page that spins up sessions in a loop can't
 * drown us.
 */

export const runtime = "nodejs";

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
  const origin = originCheck.origin;
  const cors = corsHeaders(origin);

  // Catches naive scripted clients that didn't bother to set the
  // Sec-Fetch-* headers a real browser always sends on cross-origin
  // fetches. Free signal — no perf cost, no UX cost.
  const secFetchReason = checkSecFetchHeaders(request);
  if (secFetchReason) {
    logger.warn("[embed/session] sec-fetch reject", {
      reason: secFetchReason,
    });
    return new NextResponse("bad request", { status: 400, headers: cors });
  }

  // Rate-limit session creation per IP (fast in-memory bucket — short
  // window, per-second class abuse).
  const ip = getRequestIp(request);
  if (!consumeToken("config:ip", ip)) {
    return new NextResponse("rate limited", { status: 429, headers: cors });
  }
  const ipHash = hashIp(ip);

  const config = await resolvePublicEmbedConfig(key);
  if (!config) {
    return new NextResponse("widget not enabled", {
      status: 404,
      headers: cors,
    });
  }

  // Resolve the church id from the key — resolvePublicEmbedConfig
  // intentionally doesn't return it (it's a public endpoint).
  const [church] = await db
    .select({ id: churches.id })
    .from(churches)
    .where(eq(churches.embedPublicKey, key))
    .limit(1);
  if (!church) {
    return new NextResponse("widget not enabled", {
      status: 404,
      headers: cors,
    });
  }
  const churchId = church.id;

  const body = (await request.json().catch(() => ({}))) as {
    token?: string;
    pageUrl?: string;
    pageTitle?: string;
  };

  const ua = request.headers.get("user-agent") ?? "";
  const userAgentHash = createHash("sha256").update(ua).digest("hex");
  const visitorFingerprintHash = createHash("sha256")
    .update(`${ip}|${ua}`)
    .digest("hex");

  // Rehydrate path — valid token for this church → return the existing
  // conversation so returning visitors see their history instantly.
  if (body.token) {
    const verified = verifyToken(body.token);
    if (
      verified.ok &&
      verified.value.churchId === churchId &&
      verified.value.origin === origin
    ) {
      const session = await db.query.embedWidgetSessions.findFirst({
        where: eq(
          embedWidgetSessions.sessionTokenHash,
          verified.value.tokenHash
        ),
      });
      if (session) {
        // IP binding check — a known session being rehydrated must
        // be coming from one of its previously-seen IPs (or a new
        // IP within the 3-IP cap). 4th distinct IP → reject; the
        // widget will mint a fresh session on the next page load,
        // and that fresh session is subject to the daily IP cap.
        const ipCheck = await verifyAndUpdateSessionIp({
          sessionId: session.id,
          ipHash,
        });
        if (!ipCheck.ok) {
          logger.warn("[embed/session] rehydrate rejected — ip cap", {
            sessionId: session.id,
            ipsUsed: ipCheck.ipsUsed,
          });
          // Treat as if no token: fall through to mint a new
          // session (which then has to clear the daily IP cap).
        } else {
          // Returning-visitor rehydrate: pull the last ~30 messages
          // for this chat so the widget can restore the conversation
          // panel. Server still holds the running conversation summary
          // for context beyond the 30-message window. Run the session
          // update and the message fetch in parallel — keeps rehydrate
          // latency flat. Filter `system` at the SQL level (defense in
          // depth — the enum permits it but nothing should be writing
          // it for embed chats today).
          const [, recentMessages] = await Promise.all([
            db
              .update(embedWidgetSessions)
              .set({
                lastSeenAt: new Date(),
                metadata: {
                  ...(session.metadata ?? {}),
                  lastPageUrl: body.pageUrl,
                  lastPageTitle: body.pageTitle,
                },
              })
              .where(eq(embedWidgetSessions.id, session.id)),
            db
              .select({
                role: messages.role,
                content: messages.content,
                citations: messages.citations,
              })
              .from(messages)
              .where(
                and(
                  eq(messages.chatId, session.chatId),
                  inArray(messages.role, ["user", "assistant"])
                )
              )
              .orderBy(desc(messages.createdAt))
              .limit(30),
          ]);

          // desc + reverse lets the index seek backward (cheap when a
          // chat ever exceeds 30 rows). Drop empty content rows defensively.
          const previousMessages = recentMessages
            .filter((m) => m.content && m.content.trim().length > 0)
            .reverse();

          return NextResponse.json(
            {
              token: body.token,
              chatId: session.chatId,
              hasInteracted: session.hasInteracted,
              outreachSent: !!session.outreachSentAt,
              prospectCaptured: !!session.prospectId,
              hasHistory: !!session.conversationSummary,
              previousMessages,
              config: {
                churchName: config.churchName,
                primaryColor: config.primaryColor,
                accentColor: config.accentColor,
              },
            },
            { headers: cors }
          );
        }
      }
      // Session not found OR rejected on IP cap — fall through to
      // mint a new one (which is subject to the daily IP cap below).
    }
  }

  // Daily session-creation cap per IP. 25 sessions per IP per UTC
  // day handles shared computers (library, coffee shop, corporate
  // wifi, household wifi) while making prospect-spam expensive — a
  // bad actor needs 40+ IPs to mint 1000 sessions, on top of the
  // origin allowlist + Sec-Fetch + HMAC-bound-origin gates.
  const dailyCap = await incrementAndCheckDailySessionLimit({ ipHash });
  if (!dailyCap.ok) {
    logger.warn("[embed/session] daily IP cap exceeded", {
      ipHash,
      count: dailyCap.count,
      limit: dailyCap.limit,
    });
    return new NextResponse(
      JSON.stringify({
        error: "ip_session_limit_exceeded",
        message: `Too many sessions from this network today. Try again tomorrow.`,
        limit: MAX_SESSIONS_PER_IP_PER_DAY,
      }),
      {
        status: 429,
        headers: { ...cors, "Content-Type": "application/json" },
      }
    );
  }

  // Fresh session path.
  let issued;
  try {
    issued = issueToken({ churchId, origin });
  } catch (err) {
    logger.error("[embed/session] failed to issue token", {
      error: err instanceof Error ? err.message : String(err),
    });
    return new NextResponse("server misconfigured", {
      status: 500,
      headers: cors,
    });
  }

  const [newChat] = await db
    .insert(chats)
    .values({
      churchId,
      userId: null,
      // Widget chats get a placeholder title; overwritten on first user
      // message the same way the member chat behaves.
      title: body.pageTitle?.slice(0, 80) || "Website visitor",
      isAdminTest: false,
    })
    .returning({ id: chats.id });

  await db.insert(embedWidgetSessions).values({
    id: issued.sessionId,
    churchId,
    chatId: newChat.id,
    sessionTokenHash: issued.tokenHash,
    origin,
    userAgentHash,
    visitorFingerprintHash,
    hasInteracted: false,
    metadata: {
      lastPageUrl: body.pageUrl,
      lastPageTitle: body.pageTitle,
    },
    expiresAt: issued.expiresAt,
  });

  // Seed the per-session IP set so subsequent requests have an
  // entry to match against in the binding check.
  await seedSessionIp({ sessionId: issued.sessionId, ipHash });

  // Count this as a unique visitor for the analytics dashboard.
  incrementVisitorCount(churchId).catch(() => {});

  logger.info("[embed/session] new session", {
    churchId,
    chatId: newChat.id,
    origin,
  });

  return NextResponse.json(
    {
      token: issued.token,
      chatId: newChat.id,
      hasInteracted: false,
      outreachSent: false,
      prospectCaptured: false,
      hasHistory: false,
      previousMessages: [],
      config: {
        churchName: config.churchName,
        primaryColor: config.primaryColor,
        accentColor: config.accentColor,
      },
    },
    { headers: cors }
  );
}
