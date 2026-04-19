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
 */
export async function scrapeBranding(domain: string): Promise<BrandingResult> {
  const url = normalizeUrl(domain);
  try {
    const doc = await getClient().scrape(url, {
      formats: ["branding"],
      onlyMainContent: false,
    });
    return mapBrandingProfile(doc.branding);
  } catch (err) {
    console.error("[firecrawl] scrapeBranding failed", err);
    return emptyBranding();
  }
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
