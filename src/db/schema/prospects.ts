import {
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { churches } from "./churches";
import { chats } from "./chats";

/**
 * Captured leads from anywhere a prospect can enter the funnel. The
 * embedded chat widget is the first source, but the shape is
 * deliberately polymorphic so a future contact form, manual-add UI, or
 * CSV import can all write to the same table without a migration.
 *
 * `source_type` names the origin; `source_ref` is an opaque reference
 * scoped to that source (session id for the widget, form id for a
 * contact form, admin user id for manual entries, etc.). The widget
 * keeps a hard link to `chat_id` + `session_id` so the transcript view
 * can load the conversation directly without dereferencing metadata.
 *
 * Unique `(church_id, email)` enforces merge-on-return: a visitor who
 * converts twice updates the existing row rather than duplicating.
 * `metadata.sessionHistory` keeps the audit trail of every session the
 * prospect has been seen in.
 */
export const prospects = pgTable(
  "prospects",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    churchId: uuid("church_id")
      .notNull()
      .references(() => churches.id, { onDelete: "cascade" }),
    chatId: uuid("chat_id").references(() => chats.id, {
      onDelete: "set null",
    }),
    // Soft reference — session is in a table that hasn't been declared
    // yet, and forcing a circular import to add an FK is not worth it.
    // The widget writes this id when capturing; merge-on-return appends
    // additional session ids to `metadata.sessionHistory`.
    sessionId: uuid("session_id"),
    name: text("name").notNull(),
    email: text("email").notNull(),
    sourceType: text("source_type").notNull(),
    sourceRef: text("source_ref"),
    sourceUrl: text("source_url"),
    status: text("status").notNull().default("new"),
    notes: text("notes"),
    metadata: jsonb("metadata")
      .$type<{
        sessionHistory?: string[];
        firstSeenAt?: string;
        lastSeenAt?: string;
      }>()
      .notNull()
      .default({}),
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
  },
  (table) => [
    unique("prospects_church_email_unique").on(table.churchId, table.email),
    index("prospects_church_id_idx").on(table.churchId),
    index("prospects_status_idx").on(table.status),
  ]
);

export const prospectsRelations = relations(prospects, ({ one }) => ({
  church: one(churches, {
    fields: [prospects.churchId],
    references: [churches.id],
  }),
  chat: one(chats, {
    fields: [prospects.chatId],
    references: [chats.id],
  }),
}));

export type ProspectStatus = "new" | "contacted" | "converted" | "archived";
export type ProspectSourceType =
  | "embed_widget"
  | "contact_form"
  | "manual"
  | "import";
