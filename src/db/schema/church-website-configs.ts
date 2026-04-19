import {
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";
import { churches } from "./churches";

export const crawlStatusEnum = pgEnum("crawl_status", [
  "idle",
  "queued",
  "running",
  "succeeded",
  "failed",
]);

export const churchWebsiteConfigs = pgTable("church_website_configs", {
  id: uuid("id").defaultRandom().primaryKey(),
  churchId: uuid("church_id")
    .notNull()
    .unique()
    .references(() => churches.id, { onDelete: "cascade" }),
  // Domains beyond the primary church website that the crawler is allowed
  // to visit. Empty by default — the crawl stays on the church's own domain.
  additionalDomains: text("additional_domains")
    .array()
    .notNull()
    .default(sql`'{}'::text[]`),
  // Glob patterns of paths to keep, e.g. "/sermons/*". When non-empty the
  // crawl only ingests pages whose path matches one of these patterns.
  includePatterns: text("include_patterns")
    .array()
    .notNull()
    .default(sql`'{}'::text[]`),
  // Glob patterns of paths to skip, e.g. "/donate*", "/admin/*".
  excludePatterns: text("exclude_patterns")
    .array()
    .notNull()
    .default(sql`'{}'::text[]`),
  lastCrawlAt: timestamp("last_crawl_at", { mode: "date" }),
  lastCrawlStatus: crawlStatusEnum("last_crawl_status").notNull().default("idle"),
  lastCrawlPagesIngested: integer("last_crawl_pages_ingested")
    .notNull()
    .default(0),
  lastCrawlError: text("last_crawl_error"),
  // Trigger.dev run id of the most recent crawl orchestrator run, useful
  // for surfacing live progress in the settings UI.
  lastCrawlRunId: text("last_crawl_run_id"),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
});

export const churchWebsiteConfigsRelations = relations(
  churchWebsiteConfigs,
  ({ one }) => ({
    church: one(churches, {
      fields: [churchWebsiteConfigs.churchId],
      references: [churches.id],
    }),
  })
);
