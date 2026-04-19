import {
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
  vector,
} from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";
import { documents } from "./documents";
import { churches } from "./churches";

export const chunks = pgTable(
  "chunks",
  {
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
  },
  (table) => [
    // HNSW index over the 1536-dim embedding using cosine distance. Without
    // this, `embedding <=> vector` does a sequential scan and semantic
    // search balloons to 20+ seconds on a ~100k-row table. Cosine matches
    // the operator used by `hybridSearch` in src/lib/retrieval.ts.
    index("chunks_embedding_hnsw_idx").using(
      "hnsw",
      table.embedding.op("vector_cosine_ops")
    ),
    // GIN index on the English tsvector projection of `content`, powering
    // the `@@ to_tsquery(...)` branch of hybrid search. Postgres uses this
    // only when the query's tsvector expression matches the indexed one,
    // so the literal `to_tsvector('english', content)` must stay identical
    // in both the query and the index.
    index("chunks_content_fts_idx").using(
      "gin",
      sql`to_tsvector('english', ${table.content})`
    ),
  ]
);

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
