import {
  integer,
  pgTable,
  primaryKey,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

/**
 * Authoritative hard cap for widget abuse, per (session, hour).
 * Postgres upsert is the multi-region-safe layer behind the in-memory
 * token bucket in `src/lib/embed/rate-limit.ts`. The composite primary
 * key (session_id, hour_bucket) makes `ON CONFLICT DO UPDATE` cheap —
 * one round-trip per message vs. the multi-step in-memory tracker.
 *
 * `hour_bucket` is normalized to the top of the hour in UTC. A nightly
 * job trims rows older than 48 hours so the table stays bounded.
 *
 * This is an in-table counter, not a log. No PII, no free-text.
 */
export const embedRateCounters = pgTable(
  "embed_rate_counters",
  {
    sessionId: uuid("session_id").notNull(),
    hourBucket: timestamp("hour_bucket", { mode: "date" }).notNull(),
    count: integer("count").notNull().default(0),
  },
  (table) => [
    primaryKey({ columns: [table.sessionId, table.hourBucket] }),
  ]
);
