import { Readability } from "@mozilla/readability";
// @joplin/turndown-plugin-gfm has no types but ships a CJS bundle that
// resolves cleanly at runtime; declare the export shape locally.
import { gfm } from "@joplin/turndown-plugin-gfm";
import { parseHTML } from "linkedom";
import TurndownService from "turndown";

const MIN_MARKDOWN_CHARS = 200;

// Selectors whose subtrees never carry article content. Stripped on the
// raw DOM before either Readability or the manual fallback runs.
const STRIP_SELECTORS = [
  "script",
  "style",
  "noscript",
  "svg",
  "iframe",
  "video",
  "audio",
  "canvas",
  "form",
  "input",
  "button",
  "[aria-hidden=\"true\"]",
  "[hidden]",
  // Common chrome/widget/cookie-banner classes that Readability sometimes
  // fails to demote because they're at body-root and have visible text.
  "[class*=\"cookie\"]",
  "[id*=\"cookie\"]",
  "[class*=\"newsletter\"]",
  "[class*=\"subscribe\"]",
  "[class*=\"popup\"]",
  "[role=\"dialog\"]",
  "[role=\"alertdialog\"]",
];

// Selectors stripped only when we fall back from Readability — they
// frequently contain content links we DO want during BFS, so the
// discovery path keeps them. Only the article-conversion path drops them.
const FALLBACK_STRIP_SELECTORS = [
  "header",
  "footer",
  "nav",
  "aside",
  "[role=\"navigation\"]",
  "[role=\"banner\"]",
  "[role=\"contentinfo\"]",
  "[class*=\"sidebar\"]",
  "[class*=\"menu\"]",
];

function stripSelectors(root: Element | Document, selectors: string[]): void {
  for (const sel of selectors) {
    for (const el of Array.from(root.querySelectorAll(sel))) {
      el.remove();
    }
  }
}

/**
 * Rewrite `<a href>` and `<img src>` (plus srcset) to absolute URLs against
 * the page's URL so the resulting markdown still works when copied or
 * re-rendered. Done on the parsed DOM rather than via a Turndown rule
 * because Turndown's rules see attributes too late to influence link
 * formatting.
 */
function absolutizeUrls(root: Element, base: string): void {
  for (const a of Array.from(root.querySelectorAll("a[href]"))) {
    const href = a.getAttribute("href");
    if (!href) continue;
    try {
      a.setAttribute("href", new URL(href, base).toString());
    } catch {
      // Leave the attribute untouched — Turndown will still render the
      // link text, just with a relative href.
    }
  }
  for (const img of Array.from(root.querySelectorAll("img[src]"))) {
    const src = img.getAttribute("src");
    if (!src) continue;
    try {
      img.setAttribute("src", new URL(src, base).toString());
    } catch {
      // Same fallback as above.
    }
    img.removeAttribute("srcset");
  }
}

function buildTurndown(): TurndownService {
  const td = new TurndownService({
    headingStyle: "atx",
    hr: "---",
    bulletListMarker: "-",
    codeBlockStyle: "fenced",
    emDelimiter: "_",
    strongDelimiter: "**",
    linkStyle: "inlined",
  });
  td.use(gfm);
  // Drop attributes we don't want bleeding into the markdown — chiefly
  // `<picture>`/`<source>` which Turndown otherwise emits as an empty
  // image, plus `<figure>` wrappers around the same image.
  td.remove(["script", "style", "noscript", "iframe", "form"]);
  return td;
}

function deriveTitleFromUrl(url: string): string {
  try {
    const u = new URL(url);
    const segment = u.pathname.split("/").filter(Boolean).pop() ?? "";
    if (!segment) return u.hostname;
    return segment
      .replace(/[-_]+/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase());
  } catch {
    return url;
  }
}

export interface ConvertedPage {
  title: string;
  markdown: string;
}

/**
 * Convert raw HTML into clean markdown. Tries Mozilla Readability first
 * (the same engine that powers Firefox Reader View) and falls back to
 * `<main>` / `<article>` / a hand-cleaned `<body>` for pages that aren't
 * article-shaped enough for Readability to produce a result. Returns
 * null when the resulting markdown is shorter than `MIN_MARKDOWN_CHARS`,
 * since thin pages mostly hurt retrieval.
 */
export function htmlToMarkdown(
  html: string,
  sourceUrl: string
): ConvertedPage | null {
  const { document } = parseHTML(html);

  // Capture the title up-front before Readability potentially mutates the
  // tree out from under us.
  const documentTitle = document.title?.trim() ?? "";

  // Cheap pre-strip on the live document; Readability still gets a
  // representative tree but with no script/style noise.
  stripSelectors(document, STRIP_SELECTORS);

  let articleHtml: string | null = null;
  let articleTitle: string | null = null;

  try {
    // Readability mutates its input, so parse a fresh copy of the HTML.
    // The pre-strip above already happened on the original document we
    // serialize from; clone the post-strip serialization.
    const serialized = document.documentElement?.outerHTML ?? html;
    const { document: readDoc } = parseHTML(serialized);
    const reader = new Readability(readDoc as unknown as Document, {
      keepClasses: false,
      disableJSONLD: false,
    });
    const result = reader.parse();
    if (result?.content && result.content.trim().length >= MIN_MARKDOWN_CHARS) {
      articleHtml = result.content;
      articleTitle = result.title?.trim() || null;
    }
  } catch {
    // Fall through to the manual fallback below.
  }

  if (!articleHtml) {
    // Manual fallback: prefer semantically meaningful containers.
    stripSelectors(document, FALLBACK_STRIP_SELECTORS);
    const candidate =
      document.querySelector("main") ??
      document.querySelector("article") ??
      document.querySelector("[role=\"main\"]") ??
      document.body;
    if (!candidate) return null;
    articleHtml = candidate.innerHTML;
  }

  // Re-parse the chosen HTML so we can absolutize links cleanly. Working
  // on a fresh subtree avoids interfering with the live document we
  // already used for title extraction.
  const { document: contentDoc } = parseHTML(`<div>${articleHtml}</div>`);
  const root = contentDoc.querySelector("div");
  if (!root) return null;
  absolutizeUrls(root, sourceUrl);

  const td = buildTurndown();
  const rawMarkdown = td.turndown(root.innerHTML);

  const markdown = rawMarkdown
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  if (markdown.length < MIN_MARKDOWN_CHARS) return null;

  const title =
    articleTitle ||
    documentTitle ||
    deriveTitleFromUrl(sourceUrl);

  return { title, markdown };
}
