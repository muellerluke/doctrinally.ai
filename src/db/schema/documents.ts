import {
  boolean,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";
import { churches } from "./churches";
import { users } from "./users";
import { folders } from "./folders";
import { chunks } from "./chunks";

export const documentTypeEnum = pgEnum("document_type", [
  "youtube",
  "video",
  "pdf",
  "word",
  "platejs",
  "sermon",
  "website_page",
]);

export const documentStatusEnum = pgEnum("document_status", [
  "draft",
  "uploaded",
  "queued",
  "processing",
  "indexed",
  "failed",
]);

export const documents = pgTable(
  "documents",
  {
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
  folderId: uuid("folder_id").references(() => folders.id, {
    onDelete: "set null",
  }),
  sourceUrl: text("source_url"),
  // Extracted YouTube video id. Null for non-YouTube docs. Populated on both
  // manual uploads and channel auto-sync to make per-church dedup cheap via
  // the partial unique index below.
  youtubeVideoId: text("youtube_video_id"),
  blobPath: text("blob_path"),
  content: text("content"),
  metadata: jsonb("metadata").$type<Record<string, unknown>>(),
  // Sermon-specific metadata (speaker, date, tags, series). Null for non-sermons.
  sermonMetadata: jsonb("sermon_metadata").$type<{
    speaker?: string;
    sermonDate?: string;
    series?: string;
    tags?: string[];
  }>(),
  // When a sermon is published into the library, this records the publish time.
  publishedFromSermonAt: timestamp("published_from_sermon_at", { mode: "date" }),
  // Whether this document is visible in the member-facing chat's retrieval.
  // Defaults to true for existing document types; new sermons default to false
  // and the pastor must opt in on publish.
  membersSearchable: boolean("members_searchable").notNull().default(true),
  errorMessage: text("error_message"),
  // How many times the hourly scheduler has re-queued this document. Caps
  // out the retry-failed-documents loop so a permanently broken doc stops
  // bouncing. Reset to 0 on successful index or when an admin manually
  // retries from the UI.
  retryCount: integer("retry_count").notNull().default(0),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
  },
  (table) => [
    // Per-church dedup on YouTube video id. Partial so non-YouTube rows
    // (youtube_video_id IS NULL) don't collide with each other.
    uniqueIndex("documents_church_youtube_video_idx")
      .on(table.churchId, table.youtubeVideoId)
      .where(sql`${table.youtubeVideoId} IS NOT NULL`),
  ]
);

export const documentsRelations = relations(documents, ({ one, many }) => ({
  church: one(churches, {
    fields: [documents.churchId],
    references: [churches.id],
  }),
  uploader: one(users, {
    fields: [documents.uploadedBy],
    references: [users.id],
  }),
  folder: one(folders, {
    fields: [documents.folderId],
    references: [folders.id],
  }),
  chunks: many(chunks),
}));
