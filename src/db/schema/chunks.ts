import {
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
  vector,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { documents } from "./documents";
import { churches } from "./churches";

export const chunks = pgTable("chunks", {
  id: uuid("id").defaultRandom().primaryKey(),
  documentId: uuid("document_id")
    .notNull()
    .references(() => documents.id, { onDelete: "cascade" }),
  churchId: uuid("church_id")
    .notNull()
    .references(() => churches.id, { onDelete: "cascade" }),
  content: text("content").notNull(),
  chunkIndex: integer("chunk_index").notNull(),
  heading: text("heading"),
  startTime: integer("start_time"),
  endTime: integer("end_time"),
  pageNumber: integer("page_number"),
  metadata: jsonb("metadata").$type<Record<string, unknown>>(),
  embedding: vector("embedding", { dimensions: 1536 }),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
});

export const chunksRelations = relations(chunks, ({ one }) => ({
  document: one(documents, {
    fields: [chunks.documentId],
    references: [documents.id],
  }),
  church: one(churches, {
    fields: [chunks.churchId],
    references: [churches.id],
  }),
}));
