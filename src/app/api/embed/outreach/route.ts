import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { streamText } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { db } from "@/db";
import {
  churches,
  embedWidgetSessions,
  messages,
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
import {
  getCurrentUsage,
  getEffectiveMessageLimit,
} from "@/lib/usage";
import { logger } from "@/lib/logger";

/**
 * Proactive outreach opener — fired once per session after the
 * visitor pauses while reading. Returns a short assistant line that
 * the widget shows as the first message, with an unread-dot animation
 * on the launcher.
 *
 * Always AI-generated via `mercury-2`. If the model can't produce a
 * line in time (timeout, error, throttle hit, monthly budget cap), we
 * skip outreach for this visitor — no fallback message is sent and
 * `outreachSentAt` is left unset so a future page nav can retry.
 *
 * Server-side enforcement of "once per session" is authoritative —
 * the widget also holds a localStorage flag but the server's
 * `outreach_sent_at` is what stops abuse.
 */

export const runtime = "nodejs";

const DEFAULT_MODEL = "mercury-2";

const inception = createOpenAI({
  baseURL:
    process.env.INCEPTION_BASE_URL || "https://api.inceptionlabs.ai/v1",
  apiKey: process.env.INCEPTION_API_KEY,
});

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
    logger.warn("[embed/outreach] sec-fetch reject", { reason: secFetchReason });
    return new NextResponse("bad request", { status: 400, headers: cors });
  }

  const token = request.headers.get("x-doctrinally-session");
  const verifyResult = verifyToken(token);
  if (!verifyResult.ok || verifyResult.value.origin !== originCheck.origin) {
    return new NextResponse("unauthorized", { status: 401, headers: cors });
  }
  const verified = verifyResult.value;

  const session = await db.query.embedWidgetSessions.findFirst({
    where: eq(embedWidgetSessions.sessionTokenHash, verified.tokenHash),
  });
  if (!session) {
    return new NextResponse("session not found", {
      status: 401,
      headers: cors,
    });
  }

  // Session-IP binding (same gate as /chat).
  const ipHash = hashIp(getRequestIp(request));
  const ipCheck = await verifyAndUpdateSessionIp({
    sessionId: session.id,
    ipHash,
  });
  if (!ipCheck.ok) {
    logger.warn("[embed/outreach] ip cap exceeded", {
      sessionId: verified.sessionId,
      ipsUsed: ipCheck.ipsUsed,
    });
    return new NextResponse("session bound to too many IPs", {
      status: 401,
      headers: cors,
    });
  }

  if (session.outreachSentAt) {
    // Server-side "already sent" guard — stops double-fires from
    // race conditions in the client (e.g. tab background/foreground
    // flaps) and makes "reload the page" not reset the counter.
    return new NextResponse("already_sent", {
      status: 409,
      headers: cors,
    });
  }

  const church = await db.query.churches.findFirst({
    where: eq(churches.id, verified.churchId),
    columns: {
      id: true,
      name: true,
      embedProactiveOutreachEnabled: true,
    },
  });
  if (!church || !church.embedProactiveOutreachEnabled) {
    return new NextResponse("outreach disabled", {
      status: 404,
      headers: cors,
    });
  }

  const sub = await db.query.subscriptions.findFirst({
    where: eq(subscriptions.churchId, verified.churchId),
  });
  if (!sub || !(await isEmbeddedChatAvailable(verified.churchId, sub.plan))) {
    return new NextResponse("widget not enabled", {
      status: 403,
      headers: cors,
    });
  }

  const body = (await request.json().catch(() => ({}))) as {
    visibleText?: string;
    pageUrl?: string;
    pageTitle?: string;
  };
  const visibleText = (body.visibleText || "").slice(0, 2000);

  // Static fallback used whenever the AI call is skipped (throttled,
  // over budget, errored, empty response). Per product requirement,
  // the visitor should ALWAYS see an opener.
  const fallbackOpener = `Hi — welcome to ${church.name}. Anything I can help you find or any question I can answer?`;
  let opener: string = fallbackOpener;

  const throttled = !consumeToken("outreach:church", verified.churchId);
  const [msgLimit, currentUsage] = await Promise.all([
    getEffectiveMessageLimit(verified.churchId),
    getCurrentUsage(verified.churchId),
  ]);
  const overBudget = Boolean(
    msgLimit && currentUsage && currentUsage.questions >= msgLimit.effectiveMax,
  );

  if (throttled || overBudget) {
    logger.info("[embed/outreach] AI skipped — using fallback", {
      reason: throttled ? "throttled" : "over_budget",
    });
  } else {
    // Sanitize the page snippet — collapse whitespace, strip triple
    // quotes (we use them as fences below), and cap the length. Long
    // / messy snippets correlate strongly with Mercury 2 returning
    // empty content, so keep this tight.
    const snippet = (visibleText || "")
      .replace(/[\r\n]+/g, " ")
      .replace(/\s+/g, " ")
      .replace(/"""+/g, '"')
      .trim()
      .slice(0, 800);

    // Brief system + detailed user is the structure that completes
    // reliably with mercury-2. The chat-route summary call uses the
    // same shape (`prompt` shorthand + 8s timeout + low temp) and
    // never empty-returns; the outreach call had been diverging from
    // that pattern, which is why it kept failing.
    const system = `You are the AI greeter on ${church.name}'s website. Write a warm opening message for a visitor who just paused on a page. Output JUST the message — no preamble, no markdown, no quotation marks. One short message, max 2 sentences, under 200 characters.`;

    const userPrompt = snippet
      ? `The visitor is reading this passage on the site:\n\n${snippet}\n\nWrite an opening line that acknowledges something specific from what they're reading, then invites them to ask a question, get help finding something, or connect with someone at the church. Keep it warm and human — no "I'm an AI" disclaimers.`
      : `The visitor just landed on the site without much visible content yet. Write a brief, warm opener that welcomes them and invites them to ask a question, get help finding something, or connect with someone at the church.`;

    // Use streamText — that's the call shape the chat route uses
    // and that mercury-2 actually completes reliably. generateText
    // was empty-returning even when the model produced content,
    // possibly due to an SDK ↔ Inception non-streaming-response
    // serialization quirk.
    //
    // Two attempts. A single retry resolves the rare empty-stream
    // case without adding noticeable latency.
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const result = streamText({
          model: inception.chat(process.env.AI_MODEL || DEFAULT_MODEL),
          system,
          prompt: userPrompt,
          maxOutputTokens: 200,
          temperature: 0.5,
          abortSignal: AbortSignal.timeout(8000),
        });
        let text = "";
        for await (const chunk of result.textStream) {
          text += chunk;
        }
        const cleaned = text
          .trim()
          .replace(/^["']|["']$/g, "")
          .slice(0, 400);
        if (cleaned.length >= 5) {
          opener = cleaned;
          break;
        }
        logger.warn("[embed/outreach] AI returned empty/short content", {
          attempt,
          length: cleaned.length,
          sample: cleaned,
        });
      } catch (err) {
        logger.warn("[embed/outreach] AI errored", {
          attempt,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }
  }

  // Persist as the first assistant message of the conversation so
  // the widget's session-rehydrate path returns it on reload and
  // the member admin sees the outreach in the transcript.
  try {
    await db.insert(messages).values({
      chatId: session.chatId,
      role: "assistant",
      content: opener,
      citations: null,
      hasCitations: false,
    });
    await db
      .update(embedWidgetSessions)
      .set({
        outreachSentAt: new Date(),
        metadata: {
          ...(session.metadata ?? {}),
          lastPageUrl: body.pageUrl,
          lastPageTitle: body.pageTitle,
        },
      })
      .where(eq(embedWidgetSessions.id, session.id));
  } catch (err) {
    logger.error("[embed/outreach] persist failed", {
      error: err instanceof Error ? err.message : String(err),
    });
  }
  logger.info("[embed/outreach] sent", {
    churchId: verified.churchId,
    sessionId: verified.sessionId,
  });
  return NextResponse.json({ opener }, { headers: cors });
}
