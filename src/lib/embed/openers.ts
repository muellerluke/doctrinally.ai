/**
 * Proactive-outreach opener picker.
 *
 * Two tiers, matching the product plan:
 *
 *   Tier 1 (template)  — keyword-matched substitution against the
 *   church's stored `embedOpenerTemplates`. Instant, zero AI cost.
 *
 *   Tier 2 (AI-personalized) — when `embedAiOpenerEnabled` is on, the
 *   /api/embed/outreach route calls `mercury-2` with a tight system
 *   prompt and returns its output. This module still ships the Tier 1
 *   result as an immediate fallback so the visitor never waits.
 *
 * Topic extraction is intentionally lightweight (headings + TF-ish
 * scoring on visible-text words). We'd need a second AI call to do
 * anything smarter, and Tier 1 is explicitly the no-AI path.
 */

const STOPWORDS = new Set<string>([
  "the",
  "and",
  "for",
  "you",
  "are",
  "with",
  "that",
  "this",
  "from",
  "have",
  "has",
  "will",
  "was",
  "but",
  "our",
  "your",
  "they",
  "their",
  "there",
  "what",
  "when",
  "where",
  "which",
  "about",
  "into",
  "not",
  "all",
  "any",
  "can",
  "may",
  "just",
  "been",
  "being",
  "also",
  "more",
  "some",
  "than",
  "who",
  "why",
  "how",
  "him",
  "her",
  "his",
  "hers",
  "its",
  "it's",
]);

function cleanTopicPhrase(raw: string): string {
  return raw
    .replace(/\s+/g, " ")
    .replace(/[^\p{L}\p{N} '-]/gu, "")
    .trim()
    .slice(0, 60);
}

/**
 * Cheap topic extraction from the visible-text payload the widget
 * sends. Prefers the first non-trivial heading fragment; falls back
 * to the most common content word across paragraphs.
 */
export function extractTopic(visibleText: string): string {
  const clean = (visibleText || "").replace(/\u00A0/g, " ").trim();
  if (!clean) return "this topic";

  const lines = clean.split(/\n+/).map((l) => l.trim()).filter(Boolean);

  // Prefer the first short line — these tend to be headings once the
  // widget's IntersectionObserver-based extractor concatenates text.
  const headingLike = lines.find((line) => {
    const words = line.split(/\s+/).length;
    return words >= 2 && words <= 10 && !line.endsWith(".");
  });
  if (headingLike) {
    const phrase = cleanTopicPhrase(headingLike);
    if (phrase) return phrase;
  }

  const freq = new Map<string, number>();
  for (const word of clean.toLowerCase().match(/[\p{L}']{4,}/gu) ?? []) {
    if (STOPWORDS.has(word)) continue;
    freq.set(word, (freq.get(word) ?? 0) + 1);
  }
  if (freq.size === 0) return "this topic";

  const top = [...freq.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([w]) => w);
  if (top.length === 0) return "this topic";
  return top.join(" ").slice(0, 60);
}

/**
 * Pick a template. When multiple templates are configured, rotates
 * deterministically based on the session id so the same session
 * always sees the same opener (avoids a second outreach feeling like
 * a different bot) but sessions don't all see the same line.
 */
export function pickTemplate({
  templates,
  sessionId,
}: {
  templates: string[];
  sessionId: string;
}): string {
  const nonEmpty = (templates ?? []).filter((t) => t && t.trim().length > 0);
  const pool = nonEmpty.length
    ? nonEmpty
    : ["Hi — I'm the church's AI. Happy to answer any questions about {topic}."];
  // Simple hash: sum char codes, mod pool length.
  let h = 0;
  for (const ch of sessionId) h = (h + ch.charCodeAt(0)) | 0;
  return pool[Math.abs(h) % pool.length] ?? pool[0];
}

/**
 * Return the final Tier-1 opener, with `{topic}` substituted.
 */
export function buildTemplateOpener({
  templates,
  sessionId,
  visibleText,
}: {
  templates: string[];
  sessionId: string;
  visibleText: string;
}): { opener: string; topic: string } {
  const topic = extractTopic(visibleText);
  const template = pickTemplate({ templates, sessionId });
  const opener = template.replace(/\{topic\}/g, topic);
  return { opener, topic };
}
