-- Indexes were already created directly against production via
-- CREATE INDEX CONCURRENTLY before this migration landed. Use
-- IF NOT EXISTS so this migration is a no-op on prod and a real
-- create on any fresh dev/staging database.
CREATE INDEX IF NOT EXISTS "chunks_embedding_hnsw_idx" ON "chunks" USING hnsw ("embedding" vector_cosine_ops);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "chunks_content_fts_idx" ON "chunks" USING gin (to_tsvector('english', "content"));