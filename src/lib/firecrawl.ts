import { Firecrawl, type BrandingProfile, type Document } from "@mendable/firecrawl-js";

/**
 * Lazy singleton — Firecrawl is only used inside Trigger.dev jobs and a
 * couple of server actions, so initialise on first call rather than at
 * module import. Throws cleanly if the API key is missing so callers can
 * fall back to defaults instead of crashing the request.
 */
let client: Firecrawl | null = null;
function getClient(): Firecrawl {
  if (!client) {
    const apiKey = process.env.FIRECRAWL_API_KEY;
    if (!apiKey) {
      throw new Error("FIRECRAWL_API_KEY environment variable is not set");
    }
    client = new Firecrawl({ apiKey });
  }
  return client;
}

/**
 * Normalize whatever the user typed into a full URL with protocol.
 * Strips trailing slashes so derived hostnames are stable.
 */
export function normalizeUrl(input: string): string {
  let url = input.trim();
  if (!url) return url;
  if (!/^https?:\/\//i.test(url)) {
    url = `https://${url}`;
  }
  return url.replace(/\/+$/, "");
}

/** Best-effort hostname extraction. Returns null if the input isn't a URL. */
export function getHostname(input: string): string | null {
  try {
    return new URL(normalizeUrl(input)).hostname;
  } catch {
    return null;
  }
}

export interface BrandingResult {
  logoUrl: string | null;
  primaryColor: string | null;
  accentColor: string | null;
  backgroundColor: string | null;
  textColor: string | null;
}

/**
 * Use Firecrawl's native `branding` scrape format to pull the church's
 * logo and brand colors from the homepage. Returns nulls (never throws)
 * on extraction failure so callers can fall back to defaults.
 *
 * Also pulls the raw HTML so we can fall back to common logo signals
 * (`<meta property="og:image">`, `<link rel="apple-touch-icon">`, the
 * favicon, `<img>` whose class/alt contains "logo") when Firecrawl's
 * branding profile can't find one. Many small church sites don't expose
 * a machine-readable logo but do set one of those tags.
 */
export async function scrapeBranding(domain: string): Promise<BrandingResult> {
  const url = normalizeUrl(domain);
  try {
    const doc = await getClient().scrape(url, {
      formats: ["branding", "html"],
      onlyMainContent: false,
    });
    const result = mapBrandingProfile(doc.branding);
    if (!result.logoUrl && doc.html) {
      result.logoUrl = findFallbackLogo(doc.html, url);
    }
    return result;
  } catch (err) {
    console.error("[firecrawl] scrapeBranding failed", err);
    return emptyBranding();
  }
}

/**
 * Walk the homepage HTML for common logo signals in priority order.
 * Returns the first usable absolute URL, or null if none found. Never
 * throws — parsing errors just fall through to the next candidate.
 */
function findFallbackLogo(html: string, pageUrl: string): string | null {
  const base = new URL(pageUrl);
  const absolutize = (raw: string | undefined | null): string | null => {
    if (!raw) return null;
    const trimmed = raw.trim();
    if (!trimmed) return null;
    try {
      return new URL(trimmed, base).toString();
    } catch {
      return null;
    }
  };

  // 1. og:image — highest signal, hand-picked by the site owner.
  const ogImage = html.match(
    /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i
  )?.[1]
    ?? html.match(
      /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i
    )?.[1];
  const ogUrl = absolutize(ogImage);
  if (ogUrl) return ogUrl;

  // 2. apple-touch-icon — standardized, usually a clean square logo.
  const apple = html.match(
    /<link[^>]+rel=["'][^"']*apple-touch-icon[^"']*["'][^>]+href=["']([^"']+)["']/i
  )?.[1]
    ?? html.match(
      /<link[^>]+href=["']([^"']+)["'][^>]+rel=["'][^"']*apple-touch-icon[^"']*["']/i
    )?.[1];
  const appleUrl = absolutize(apple);
  if (appleUrl) return appleUrl;

  // 3. <img> whose class/id/alt/data-* suggests "logo". Match the nearest
  //    src attribute in the same tag.
  const imgMatch = html.match(
    /<img[^>]*(?:class|id|alt|data-testid)=["'][^"']*logo[^"']*["'][^>]*>/i
  )?.[0];
  if (imgMatch) {
    const src = imgMatch.match(/\bsrc=["']([^"']+)["']/i)?.[1];
    const imgUrl = absolutize(src);
    if (imgUrl) return imgUrl;
  }

  // 4. rel="icon" — last resort, often tiny favicon.
  const icon = html.match(
    /<link[^>]+rel=["'](?:shortcut )?icon["'][^>]+href=["']([^"']+)["']/i
  )?.[1]
    ?? html.match(
      /<link[^>]+href=["']([^"']+)["'][^>]+rel=["'](?:shortcut )?icon["']/i
    )?.[1];
  const iconUrl = absolutize(icon);
  if (iconUrl) return iconUrl;

  return null;
}

function emptyBranding(): BrandingResult {
  return {
    logoUrl: null,
    primaryColor: null,
    accentColor: null,
    backgroundColor: null,
    textColor: null,
  };
}

function mapBrandingProfile(profile: BrandingProfile | undefined): BrandingResult {
  if (!profile) return emptyBranding();
  const colors = profile.colors ?? {};
  return {
    logoUrl: profile.logo ?? null,
    primaryColor: normalizeHex(colors.primary),
    accentColor: normalizeHex(colors.accent ?? colors.secondary),
    backgroundColor: normalizeHex(colors.background),
    textColor: normalizeHex(colors.textPrimary ?? colors.textSecondary),
  };
}

/**
 * Coerce whatever color string Firecrawl returned into a 7-char hex
 * (`#rrggbb`). Returns null for anything that isn't a recognizable hex —
 * we'd rather drop a value than store an unsupported `rgb(...)` or named
 * color in a column the branding form expects to render with a color
 * picker.
 */
function normalizeHex(input: string | undefined | null): string | null {
  if (!input) return null;
  const trimmed = input.trim();
  // #rgb → #rrggbb
  const short = trimmed.match(/^#([0-9a-f])([0-9a-f])([0-9a-f])$/i);
  if (short) {
    return `#${short[1]}${short[1]}${short[2]}${short[2]}${short[3]}${short[3]}`.toLowerCase();
  }
  const long = trimmed.match(/^#([0-9a-f]{6})$/i);
  if (long) return `#${long[1].toLowerCase()}`;
  // #rrggbbaa → strip alpha
  const alpha = trimmed.match(/^#([0-9a-f]{6})[0-9a-f]{2}$/i);
  if (alpha) return `#${alpha[1].toLowerCase()}`;
  return null;
}

export interface CrawledPage {
  url: string;
  title: string;
  markdown: string;
}

export interface CrawlSiteOptions {
  url: string;
  /** Glob patterns to keep, e.g. ["/sermons/*"]. Empty array = no filter. */
  includePatterns: string[];
  /** Glob patterns to skip, e.g. ["/donate*"]. Empty array = no filter. */
  excludePatterns: string[];
  /** Hard cap on pages returned. Plan-derived: 50 standard, 100 enterprise. */
  limit: number;
}

/**
 * Crawl a single site and return its pages as ingestion-ready markdown.
 * Stays on the supplied origin (no subdomains, no external links) — the
 * caller orchestrates multi-domain crawls by calling this once per
 * configured domain.
 *
 * Internally uses Firecrawl's polling `crawl()` helper with a 10-minute
 * cap; the orchestrating Trigger.dev task gives us the long-running
 * machine, so we don't need to manage our own polling loop here.
 */
export async function crawlSite(opts: CrawlSiteOptions): Promise<CrawledPage[]> {
  const url = normalizeUrl(opts.url);
  const job = await getClient().crawl(url, {
    limit: opts.limit,
    includePaths: opts.includePatterns.length > 0 ? opts.includePatterns : null,
    excludePaths: opts.excludePatterns.length > 0 ? opts.excludePatterns : null,
    crawlEntireDomain: true,
    allowSubdomains: false,
    allowExternalLinks: false,
    sitemap: "include",
    scrapeOptions: {
      formats: ["markdown"],
      onlyMainContent: true,
    },
    pollInterval: 5,
    timeout: 600,
  });

  if (job.status !== "completed") {
    throw new Error(
      `Firecrawl crawl ended with status "${job.status}" before completion`
    );
  }

  return (job.data ?? [])
    .map(toCrawledPage)
    .filter((p): p is CrawledPage => p !== null);
}

function toCrawledPage(doc: Document): CrawledPage | null {
  const sourceUrl = (doc.metadata?.sourceURL as string | undefined) ??
    (doc.metadata?.url as string | undefined);
  const markdown = doc.markdown?.trim();
  if (!sourceUrl || !markdown) return null;

  const title =
    (doc.metadata?.title as string | undefined)?.trim() ||
    (doc.metadata?.ogTitle as string | undefined)?.trim() ||
    deriveTitleFromUrl(sourceUrl);

  return { url: sourceUrl, title, markdown };
}

function deriveTitleFromUrl(url: string): string {
  try {
    const u = new URL(url);
    const segment = u.pathname.split("/").filter(Boolean).pop() ?? "";
    if (!segment) return u.hostname;
    return segment.replace(/[-_]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  } catch {
    return url;
  }
}
