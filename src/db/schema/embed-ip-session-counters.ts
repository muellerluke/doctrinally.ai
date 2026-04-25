import {
  date,
  integer,
  pgTable,
  primaryKey,
  text,
} from "drizzle-orm/pg-core";

/**
 * Daily session-creation counter per IP. Caps how many fresh widget
 * sessions a single IP can mint in a 24-hour window — the second leg
 * of the IP-binding security model.
 *
 * Why this is separate from the session-IP binding (`ipHashes` in
 * `embed_widget_sessions.metadata`):
 *   - Session-IP binding limits how many IPs can USE one session
 *     (defends against token theft + sharing).
 *   - This counter limits how many SESSIONS one IP can CREATE
 *     (defends against IP-rotation-free spam — if you want to
 *     submit 1000 fake prospects, you need 1000/5 ≈ 200 IPs).
 *
 * Composite PK on `(ip_hash, day_bucket)` makes the upsert path one
 * round-trip via `INSERT … ON CONFLICT DO UPDATE`. Day-granularity
 * is intentional — hour-buckets here would make a "fresh device
 * every coffee shop" lifestyle indistinguishable from "automated
 * spam from one ASN."
 *
 * `ip_hash` is `sha256(normalizedIp)` — never the raw address. We
 * do not need the original IP for any product feature, so storing
 * only the hash keeps PII exposure minimal.
 *
 * A nightly cron trims rows older than 7 days so the table stays
 * bounded. The data has no value past the daily window.
 */
export const embedIpSessionCounters = pgTable(
  "embed_ip_session_counters",
  {
    ipHash: text("ip_hash").notNull(),
    dayBucket: date("day_bucket", { mode: "string" }).notNull(),
    count: integer("count").notNull().default(0),
  },
  (table) => [primaryKey({ columns: [table.ipHash, table.dayBucket] })]
);
