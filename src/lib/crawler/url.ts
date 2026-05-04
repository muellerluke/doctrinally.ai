/**
 * Compile a Firecrawl-style path glob into a regex once and cache the
 * result. Supported syntax mirrors what church admins typed into the
 * Firecrawl include/exclude fields:
 *   - `*`  matches any run of characters except `/`
 *   - `**` matches any run of characters including `/`
 *   - `?`  matches a single non-`/` character
 *   - everything else matches literally (regex specials are escaped)
 *
 * `/sermons/*` matches `/sermons/foo` but not `/sermons/foo/bar`. Use
 * `/sermons/**` to recurse. `/donate*` matches `/donate`, `/donate-now`,
 * `/donate/foo`.
 */
const globRegexCache = new Map<string, RegExp>();
function globToRegex(pattern: string): RegExp {
  const cached = globRegexCache.get(pattern);
  if (cached) return cached;

  let re = "^";
  for (let i = 0; i < pattern.length; i++) {
    const c = pattern[i];
    if (c === "*") {
      if (pattern[i + 1] === "*") {
        re += ".*";
        i++;
      } else {
        re += "[^/]*";
      }
    } else if (c === "?") {
      re += "[^/]";
    } else if (/[.+^${}()|[\]\\]/.test(c)) {
      re += `\\${c}`;
    } else {
      re += c;
    }
  }
  re += "$";

  const compiled = new RegExp(re);
  globRegexCache.set(pattern, compiled);
  return compiled;
}

function matchesGlob(path: string, pattern: string): boolean {
  return globToRegex(pattern).test(path);
}

/**
 * Strip the parts of a URL that don't change which page is being fetched:
 * fragment identifiers (`#section`), known tracking parameters, trailing
 * slash on non-root paths. Output is canonical so two surface forms of the
 * same page collapse to one entry in the BFS frontier.
 */
export function normalizeCrawlUrl(raw: string): string {
  const trimmed = raw.trim();
  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    return trimmed;
  }

  url.hash = "";
  url.hostname = url.hostname.toLowerCase();

  const TRACKING = new Set([
    "utm_source",
    "utm_medium",
    "utm_campaign",
    "utm_term",
    "utm_content",
    "utm_id",
    "fbclid",
    "gclid",
    "mc_cid",
    "mc_eid",
    "_ga",
    "ref",
    "ref_src",
  ]);
  const drop: string[] = [];
  url.searchParams.forEach((_, key) => {
    if (TRACKING.has(key)) drop.push(key);
  });
  for (const key of drop) url.searchParams.delete(key);

  // Strip trailing slash on non-root paths so /foo and /foo/ dedupe.
  if (url.pathname.length > 1 && url.pathname.endsWith("/")) {
    url.pathname = url.pathname.replace(/\/+$/, "");
  }

  return url.toString();
}

/**
 * True when `url` and `seed` resolve to the same hostname. Subdomains are
 * treated as separate origins to match the previous Firecrawl behaviour
 * (`allowSubdomains: false`); a multi-domain crawl is the orchestrator's
 * responsibility, not the discovery layer's.
 */
export function isSameOrigin(url: string, seed: string): boolean {
  try {
    return new URL(url).hostname.toLowerCase() === new URL(seed).hostname.toLowerCase();
  } catch {
    return false;
  }
}

/**
 * Apply Firecrawl-style include/exclude path globs against the URL's
 * pathname. Empty include list = match anything; non-empty exclude list
 * always wins over include. Patterns are matched against the path only,
 * not the host or query string.
 *
 * Globs use minimatch semantics: "/sermons/*" matches "/sermons/foo" but
 * not "/sermons/foo/bar"; use "/sermons/**" to recurse. "/donate*" matches
 * "/donate", "/donate-now", "/donate/foo".
 */
export function matchesPathPatterns(
  url: string,
  includes: string[],
  excludes: string[]
): boolean {
  let path: string;
  try {
    path = new URL(url).pathname || "/";
  } catch {
    return false;
  }

  for (const pattern of excludes) {
    if (matchesGlob(path, pattern)) return false;
  }

  if (includes.length === 0) return true;
  for (const pattern of includes) {
    if (matchesGlob(path, pattern)) return true;
  }
  return false;
}

/**
 * Same-origin sniff for a candidate URL pulled out of an `<a href>` —
 * resolves it against the page's URL, normalizes, then checks origin and
 * filters. Returns the normalized absolute URL or null to skip.
 */
export function resolveLinkForCrawl(
  href: string,
  pageUrl: string,
  seed: string,
  includes: string[],
  excludes: string[]
): string | null {
  if (!href) return null;
  const trimmed = href.trim();
  if (!trimmed) return null;
  // Skip mailto/tel/javascript/data URIs and on-page anchors.
  if (/^(mailto:|tel:|javascript:|data:|#)/i.test(trimmed)) return null;

  let absolute: string;
  try {
    absolute = new URL(trimmed, pageUrl).toString();
  } catch {
    return null;
  }

  // Skip non-http(s) protocols.
  if (!/^https?:/i.test(absolute)) return null;

  const normalized = normalizeCrawlUrl(absolute);
  if (!isSameOrigin(normalized, seed)) return null;
  if (!matchesPathPatterns(normalized, includes, excludes)) return null;
  return normalized;
}
