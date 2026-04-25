import { resolveEmbedAllowedOrigins } from "@/lib/actions/embed";

/**
 * Origin allowlist + CORS helpers for every `/api/embed/*` route.
 *
 * Security posture:
 *   - Never echo `Access-Control-Allow-Origin: *` on authenticated
 *     endpoints. Always echo the matched origin only.
 *   - Always send `Vary: Origin` so downstream caches (Vercel edge,
 *     upstream CDNs) don't serve one church's allow-list hit as the
 *     cached response for another origin.
 *   - Resolve the origin list from the same source (`resolveEmbedAllowedOrigins`
 *     in `src/lib/actions/embed.ts`) that the existing config endpoint
 *     uses, so admin settings are the only place allowlists get
 *     modified.
 *   - Ship a short-lived in-process cache (5 min) so we don't pay a DB
 *     hit for the allowlist on every chat message.
 */

interface AllowlistEntry {
  origins: string[];
  fetchedAt: number;
}

const ORIGIN_CACHE = new Map<string, AllowlistEntry>();
const ORIGIN_TTL_MS = 5 * 60 * 1000;

export async function getAllowedOrigins(
  embedKey: string
): Promise<string[] | null> {
  const cached = ORIGIN_CACHE.get(embedKey);
  if (cached && Date.now() - cached.fetchedAt < ORIGIN_TTL_MS) {
    return cached.origins;
  }
  const origins = await resolveEmbedAllowedOrigins(embedKey);
  if (!origins) {
    ORIGIN_CACHE.delete(embedKey);
    return null;
  }
  ORIGIN_CACHE.set(embedKey, { origins, fetchedAt: Date.now() });
  return origins;
}

export interface OriginCheckResult {
  ok: boolean;
  origin: string | null;
}

/**
 * Check a request's `Origin` header against the allowlist for an embed
 * key. Returns the matched origin string so the caller can echo it in
 * the CORS response headers.
 */
export async function checkOrigin(
  request: Request,
  embedKey: string
): Promise<OriginCheckResult> {
  const origin = request.headers.get("origin");
  if (!origin) return { ok: false, origin: null };
  const allowed = await getAllowedOrigins(embedKey);
  if (!allowed || allowed.length === 0) return { ok: false, origin };
  const ok = allowed.includes(origin);
  return { ok, origin };
}

/**
 * CORS headers for a successful origin match. Always include
 * `Vary: Origin` to stop downstream caches from serving a
 * cross-contaminated response.
 */
export function corsHeaders(matchedOrigin: string): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": matchedOrigin,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, X-Doctrinally-Session",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
}

/**
 * Preflight handler. Reply 204 with CORS for allowed origins, 403 for
 * others. Keeping the deny path as 403 (not 404) — preflights are
 * never cacheable as "pretend the widget doesn't exist" in the same
 * way public config is.
 */
export async function handleOptions(
  request: Request,
  embedKey: string
): Promise<Response> {
  const { ok, origin } = await checkOrigin(request, embedKey);
  if (!ok || !origin) {
    return new Response(null, { status: 403 });
  }
  return new Response(null, { status: 204, headers: corsHeaders(origin) });
}

/**
 * Pull the embed key from a request. The widget sends it as a query
 * parameter on non-config routes (`?k=<key>`) so the allowlist can be
 * resolved without needing the key baked into the URL path.
 */
export function readKey(request: Request): string | null {
  const url = new URL(request.url);
  const key = url.searchParams.get("k");
  if (!key || !key.startsWith("dai_pk_")) return null;
  return key;
}

/**
 * Verify the Fetch Metadata Request Headers a real browser sends on
 * every cross-origin fetch. They're set by the user agent — JS can't
 * forge them — so they're a free signal that the request came from a
 * real browser tab embedded in the church's page.
 *
 * Limits:
 *   - A determined attacker using Selenium/Playwright/Puppeteer DOES
 *     get these headers correctly because a real browser is driving
 *     the request. So this is a "raise the floor against curl/Python"
 *     gate, not a "stops sophisticated abuse" gate.
 *   - Older browsers (Safari < 16, Firefox < 90 in some configs) may
 *     not send these on every fetch. We accept their absence to avoid
 *     false-positive lockouts; we only reject when they're present
 *     and clearly wrong.
 *
 * Expected values for the widget's cross-origin fetches:
 *   Sec-Fetch-Site: cross-site
 *   Sec-Fetch-Mode: cors
 *   Sec-Fetch-Dest: empty   (fetch() to JSON or stream — not a
 *                            navigation, image, script, etc.)
 *
 * Returns `null` on pass (or absent), or a reason string on
 * obvious-mismatch reject. Caller decides the response code.
 */
export function checkSecFetchHeaders(request: Request): string | null {
  const site = request.headers.get("sec-fetch-site");
  const mode = request.headers.get("sec-fetch-mode");
  const dest = request.headers.get("sec-fetch-dest");

  // All three absent = older browser or non-browser client. We
  // can't tell which without other signals, so don't reject solely
  // on absence. Other gates (origin, IP cap, rate limit) still apply.
  if (site == null && mode == null && dest == null) return null;

  // Real cross-origin fetches from a browser always set
  // `Sec-Fetch-Site: cross-site`. `same-origin` would mean the
  // request came from doctrinally.ai itself, which can happen for
  // our admin testing — accept that. Anything else (e.g. `none` for
  // address-bar typing) is suspicious.
  if (site != null && site !== "cross-site" && site !== "same-origin") {
    return `bad_sec_fetch_site:${site}`;
  }
  if (mode != null && mode !== "cors") {
    return `bad_sec_fetch_mode:${mode}`;
  }
  // `Sec-Fetch-Dest: empty` covers fetch() / XHR. We never expect
  // other destinations on these endpoints.
  if (dest != null && dest !== "empty") {
    return `bad_sec_fetch_dest:${dest}`;
  }
  return null;
}
