import { task } from "@trigger.dev/sdk/v3";
import {
  fetchHtml,
  fetchHtmlRendered,
  htmlToMarkdown,
  isAllowed,
} from "@/lib/crawler";
import type { FetchAndConvertResult } from "@/lib/crawler/types";

interface Payload {
  url: string;
  userAgent: string;
}

/**
 * Per-URL leaf of the website crawl. The orchestrator
 * (`crawl-church-website`) discovers candidate URLs and fans out one
 * run of this task per URL so each page gets its own retry budget,
 * timeout, and execution machine.
 *
 * Returns a structured result rather than throwing on per-URL
 * failures: a 404 on one page should not poison the whole crawl run.
 * The orchestrator counts skips/successes and rolls them up into the
 * `church_website_configs.last_crawl_*` columns surfaced in admin
 * settings.
 *
 * Two-tier escalation:
 *   1. `fetchHtml` tries cheap native fetch, escalates to headless
 *      Chromium on fetch-level failure (403/Cloudflare/timeout).
 *   2. If conversion comes back thin (<200 chars markdown) AND the
 *      simple path was used, retry via the rendered path explicitly —
 *      most SPAs *do* return 200 OK with a hollow shell, so they only
 *      look "thin" after Readability has run.
 */
export const fetchAndConvertPage = task({
  id: "fetch-and-convert-page",
  machine: "small-1x",
  // Worst case: simple fetch (15 s) + render fetch on failure (30 s) +
  // thin-content render escalation (30 s) + conversion overhead.
  // 120 s leaves headroom; per-URL not whole-crawl.
  maxDuration: 120,
  retry: { maxAttempts: 2 },
  // Global cap on concurrent outbound fetches across all crawls.
  // Lower than the previous 10 because Chromium is ~200–400 MB
  // resident — five concurrent renders fits comfortably on `small-1x`.
  // Don't raise without raising the machine class.
  queue: { concurrencyLimit: 5 },
  run: async (payload: Payload): Promise<FetchAndConvertResult> => {
    const { url, userAgent } = payload;

    if (!(await isAllowed(url, userAgent))) {
      return { ok: false, reason: "robots" };
    }

    const fetched = await fetchHtml(url, userAgent);
    if (!fetched) {
      return { ok: false, reason: "fetch" };
    }

    let converted = htmlToMarkdown(fetched.html, fetched.finalUrl);

    // Thin-content escalation: simple-fetch returned a 200 OK that
    // happened to be an SPA hollow shell. Re-fetch with Chromium so
    // the JS-populated DOM is what Readability sees.
    if (!converted && !fetched.rendered) {
      const rendered = await fetchHtmlRendered(url, userAgent);
      if (rendered) {
        converted = htmlToMarkdown(rendered.html, rendered.finalUrl);
        if (converted) {
          return {
            ok: true,
            page: {
              url: rendered.finalUrl,
              title: converted.title,
              markdown: converted.markdown,
            },
          };
        }
      }
    }

    if (!converted) {
      return { ok: false, reason: "thin" };
    }

    return {
      ok: true,
      page: {
        url: fetched.finalUrl,
        title: converted.title,
        markdown: converted.markdown,
      },
    };
  },
});
