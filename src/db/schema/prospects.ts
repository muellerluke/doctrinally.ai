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
 * Contact info is intentionally lenient: at least one of `email` or
 * `phone` must be populated by the application layer, but both are
 * nullable at the column level so a phone-only or email-only capture
 * is valid. Postgres treats NULL as distinct in unique constraints, so
 * the per-channel uniques below allow many rows with NULL email (or
 * NULL phone) without conflict — the constraint only fires when a
 * concrete value repeats within the same church.
 *
 * `name` is also nullable: visitors are often willing to share contact
 * info before sharing a name, and we don't want to block lead capture
 * over it.
 *
 * `metadata.sessionHistory` keeps the audit trail of every session the
 * prospect has been seen in. `metadata.sourcePageTitle` records the
 * <title> of the page where they were first captured, so the dashboard
 * can show "what they were looking at" without an extra session join.
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
    name: text("name"),
    email: text("email"),
    phone: text("phone"),
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
        sourcePageTitle?: string;
      }>()
      .notNull()
      .default({}),
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
  },
  (table) => [
    unique("prospects_church_email_unique").on(table.churchId, table.email),
    unique("prospects_church_phone_unique").on(table.churchId, table.phone),
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
