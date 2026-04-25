import { logger } from "@/lib/logger";

/**
 * Cloudflare Turnstile server-side siteverify.
 *
 * Docs: https://developers.cloudflare.com/turnstile/get-started/server-side-validation/
 *
 * Used to gate prospect-form submissions. The widget lazy-loads
 * Turnstile JS only when the form opens, so the performance cost is
 * zero for visitors who never convert.
 *
 * Set `CF_TURNSTILE_SECRET` to enable; if unset we fail open in dev
 * (warning logged). Never fails open in production.
 */

const VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

export interface TurnstileResult {
  ok: boolean;
  reason?: string;
}

export async function verifyTurnstile({
  token,
  remoteIp,
}: {
  token: string | null | undefined;
  remoteIp?: string | null;
}): Promise<TurnstileResult> {
  const secret = process.env.CF_TURNSTILE_SECRET;

  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      logger.error("[embed] turnstile secret missing in production — rejecting");
      return { ok: false, reason: "server_misconfigured" };
    }
    logger.warn("[embed] turnstile secret missing — failing open in dev");
    return { ok: true };
  }

  if (!token) return { ok: false, reason: "missing_token" };

  const body = new URLSearchParams();
  body.set("secret", secret);
  body.set("response", token);
  if (remoteIp) body.set("remoteip", remoteIp);

  try {
    const res = await fetch(VERIFY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
      // Turnstile siteverify is typically fast but we don't want to
      // hang a serverless invocation on a provider hiccup.
      signal: AbortSignal.timeout(4000),
    });
    if (!res.ok) {
      return { ok: false, reason: `siteverify_http_${res.status}` };
    }
    const json: {
      success: boolean;
      ["error-codes"]?: string[];
    } = await res.json();

    if (!json.success) {
      return {
        ok: false,
        reason:
          json["error-codes"]?.join(",") ?? "siteverify_reported_failure",
      };
    }
    return { ok: true };
  } catch (err) {
    logger.error("[embed] turnstile verify threw", {
      error: err instanceof Error ? err.message : String(err),
    });
    return { ok: false, reason: "siteverify_exception" };
  }
}
