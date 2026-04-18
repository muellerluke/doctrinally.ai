import {
  index,
  integer,
  jsonb,
  pgTable,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { churches } from "./churches";
import { documents } from "./documents";
import { users } from "./users";

/**
 * A single sermon has exactly one ongoing chat session — enforced by
 * `document_id UNIQUE`. All turns accumulate into the same row's
 * `messages` array so reopening the sermon hydrates the full transcript.
 */
export interface SermonChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  // Citations discovered by the assistant during the turn, in the same shape
  // as the member-facing chat so <document>ID</document> tags render via
  // CitationBadge without any translation layer.
  citations?: Array<Record<string, unknown>>;
  createdAt: string; // ISO — stored as string for JSONB friendliness
}

export const sermonSessions = pgTable(
  "sermon_sessions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    documentId: uuid("document_id")
      .notNull()
      .unique()
      .references(() => documents.id, { onDelete: "cascade" }),
    churchId: uuid("church_id")
      .notNull()
      .references(() => churches.id, { onDelete: "cascade" }),
    createdByUserId: uuid("created_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    messages: jsonb("messages")
      .$type<SermonChatMessage[]>()
      .notNull()
      .default([]),
    tokensInTotal: integer("tokens_in_total").notNull().default(0),
    tokensOutTotal: integer("tokens_out_total").notNull().default(0),
    centsSpent: integer("cents_spent").notNull().default(0),
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
  },
  (table) => [index("sermon_sessions_church_id_idx").on(table.churchId)]
);

export const sermonSessionsRelations = relations(sermonSessions, ({ one }) => ({
  document: one(documents, {
    fields: [sermonSessions.documentId],
    references: [documents.id],
  }),
  church: one(churches, {
    fields: [sermonSessions.churchId],
    references: [churches.id],
  }),
  createdBy: one(users, {
    fields: [sermonSessions.createdByUserId],
    references: [users.id],
  }),
}));
