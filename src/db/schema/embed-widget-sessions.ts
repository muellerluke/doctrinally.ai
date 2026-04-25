import {
  boolean,
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { churches } from "./churches";
import { chats } from "./chats";

/**
 * One row per visitor-device-origin triplet. Pairs with a `chats` row
 * (`chat_id` FK) so the existing message history + retrieval pipeline
 * serves widget conversations without a second storage backend.
 *
 * `session_token_hash` stores `sha256` of the HMAC-signed token we hand
 * back to the widget. We never store the raw token — the widget holds
 * the only plaintext copy in `localStorage`. On each request the server
 * verifies the signature (stateless) and then looks up the row by hash
 * (stateful) so session lifecycle (`expires_at`, interaction flag,
 * outreach flag) can be enforced.
 *
 * `has_interacted` gates first-message sends — server rejects chat
 * writes from sessions that haven't fired at least one scroll / mouse /
 * key event yet. Cheap bot filter.
 *
 * `outreach_sent_at` is the server-side "only once per session" guard
 * for proactive outreach. The widget also holds a localStorage flag,
 * but the server's is authoritative.
 */
export const embedWidgetSessions = pgTable(
  "embed_widget_sessions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    churchId: uuid("church_id")
      .notNull()
      .references(() => churches.id, { onDelete: "cascade" }),
    chatId: uuid("chat_id")
      .notNull()
      .references(() => chats.id, { onDelete: "cascade" }),
    sessionTokenHash: text("session_token_hash").notNull().unique(),
    origin: text("origin").notNull(),
    userAgentHash: text("user_agent_hash"),
    visitorFingerprintHash: text("visitor_fingerprint_hash"),
    hasInteracted: boolean("has_interacted").notNull().default(false),
    outreachSentAt: timestamp("outreach_sent_at", { mode: "date" }),
    prospectId: uuid("prospect_id"),
    // Running conversation summary. Regenerated in the background after
    // each assistant reply so returning visitors don't pay a handshake
    // cost for rehydrating full message history — the summary goes
    // into the LLM's system prompt, and the widget UI starts fresh on
    // every page load (we don't render prior messages).
    conversationSummary: text("conversation_summary"),
    summaryUpdatedAt: timestamp("summary_updated_at", { mode: "date" }),
    metadata: jsonb("metadata")
      .$type<{
        lastPageUrl?: string;
        lastPageTitle?: string;
        lastVisibleTextHash?: string;
      }>()
      .notNull()
      .default({}),
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
    lastSeenAt: timestamp("last_seen_at", { mode: "date" })
      .defaultNow()
      .notNull(),
    expiresAt: timestamp("expires_at", { mode: "date" }).notNull(),
  },
  (table) => [
    index("embed_sessions_church_id_idx").on(table.churchId),
    index("embed_sessions_expires_at_idx").on(table.expiresAt),
  ]
);

export const embedWidgetSessionsRelations = relations(
  embedWidgetSessions,
  ({ one }) => ({
    church: one(churches, {
      fields: [embedWidgetSessions.churchId],
      references: [churches.id],
    }),
    chat: one(chats, {
      fields: [embedWidgetSessions.chatId],
      references: [chats.id],
    }),
  })
);
