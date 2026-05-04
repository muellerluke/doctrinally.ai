import { XMLParser } from "fast-xml-parser";
import { parseHTML } from "linkedom";
import { fetchHtmlSimple } from "./fetch";
import { getSitemapUrls, isAllowed } from "./robots";
import {
  isSameOrigin,
  matchesPathPatterns,
  normalizeCrawlUrl,
  resolveLinkForCrawl,
} from "./url";
import type { DiscoverOptions } from "./types";

const SITEMAP_TIMEOUT_MS = 10_000;
const SITEMAP_INDEX_DEPTH = 3; // sitemap → sub-sitemap → leaf is enough.

const xml = new XMLParser({
  ignoreAttributes: true,
  // Sitemaps put `<loc>` either as a direct child or nested under
  // `<url>`/`<sitemap>`; the default parser flattens single-element
  // arrays which trips up downstream loops, so force-array on the
  // common collection nodes.
  isArray: (name) => name === "url" || name === "sitemap",
});

interface SitemapEntry {
  loc: string;
}

interface UrlsetDoc {
  urlset?: { url?: SitemapEntry[] };
  sitemapindex?: { sitemap?: SitemapEntry[] };
}

/**
 * Fetch and parse a single sitemap URL. Returns either page URLs
 * (`urlset`) or nested sitemap URLs (`sitemapindex`). Returns empty
 * arrays on any error so the caller treats a missing sitemap as
 * "no entries" rather than a fatal failure.
 */
async function fetchSitemap(
  sitemapUrl: string
): Promise<{ pages: string[]; sitemaps: string[] }> {
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), SITEMAP_TIMEOUT_MS);
    const res = await fetch(sitemapUrl, {
      redirect: "follow",
      signal: ctrl.signal,
      headers: { "User-Agent": "DoctrinallyAIBot/1.0" },
    });
    clearTimeout(timer);
    if (!res.ok) return { pages: [], sitemaps: [] };
    const body = await res.text();
    const parsed = xml.parse(body) as UrlsetDoc;

    const pages =
      parsed.urlset?.url
        ?.map((u) => u.loc)
        .filter((loc): loc is string => typeof loc === "string") ?? [];
    const sitemaps =
      parsed.sitemapindex?.sitemap
        ?.map((s) => s.loc)
        .filter((loc): loc is string => typeof loc === "string") ?? [];
    return { pages, sitemaps };
  } catch {
    return { pages: [], sitemaps: [] };
  }
}

/**
 * Walk a sitemap tree breadth-first and return every leaf URL it points
 * at. Bounded by `SITEMAP_INDEX_DEPTH` so a misconfigured site that
 * recursively references itself can't lock us into an infinite walk.
 */
async function walkSitemaps(seedSitemaps: string[]): Promise<string[]> {
  const seen = new Set<string>();
  const found = new Set<string>();
  const frontier: { url: string; depth: number }[] = seedSitemaps.map(
    (url) => ({ url, depth: 0 })
  );

  while (frontier.length > 0) {
    const { url, depth } = frontier.shift()!;
    if (seen.has(url)) continue;
    seen.add(url);

    const { pages, sitemaps } = await fetchSitemap(url);
    for (const p of pages) found.add(p);
    if (depth < SITEMAP_INDEX_DEPTH) {
      for (const s of sitemaps) {
        if (!seen.has(s)) frontier.push({ url: s, depth: depth + 1 });
      }
    }
  }

  return Array.from(found);
}

/**
 * Yield same-origin links discovered in `<a href>` on the given HTML.
 * Used by the BFS fallback when the sitemap doesn't yield enough URLs.
 */
function extractLinks(
  html: string,
  pageUrl: string,
  seed: string,
  includes: string[],
  excludes: string[]
): string[] {
  const out = new Set<string>();
  try {
    const { document } = parseHTML(html);
    for (const a of Array.from(document.querySelectorAll("a[href]"))) {
      const href = a.getAttribute("href");
      if (!href) continue;
      const resolved = resolveLinkForCrawl(
        href,
        pageUrl,
        seed,
        includes,
        excludes
      );
      if (resolved) out.add(resolved);
    }
  } catch {
    // Bad HTML — skip; we still got whatever we'd already collected.
  }
  return Array.from(out);
}

/**
 * Discover up to `limit` candidate URLs for a single seed origin.
 *
 * Strategy:
 *   1. Resolve sitemap URLs from `/robots.txt` (with `sitemap.xml`
 *      fallbacks) and walk the sitemap tree.
 *   2. Filter sitemap output to same-origin pages that pass the
 *      include/exclude globs and aren't disallowed by robots.txt.
 *   3. If we still don't have `limit` URLs, BFS from the seed page
 *      following `<a href>` links. BFS visits at most `limit * 3`
 *      pages so a pathological link graph can't run unbounded.
 *
 * The returned list is normalized (fragments stripped, trailing slash
 * removed) and deduplicated.
 */
export async function discoverUrls(
  seed: string,
  opts: DiscoverOptions
): Promise<string[]> {
  const { limit, includePatterns, excludePatterns, userAgent } = opts;
  if (limit <= 0) return [];

  const seedNormalized = normalizeCrawlUrl(seed);
  const visited = new Set<string>();
  const out: string[] = [];

  const tryAdd = async (candidate: string): Promise<void> => {
    if (out.length >= limit) return;
    const normalized = normalizeCrawlUrl(candidate);
    if (visited.has(normalized)) return;
    visited.add(normalized);
    if (!isSameOrigin(normalized, seedNormalized)) return;
    if (!matchesPathPatterns(normalized, includePatterns, excludePatterns)) {
      return;
    }
    if (!(await isAllowed(normalized, userAgent))) return;
    out.push(normalized);
  };

  // 1. Sitemap-driven discovery.
  const sitemapSeeds = await getSitemapUrls(seedNormalized);
  if (sitemapSeeds.length > 0) {
    const sitemapUrls = await walkSitemaps(sitemapSeeds);
    for (const u of sitemapUrls) {
      if (out.length >= limit) break;
      await tryAdd(u);
    }
  }

  // Always include the seed itself — landing pages are usually the
  // most-cited destination and may not appear in sparse sitemaps.
  await tryAdd(seedNormalized);

  if (out.length >= limit) return out.slice(0, limit);

  // 2. BFS fallback. Use a fanout cap so a pathological link graph
  //    (calendar pages, infinite category facets) can't burn the
  //    discovery budget on garbage URLs.
  const FANOUT_CAP = limit * 3;
  let pagesFetched = 0;
  const frontier: string[] = [seedNormalized];
  // Re-add already-discovered URLs to the BFS frontier so we keep
  // walking them for outbound links.
  frontier.push(...out);

  while (frontier.length > 0 && out.length < limit && pagesFetched < FANOUT_CAP) {
    const url = frontier.shift()!;
    pagesFetched++;
    // Discovery doesn't need JS-rendered links — sitemaps cover the
    // common case, and BFS is link-graph traversal. Stay on the cheap
    // path so a 50-URL crawl doesn't blow up into 50 Chromium launches.
    const fetched = await fetchHtmlSimple(url, userAgent);
    if (!fetched) continue;
    const links = extractLinks(
      fetched.html,
      fetched.finalUrl,
      seedNormalized,
      includePatterns,
      excludePatterns
    );
    for (const link of links) {
      if (out.length >= limit) break;
      const normalized = normalizeCrawlUrl(link);
      if (visited.has(normalized)) continue;
      await tryAdd(normalized);
      if (out.includes(normalized)) frontier.push(normalized);
    }
  }

  return out.slice(0, limit);
}
