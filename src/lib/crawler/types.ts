/**
 * Shape an upstream caller (orchestrator) consumes after a page has been
 * fetched and converted. Matches the field set the documents-table insert
 * needs in `crawl-church-website` so it remains a drop-in replacement for
 * the previous Firecrawl wrapper.
 */
export interface CrawledPage {
  url: string;
  title: string;
  markdown: string;
}

export interface DiscoverOptions {
  /**
   * Hard cap on URLs returned. Operational ceiling, not a plan gate;
   * the orchestrator passes a high value (~10k) so realistic church
   * sites index in full.
   */
  limit: number;
  /** Glob patterns to keep, e.g. ["/sermons/*"]. Empty array = no filter. */
  includePatterns: string[];
  /** Glob patterns to skip, e.g. ["/donate*"]. Empty array = no filter. */
  excludePatterns: string[];
  /** User-agent string used for robots.txt resolution. */
  userAgent: string;
}

export type FetchAndConvertResult =
  | { ok: true; page: CrawledPage }
  | { ok: false; reason: "robots" | "fetch" | "thin" | "non-html" };

/** UA string presented to remote servers and used for robots.txt matching. */
export const BOT_USER_AGENT =
  "Mozilla/5.0 (compatible; DoctrinallyAIBot/1.0; +https://doctrinally.ai/bot)";
