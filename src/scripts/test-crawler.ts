/**
 * Smoke test for the in-house crawler module. Runs the full discovery →
 * fetch → convert pipeline against a real site and reports what came
 * back. Doesn't touch the database.
 *
 * Usage:
 *   npx tsx src/scripts/test-crawler.ts <seed-url> [limit] [--render]
 *
 * Examples:
 *   npx tsx src/scripts/test-crawler.ts https://mymobilemods.com
 *   npx tsx src/scripts/test-crawler.ts https://example.com 5
 *   npx tsx src/scripts/test-crawler.ts https://example.com 5 --render
 *
 * --render  Force every page through the headless-Chromium path
 *           (skips the cheap native-fetch tier). Use this to
 *           sanity-check Playwright works locally even on a static
 *           site that wouldn't normally trigger escalation.
 */
import {
  BOT_USER_AGENT,
  discoverUrls,
  fetchHtml,
  fetchHtmlRendered,
  htmlToMarkdown,
  isAllowed,
} from "@/lib/crawler";

async function main() {
  const args = process.argv.slice(2).filter((a) => !a.startsWith("--"));
  const flags = new Set(process.argv.slice(2).filter((a) => a.startsWith("--")));
  const seed = args[0] ?? "https://mymobilemods.com";
  const limit = Number(args[1] ?? 8);
  const forceRender = flags.has("--render");
  const includePatterns: string[] = [];
  const excludePatterns: string[] = [];

  console.log(`\n=== Crawler smoke test ===`);
  console.log(`seed:    ${seed}`);
  console.log(`limit:   ${limit}`);
  console.log(`UA:      ${BOT_USER_AGENT}`);
  console.log(`mode:    ${forceRender ? "force-render (Tier 2 only)" : "escalation (Tier 1 → Tier 2)"}`);

  const t0 = Date.now();
  console.log(`\n[1/3] Discovering URLs...`);
  const urls = await discoverUrls(seed, {
    limit,
    includePatterns,
    excludePatterns,
    userAgent: BOT_USER_AGENT,
  });
  console.log(`  -> found ${urls.length} URLs in ${Date.now() - t0}ms`);
  for (const u of urls) console.log(`     ${u}`);

  if (urls.length === 0) {
    console.log(`\n[!] No URLs discovered. Aborting.`);
    process.exit(1);
  }

  console.log(`\n[2/3] Robots check + fetch + convert per URL...\n`);
  const results = [] as Array<{
    url: string;
    status: "ok" | "robots" | "fetch" | "thin";
    title?: string;
    markdownLen?: number;
    durationMs: number;
    rendered?: boolean;
    escalatedThin?: boolean;
  }>;

  for (const url of urls) {
    const tStart = Date.now();
    const allowed = await isAllowed(url, BOT_USER_AGENT);
    if (!allowed) {
      results.push({ url, status: "robots", durationMs: Date.now() - tStart });
      continue;
    }
    const fetched = forceRender
      ? await fetchHtmlRendered(url, BOT_USER_AGENT)
      : await fetchHtml(url, BOT_USER_AGENT);
    if (!fetched) {
      results.push({ url, status: "fetch", durationMs: Date.now() - tStart });
      continue;
    }
    let converted = htmlToMarkdown(fetched.html, fetched.finalUrl);
    let escalatedThin = false;

    // Mirror the leaf task's thin-content escalation so the smoke
    // results reflect production behavior.
    if (!converted && !fetched.rendered) {
      const rendered = await fetchHtmlRendered(url, BOT_USER_AGENT);
      if (rendered) {
        converted = htmlToMarkdown(rendered.html, rendered.finalUrl);
        if (converted) {
          escalatedThin = true;
          results.push({
            url: rendered.finalUrl,
            status: "ok",
            title: converted.title,
            markdownLen: converted.markdown.length,
            durationMs: Date.now() - tStart,
            rendered: true,
            escalatedThin,
          });
          continue;
        }
      }
    }

    if (!converted) {
      // Even though we ended up thin, distinguish "Tier 1 served a
      // shell that Tier 2 also couldn't get past" from "Tier 1
      // returned thin and we didn't escalate". The duration is the
      // real tell (~10s = Chromium ran), but flag it explicitly too.
      const triedT2 = !fetched.rendered;
      results.push({
        url,
        status: "thin",
        durationMs: Date.now() - tStart,
        rendered: fetched.rendered,
        escalatedThin: triedT2,
      });
      continue;
    }
    results.push({
      url,
      status: "ok",
      title: converted.title,
      markdownLen: converted.markdown.length,
      durationMs: Date.now() - tStart,
      rendered: fetched.rendered,
    });
  }

  const tally = { ok: 0, robots: 0, fetch: 0, thin: 0, rendered: 0, escalatedThin: 0 };
  for (const r of results) {
    tally[r.status]++;
    if (r.rendered) tally.rendered++;
    if (r.escalatedThin) tally.escalatedThin++;
  }

  console.log(`\n[3/3] Summary`);
  console.log(
    `  ok=${tally.ok}  robots=${tally.robots}  fetch=${tally.fetch}  thin=${tally.thin}`
  );
  console.log(
    `  rendered=${tally.rendered}/${results.length}  escalated-from-thin=${tally.escalatedThin}`
  );
  for (const r of results) {
    const tag = r.status === "ok" ? "OK   " : `SKIP ${r.status.padEnd(6)}`;
    const tier =
      r.rendered === true
        ? r.escalatedThin
          ? "[T2*]"
          : "[T2 ]"
        : r.rendered === false
          ? "[T1 ]"
          : "[ -- ]";
    const meta =
      r.status === "ok"
        ? `${r.markdownLen}ch  "${(r.title ?? "").slice(0, 60)}"`
        : "";
    console.log(`  [${tag}] ${tier} ${r.durationMs}ms  ${r.url}  ${meta}`);
  }

  // Print a small sample of markdown from the first successful page so
  // we can eyeball heading structure, link absolutization, list shape.
  const first = results.find((r) => r.status === "ok");
  if (first) {
    const fetched = forceRender
      ? await fetchHtmlRendered(first.url, BOT_USER_AGENT)
      : await fetchHtml(first.url, BOT_USER_AGENT);
    if (fetched) {
      const converted = htmlToMarkdown(fetched.html, fetched.finalUrl);
      if (converted) {
        console.log(
          `\n--- sample markdown (first 1500 chars of "${converted.title}") ---`
        );
        console.log(converted.markdown.slice(0, 1500));
        console.log(`---`);
      }
    }
  }

  console.log(
    `\nTotal time: ${Date.now() - t0}ms.  Discovered=${urls.length}  Indexable=${tally.ok}`
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
