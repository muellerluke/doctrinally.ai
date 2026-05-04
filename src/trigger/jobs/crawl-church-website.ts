import { task, tasks } from "@trigger.dev/sdk/v3";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { churches, churchWebsiteConfigs, documents } from "@/db/schema";
import { discoverUrls } from "@/lib/crawler";
import {
  BOT_USER_AGENT,
  type CrawledPage,
  type FetchAndConvertResult,
} from "@/lib/crawler/types";
import { logProcessingError } from "../utils/error-logging";

/**
 * Operational safety ceiling — not a plan-tier gate. Caps the
 * per-crawl URL count so a misconfigured site (calendar with infinite
 * date facets, runaway pagination, hostile link graph) can't burn
 * unbounded compute or embedding spend on a single run. Set high
 * enough that any realistic church website indexes in full.
 */
const MAX_PAGES_PER_CRAWL = 10_000;

type Trigger = "manual" | "monthly" | "signup";

/**
 * Crawl every configured domain for a church, replace its previously
 * ingested website pages with the fresh set, and queue each new page
 * through the standard chunk/embed pipeline.
 *
 * Old pages are deleted *before* the new ones are inserted so the
 * library never holds two snapshots of the same crawl side-by-side.
 * Cascade delete on the chunks FK handles vector cleanup.
 *
 * No plan-tier page limit — every church gets to index its full site,
 * bounded only by `MAX_PAGES_PER_CRAWL` as a safety net. Multiple
 * domains share that ceiling evenly via `perDomainLimit`.
 */
export const crawlChurchWebsite = task({
  id: "crawl-church-website",
  // Discovery is a few sitemap fetches + bounded BFS; the heavy
  // per-page fetch+convert work happens in fan-out leaf tasks. The
  // orchestrator still spends real time waiting on those, hence the
  // long ceiling.
  machine: "small-1x",
  maxDuration: 900,
  retry: { maxAttempts: 1 },
  run: async (
    payload: { churchId: string; triggeredBy: Trigger },
    { ctx }
  ) => {
    const { churchId, triggeredBy } = payload;

    const [church] = await db
      .select()
      .from(churches)
      .where(eq(churches.id, churchId))
      .limit(1);

    if (!church) throw new Error(`Church ${churchId} not found`);
    if (!church.websiteDomain) {
      throw new Error(`Church ${churchId} has no websiteDomain configured`);
    }

    const [config] = await db
      .select()
      .from(churchWebsiteConfigs)
      .where(eq(churchWebsiteConfigs.churchId, churchId))
      .limit(1);

    // Mark in-progress so the settings UI can show a live status.
    await db
      .update(churchWebsiteConfigs)
      .set({
        lastCrawlStatus: "running",
        lastCrawlRunId: ctx.run.id,
        lastCrawlError: null,
        updatedAt: new Date(),
      })
      .where(eq(churchWebsiteConfigs.churchId, churchId));

    const additionalDomains = config?.additionalDomains ?? [];
    const includePatterns = config?.includePatterns ?? [];
    const excludePatterns = config?.excludePatterns ?? [];

    const domains = [church.websiteDomain, ...additionalDomains];
    const perDomainLimit = Math.max(
      1,
      Math.ceil(MAX_PAGES_PER_CRAWL / domains.length)
    );

    try {
      // 1. URL discovery — sitemap + BFS, per-domain — running serially
      //    keeps a misbehaving sitemap on one domain from racing the others
      //    and is cheap (a few HTTP fetches each).
      const discovered = new Set<string>();
      for (const domain of domains) {
        const urls = await discoverUrls(domain, {
          limit: perDomainLimit,
          includePatterns,
          excludePatterns,
          userAgent: BOT_USER_AGENT,
        });
        for (const u of urls) {
          discovered.add(u);
          if (discovered.size >= MAX_PAGES_PER_CRAWL) break;
        }
        if (discovered.size >= MAX_PAGES_PER_CRAWL) break;
      }

      const urlList = Array.from(discovered).slice(0, MAX_PAGES_PER_CRAWL);

      // 2. Fan out one fetch+convert task per URL. The leaf task never
      //    throws on per-page failures — it returns `{ ok: false, reason }`
      //    so a single 404 doesn't poison the whole crawl.
      const skipReasons = { robots: 0, fetch: 0, thin: 0, "non-html": 0 };
      const trimmed: CrawledPage[] = [];

      if (urlList.length > 0) {
        const batch = await tasks.batchTriggerAndWait(
          "fetch-and-convert-page",
          urlList.map((url) => ({
            payload: { url, userAgent: BOT_USER_AGENT },
          }))
        );

        for (const run of batch.runs) {
          if (!run.ok) continue;
          const out = run.output as FetchAndConvertResult;
          if (out.ok) {
            trimmed.push(out.page);
          } else {
            skipReasons[out.reason] = (skipReasons[out.reason] ?? 0) + 1;
          }
        }
      }

      // Replace the entire prior website-page snapshot. Trigger.dev
      // running a recrawl while the previous one is still inserting
      // documents is prevented by `triggerManualRecrawl` server-side,
      // but the cascade delete here is also defensive.
      await db
        .delete(documents)
        .where(
          and(
            eq(documents.churchId, churchId),
            eq(documents.type, "website_page")
          )
        );

      let queued = 0;
      for (const page of trimmed) {
        const [inserted] = await db
          .insert(documents)
          .values({
            churchId,
            title: page.title,
            type: "website_page",
            status: "queued",
            sourceUrl: page.url,
            content: page.markdown,
            metadata: { crawledAt: new Date().toISOString(), triggeredBy },
          })
          .returning({ id: documents.id });

        try {
          await tasks.trigger("process-website-page", { documentId: inserted.id });
          queued++;
        } catch (err) {
          console.error(
            `[crawl-church-website] failed to enqueue process-website-page for ${inserted.id}`,
            err
          );
        }
      }

      await db
        .update(churchWebsiteConfigs)
        .set({
          lastCrawlAt: new Date(),
          lastCrawlStatus: "succeeded",
          lastCrawlPagesIngested: queued,
          lastCrawlError: null,
          updatedAt: new Date(),
        })
        .where(eq(churchWebsiteConfigs.churchId, churchId));

      return {
        churchId,
        triggeredBy,
        pagesDiscovered: urlList.length,
        pagesCrawled: trimmed.length,
        pagesQueued: queued,
        skipReasons,
        domains,
        maxPages: MAX_PAGES_PER_CRAWL,
      };
    } catch (err) {
      logProcessingError("crawl-church-website", err);
      const message = err instanceof Error ? err.message : "Unknown crawl error";

      await db
        .update(churchWebsiteConfigs)
        .set({
          lastCrawlStatus: "failed",
          lastCrawlError: message,
          updatedAt: new Date(),
        })
        .where(eq(churchWebsiteConfigs.churchId, churchId));

      throw err;
    }
  },
});
