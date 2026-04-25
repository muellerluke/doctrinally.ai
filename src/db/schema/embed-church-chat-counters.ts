import {
  integer,
  pgTable,
  primaryKey,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

/**
 * Per-church hourly chat-message counter. Distinct from the
 * per-session counter (`embed_rate_counters`) — that one defends a
 * single visitor against runaway behavior, this one defends a
 * single CHURCH against the "burn through the monthly message budget
 * in 30 minutes" denial-of-service vector.
 *
 * Hourly buckets in UTC. The hard cap (currently 200/hour/church)
 * means even at sustained max abuse, the monthly budget is
 * stretched to ~7 hours of pain instead of 30 minutes. Combined
 * with the per-session and per-IP caps, a real DoS would need
 * dozens of concurrent IPs all chatting at full rate — at which
 * point we have other signals to act on.
 *
 * Composite PK on `(church_id, hour_bucket)` makes the upsert path
 * one round-trip via `INSERT … ON CONFLICT DO UPDATE`.
 */
export const embedChurchChatCounters = pgTable(
  "embed_church_chat_counters",
  {
    churchId: uuid("church_id").notNull(),
    hourBucket: timestamp("hour_bucket", { mode: "date" }).notNull(),
    count: integer("count").notNull().default(0),
  },
  (table) => [
    primaryKey({ columns: [table.churchId, table.hourBucket] }),
  ]
);
