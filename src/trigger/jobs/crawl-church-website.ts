import { task, tasks } from "@trigger.dev/sdk/v3";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import {
  churches,
  churchWebsiteConfigs,
  documents,
  subscriptions,
} from "@/db/schema";
import { crawlSite, type CrawledPage } from "@/lib/firecrawl";
import { logProcessingError } from "../utils/error-logging";

const PLAN_PAGE_LIMITS: Record<string, number> = {
  standard: 50,
  enterprise: 100,
};

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
 * Page limit is plan-derived (50 standard, 100 enterprise) and split
 * evenly across domains when the church has additional domains
 * configured. Splitting keeps the per-church monthly Firecrawl spend
 * bounded regardless of how many domains an admin adds.
 */
export const crawlChurchWebsite = task({
  id: "crawl-church-website",
  // Crawls of large parish sites can sit at "scraping" for several
  // minutes while Firecrawl walks the sitemap, so give the orchestrator
  // a long-running machine.
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

    const [sub] = await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.churchId, churchId))
      .limit(1);

    const planLimit = sub ? PLAN_PAGE_LIMITS[sub.plan] ?? 50 : 50;

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
    const perDomainLimit = Math.max(1, Math.ceil(planLimit / domains.length));

    try {
      const allPages: CrawledPage[] = [];
      for (const domain of domains) {
        const pages = await crawlSite({
          url: domain,
          includePatterns,
          excludePatterns,
          limit: perDomainLimit,
        });
        allPages.push(...pages);
        if (allPages.length >= planLimit) break;
      }

      const trimmed = allPages.slice(0, planLimit);

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
        pagesCrawled: trimmed.length,
        pagesQueued: queued,
        domains,
        planLimit,
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
