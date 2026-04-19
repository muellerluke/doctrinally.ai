import { schedules, tasks } from "@trigger.dev/sdk/v3";
import { and, eq, inArray, isNotNull } from "drizzle-orm";
import { db } from "@/db";
import { churches, subscriptions } from "@/db/schema";

/**
 * Monthly fan-out: refresh every active church's website ingest. Runs
 * at 04:00 UTC on the 1st of each month — late enough that no admin
 * is mid-edit, early enough that fresh pages are indexed before
 * Sunday morning traffic.
 *
 * We only touch churches that:
 *   - have actually configured a website domain
 *   - are still on a paying or trialing plan
 * Cancelled/past-due churches are skipped so we don't burn Firecrawl
 * credits on accounts that won't be used.
 */
export const monthlyWebsiteRecrawl = schedules.task({
  id: "monthly-website-recrawl",
  cron: "0 4 1 * *",
  machine: "small-1x",
  run: async () => {
    const eligible = await db
      .select({ churchId: churches.id })
      .from(churches)
      .innerJoin(subscriptions, eq(subscriptions.churchId, churches.id))
      .where(
        and(
          eq(churches.isActive, true),
          isNotNull(churches.websiteDomain),
          inArray(subscriptions.status, ["active", "trialing"])
        )
      );

    if (eligible.length === 0) {
      return { triggered: 0 };
    }

    const triggered = await tasks.batchTrigger(
      "crawl-church-website",
      eligible.map((row) => ({
        payload: { churchId: row.churchId, triggeredBy: "monthly" as const },
      }))
    );

    return {
      triggered: eligible.length,
      batchId: triggered.batchId,
    };
  },
});
