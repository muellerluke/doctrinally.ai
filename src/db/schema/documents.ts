import { jsonb, pgEnum, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { churches } from "./churches";
import { users } from "./users";

export const documentTypeEnum = pgEnum("document_type", [
  "youtube",
  "video",
  "pdf",
  "word",
  "platejs",
]);

export const documentStatusEnum = pgEnum("document_status", [
  "draft",
  "uploaded",
  "queued",
  "processing",
  "indexed",
  "failed",
]);

export const documents = pgTable("documents", {
  id: uuid("id").defaultRandom().primaryKey(),
  churchId: uuid("church_id")
    .notNull()
    .references(() => churches.id, { onDelete: "cascade" }),
  uploadedBy: uuid("uploaded_by").references(() => users.id, {
    onDelete: "set null",
  }),
  title: text("title").notNull(),
  description: text("description"),
  type: documentTypeEnum("type").notNull(),
  status: documentStatusEnum("status").notNull().default("draft"),
  sourceUrl: text("source_url"),
  blobPath: text("blob_path"),
  content: text("content"),
  metadata: jsonb("metadata").$type<Record<string, unknown>>(),
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
});
