const FETCH_TIMEOUT_MS = 15_000;
const RENDER_NAV_TIMEOUT_MS = 30_000;
const RENDER_NETWORK_IDLE_TIMEOUT_MS = 8_000;
const MAX_HTML_BYTES = 5 * 1024 * 1024; // 5 MB hard cap on a single page.

export interface FetchResult {
  html: string;
  finalUrl: string;
  status: number;
  /**
   * `true` when the result came from the rendered (Playwright) path,
   * `false` when it came from the cheap native-fetch path. Surfaced so
   * callers/logs can see which tier won and so the leaf task can avoid
   * re-rendering an already-rendered page when escalating on thin
   * content.
   */
  rendered: boolean;
}

/**
 * Cheap, JS-free HTTP fetch. ~500 ms/page. Returns null (rather than
 * throwing) for any condition the caller would treat as "skip this
 * page": non-2xx status, non-HTML content type, oversized body,
 * network/timeout error.
 *
 * Streams the response so a malicious or misconfigured server returning
 * gigabytes of HTML can be aborted at the byte cap instead of buffering
 * the entire body into memory first.
 *
 * Used by the discovery BFS (link-graph walking, doesn't need JS) and
 * as Tier 1 of the public `fetchHtml()` orchestrator.
 */
export async function fetchHtmlSimple(
  url: string,
  userAgent: string
): Promise<FetchResult | null> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);

  try {
    const res = await fetch(url, {
      redirect: "follow",
      signal: ctrl.signal,
      headers: {
        "User-Agent": userAgent,
        Accept: "text/html,application/xhtml+xml;q=0.9,*/*;q=0.5",
        "Accept-Language": "en-US,en;q=0.5",
      },
    });

    if (!res.ok) return null;

    const contentType = res.headers.get("content-type") ?? "";
    if (
      !/^text\/html\b/i.test(contentType) &&
      !/^application\/xhtml\+xml\b/i.test(contentType)
    ) {
      return null;
    }

    const declared = Number(res.headers.get("content-length"));
    if (Number.isFinite(declared) && declared > MAX_HTML_BYTES) {
      return null;
    }

    const body = res.body;
    if (!body) return null;

    const reader = body.getReader();
    const decoder = new TextDecoder();
    let html = "";
    let received = 0;
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      received += value.byteLength;
      if (received > MAX_HTML_BYTES) {
        await reader.cancel();
        return null;
      }
      html += decoder.decode(value, { stream: true });
    }
    html += decoder.decode();

    return {
      html,
      finalUrl: res.url || url,
      status: res.status,
      rendered: false,
    };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * JS-rendered fetch via headless Chromium. ~3–5 s/page including
 * launch. Used as Tier 2 when the cheap path fails (SPA hollow shell,
 * Cloudflare/Akamai JS challenge, 403 on bot-protected hosts) and
 * called explicitly by the leaf task when conversion produces thin
 * content.
 *
 * Lazy-imports `playwright` so callers that only ever need the simple
 * path don't pay the module-load cost.
 *
 * Returns null on launch failure, navigation timeout, non-OK response,
 * non-HTML content type, or oversized body — matching the
 * `fetchHtmlSimple` contract so the caller doesn't branch on which
 * path it called.
 */
export async function fetchHtmlRendered(
  url: string,
  userAgent: string
): Promise<FetchResult | null> {
  const { chromium } = await import("playwright");
  let browser: Awaited<ReturnType<typeof chromium.launch>> | null = null;

  try {
    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
      userAgent,
      viewport: { width: 1280, height: 800 },
      extraHTTPHeaders: {
        Accept: "text/html,application/xhtml+xml;q=0.9,*/*;q=0.5",
        "Accept-Language": "en-US,en;q=0.5",
      },
    });
    const page = await context.newPage();

    const response = await page.goto(url, {
      waitUntil: "domcontentloaded",
      timeout: RENDER_NAV_TIMEOUT_MS,
    });
    if (!response) return null;

    const status = response.status();
    if (status < 200 || status >= 300) return null;

    const contentType = response.headers()["content-type"] ?? "";
    if (
      !/^text\/html\b/i.test(contentType) &&
      !/^application\/xhtml\+xml\b/i.test(contentType)
    ) {
      return null;
    }

    // Settle for client-side rendered content. Calendar/analytics
    // widgets can keep the network busy indefinitely, so cap the wait;
    // the DOM is usually populated well before networkidle on real
    // SPAs.
    try {
      await page.waitForLoadState("networkidle", {
        timeout: RENDER_NETWORK_IDLE_TIMEOUT_MS,
      });
    } catch {
      // networkidle didn't settle — that's fine, take what we have.
    }

    const html = await page.content();
    if (html.length > MAX_HTML_BYTES) return null;

    return {
      html,
      finalUrl: page.url(),
      status,
      rendered: true,
    };
  } catch {
    return null;
  } finally {
    if (browser) {
      try {
        await browser.close();
      } catch {
        // Browser already torn down — nothing to clean up.
      }
    }
  }
}

/**
 * Public fetch entry point used by the leaf task. Two-tier escalation:
 *   1. Try `fetchHtmlSimple` (cheap, no JS).
 *   2. On null, escalate to `fetchHtmlRendered`.
 *
 * The result carries `rendered: boolean` so the leaf task can tell
 * whether thin-content escalation is still worth attempting.
 */
export async function fetchHtml(
  url: string,
  userAgent: string
): Promise<FetchResult | null> {
  const simple = await fetchHtmlSimple(url, userAgent);
  if (simple) return simple;
  return await fetchHtmlRendered(url, userAgent);
}
