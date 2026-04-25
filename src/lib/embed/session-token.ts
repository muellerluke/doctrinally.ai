import { createHmac, timingSafeEqual, randomUUID, createHash } from "crypto";

/**
 * HMAC-signed opaque session token for the embedded widget. Stored by
 * the widget in `localStorage`; presented on every API call via the
 * `X-Doctrinally-Session` header. Stateless verification on the server
 * side, paired with a row in `embed_widget_sessions` keyed by
 * `session_token_hash` (sha256 of the token) for stateful lifecycle
 * concerns (expiry, interaction gate, outreach flag).
 *
 * Format: `v1.<base64url(payload)>.<base64url(hmac)>`
 *
 * Payload is the compact JSON:
 *   { sid: sessionId, cid: churchId, o: origin, iat: seconds, exp: seconds }
 *
 * The signing secret lives in `EMBED_SIGNING_SECRET`. Rotating it
 * invalidates every live session — intended behavior for an incident.
 */

const TOKEN_VERSION = "v1";
const DEFAULT_TTL_DAYS = 30;

interface TokenPayload {
  sid: string;
  cid: string;
  o: string;
  iat: number;
  exp: number;
}

export interface IssuedToken {
  token: string;
  sessionId: string;
  tokenHash: string;
  expiresAt: Date;
}

function getSecret(): string {
  const secret = process.env.EMBED_SIGNING_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error(
      "EMBED_SIGNING_SECRET is missing or too short (min 32 chars)"
    );
  }
  return secret;
}

/**
 * Optional second secret accepted during verification only. Set
 * during rotation: promote `EMBED_SIGNING_SECRET` → `EMBED_SIGNING_SECRET_PREVIOUS`,
 * generate a new `EMBED_SIGNING_SECRET`. Tokens signed with either
 * one verify until the previous expires naturally (30 days), at
 * which point you can drop the env var and the rotation is complete.
 *
 * If unset, only the current secret is accepted.
 */
function getPreviousSecret(): string | null {
  const prev = process.env.EMBED_SIGNING_SECRET_PREVIOUS;
  if (!prev || prev.length < 32) return null;
  return prev;
}

function b64url(input: Buffer | string): string {
  const buf = typeof input === "string" ? Buffer.from(input, "utf8") : input;
  return buf
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function b64urlDecode(input: string): Buffer {
  // Re-pad to a multiple of 4.
  const padded = input + "=".repeat((4 - (input.length % 4)) % 4);
  return Buffer.from(padded.replace(/-/g, "+").replace(/_/g, "/"), "base64");
}

function sign(payload: string): string {
  return b64url(createHmac("sha256", getSecret()).update(payload).digest());
}

function signWithSecret(payload: string, secret: string): string {
  return b64url(createHmac("sha256", secret).update(payload).digest());
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function issueToken({
  churchId,
  origin,
  ttlDays = DEFAULT_TTL_DAYS,
}: {
  churchId: string;
  origin: string;
  ttlDays?: number;
}): IssuedToken {
  const sessionId = randomUUID();
  const now = Math.floor(Date.now() / 1000);
  const exp = now + ttlDays * 24 * 60 * 60;

  const payload: TokenPayload = {
    sid: sessionId,
    cid: churchId,
    o: origin,
    iat: now,
    exp,
  };
  const payloadEncoded = b64url(JSON.stringify(payload));
  const signingInput = `${TOKEN_VERSION}.${payloadEncoded}`;
  const sig = sign(signingInput);
  const token = `${signingInput}.${sig}`;

  return {
    token,
    sessionId,
    tokenHash: hashToken(token),
    expiresAt: new Date(exp * 1000),
  };
}

export interface VerifiedToken {
  sessionId: string;
  churchId: string;
  origin: string;
  issuedAt: Date;
  expiresAt: Date;
  tokenHash: string;
}

export function verifyToken(token: string | null | undefined):
  | { ok: true; value: VerifiedToken }
  | { ok: false; reason: string } {
  if (!token) return { ok: false, reason: "missing_token" };

  const parts = token.split(".");
  if (parts.length !== 3) return { ok: false, reason: "malformed" };

  const [version, payloadEncoded, sigProvided] = parts;
  if (version !== TOKEN_VERSION) return { ok: false, reason: "bad_version" };

  const signingInput = `${version}.${payloadEncoded}`;

  // Verify against current secret first (fast path — most tokens
  // are signed with it). Fall back to the previous secret during
  // an active rotation window. Always evaluate the current secret
  // to keep timing consistent for tokens that match neither.
  const sigCurrent = sign(signingInput);
  const sigProvidedBuf = Buffer.from(sigProvided);
  const sigCurrentBuf = Buffer.from(sigCurrent);
  let matched =
    sigProvidedBuf.length === sigCurrentBuf.length &&
    timingSafeEqual(sigProvidedBuf, sigCurrentBuf);

  if (!matched) {
    const previousSecret = getPreviousSecret();
    if (previousSecret) {
      const sigPrevious = signWithSecret(signingInput, previousSecret);
      const sigPreviousBuf = Buffer.from(sigPrevious);
      matched =
        sigProvidedBuf.length === sigPreviousBuf.length &&
        timingSafeEqual(sigProvidedBuf, sigPreviousBuf);
    }
  }

  if (!matched) {
    return { ok: false, reason: "bad_signature" };
  }

  let payload: TokenPayload;
  try {
    payload = JSON.parse(b64urlDecode(payloadEncoded).toString("utf8"));
  } catch {
    return { ok: false, reason: "bad_payload" };
  }

  const now = Math.floor(Date.now() / 1000);
  if (payload.exp <= now) return { ok: false, reason: "expired" };

  return {
    ok: true,
    value: {
      sessionId: payload.sid,
      churchId: payload.cid,
      origin: payload.o,
      issuedAt: new Date(payload.iat * 1000),
      expiresAt: new Date(payload.exp * 1000),
      tokenHash: hashToken(token),
    },
  };
}
