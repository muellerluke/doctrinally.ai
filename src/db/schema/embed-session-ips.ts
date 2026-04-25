import {
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { embedWidgetSessions } from "./embed-widget-sessions";

/**
 * Per-session IP set, broken out of `embed_widget_sessions.metadata`
 * so each new IP or `lastSeenAt` bump is a single-row write rather
 * than rewriting the entire metadata JSONB blob.
 *
 * For a busy session (200+ msg/hour from the same IP) this drops the
 * write footprint by ~95% — we update one tiny row, not a multi-KB
 * jsonb column.
 *
 * Composite PK `(session_id, ip_hash)` makes lookup-by-(session, ip)
 * a single index hit and the upsert path a clean
 * `INSERT … ON CONFLICT DO UPDATE`.
 */
export const embedSessionIps = pgTable(
  "embed_session_ips",
  {
    sessionId: uuid("session_id")
      .notNull()
      .references(() => embedWidgetSessions.id, { onDelete: "cascade" }),
    ipHash: text("ip_hash").notNull(),
    firstSeenAt: timestamp("first_seen_at", { mode: "date" })
      .defaultNow()
      .notNull(),
    lastSeenAt: timestamp("last_seen_at", { mode: "date" })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.sessionId, table.ipHash] }),
  ]
);
