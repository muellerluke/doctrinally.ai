import robotsParser, { type Robot } from "robots-parser";

const ROBOTS_TIMEOUT_MS = 8000;
const cache = new Map<string, Promise<Robot>>();

/**
 * Fetch and parse a host's `/robots.txt`, cached for the life of the
 * Node process (per-task-instance on Trigger.dev). A missing or 5xx
 * response yields a permissive parser — we don't want a hosting blip
 * to block the whole crawl.
 */
export function getRobots(origin: string): Promise<Robot> {
  let url: URL;
  try {
    url = new URL(origin);
  } catch {
    return Promise.resolve(
      robotsParser("https://invalid.example/robots.txt", "")
    );
  }
  const robotsUrl = `${url.protocol}//${url.host}/robots.txt`;
  const cached = cache.get(robotsUrl);
  if (cached) return cached;

  const promise = (async () => {
    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), ROBOTS_TIMEOUT_MS);
      const res = await fetch(robotsUrl, {
        redirect: "follow",
        signal: ctrl.signal,
        headers: { "User-Agent": "DoctrinallyAIBot/1.0" },
      });
      clearTimeout(timer);
      if (!res.ok) return robotsParser(robotsUrl, "");
      const body = await res.text();
      return robotsParser(robotsUrl, body);
    } catch {
      return robotsParser(robotsUrl, "");
    }
  })();
  cache.set(robotsUrl, promise);
  return promise;
}

export async function isAllowed(url: string, userAgent: string): Promise<boolean> {
  const robots = await getRobots(url);
  // robots-parser returns undefined for "no rule" — treat as allowed.
  return robots.isAllowed(url, userAgent) !== false;
}

/**
 * Pull `Sitemap:` directives from `/robots.txt`. Falls back to the two
 * conventional locations if the file declares none; the sitemap parser
 * handles 404s on those gracefully so this is safe to over-suggest.
 */
export async function getSitemapUrls(origin: string): Promise<string[]> {
  let url: URL;
  try {
    url = new URL(origin);
  } catch {
    return [];
  }
  const robots = await getRobots(origin);
  const declared = robots.getSitemaps();
  if (declared.length > 0) return declared;
  const base = `${url.protocol}//${url.host}`;
  return [`${base}/sitemap.xml`, `${base}/sitemap_index.xml`];
}
