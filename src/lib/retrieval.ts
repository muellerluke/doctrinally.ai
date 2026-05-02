import { db } from "@/db";
import { sql, eq, and } from "drizzle-orm";
import { chunks } from "@/db/schema/chunks";
import { documents } from "@/db/schema/documents";
import type { RetrievedChunk } from "@/lib/types/citations";

const OPENAI_EMBEDDINGS_URL = "https://api.openai.com/v1/embeddings";
const EMBEDDING_MODEL = "text-embedding-3-small";

/**
 * Retrieval scope. "member" filters to documents visible in the member-facing
 * chat (`members_searchable = true`). "full" returns every indexed document
 * for the church — used by the sermon-writer and doctrine-check, which must
 * see unpublished sermons and admin-only content.
 */
export type RetrievalScope = "member" | "full";

/**
 * Generate a single embedding vector for a user query.
 */
export async function generateQueryEmbedding(
  query: string
): Promise<number[]> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY is not set");

  const response = await fetch(OPENAI_EMBEDDINGS_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: EMBEDDING_MODEL,
      input: query,
      dimensions: 1536,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Embedding API error (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  return data.data[0].embedding;
}

/**
 * Semantic search using pgvector cosine distance.
 */
export async function semanticSearch(
  churchId: string,
  embedding: number[],
  limit = 10,
  scope: RetrievalScope = "member"
): Promise<RetrievedChunk[]> {
  const vectorStr = `[${embedding.join(",")}]`;
  const memberFilter =
    scope === "member" ? sql`AND d.members_searchable = TRUE` : sql``;

  const results = await db.execute(sql`
    SELECT
      c.id AS chunk_id,
      c.document_id,
      c.content,
      c.heading,
      c.start_time,
      c.end_time,
      c.page_number,
      1 - (c.embedding <=> ${vectorStr}::vector) AS semantic_similarity,
      d.title AS document_title,
      d.type AS document_type,
      d.source_url,
      d.blob_path
    FROM chunks c
    JOIN documents d ON d.id = c.document_id
    WHERE c.church_id = ${churchId}
      AND d.status = 'indexed'
      ${memberFilter}
      AND c.embedding IS NOT NULL
    ORDER BY c.embedding <=> ${vectorStr}::vector
    LIMIT ${limit}
  `);

  return (results as unknown as Record<string, unknown>[]).map((row) =>
    mapRowToChunk(row, "semantic")
  );
}

/**
 * Keyword search using PostgreSQL full-text search.
 */
export async function keywordSearch(
  churchId: string,
  query: string,
  limit = 10,
  scope: RetrievalScope = "member"
): Promise<RetrievedChunk[]> {
  // Convert query to tsquery format: split words and join with &
  const tsQuery = query
    .trim()
    .split(/\s+/)
    .filter((w) => w.length > 1)
    .map((w) => w.replace(/[^\w]/g, ""))
    .filter(Boolean)
    .join(" & ");

  if (!tsQuery) return [];

  const memberFilter =
    scope === "member" ? sql`AND d.members_searchable = TRUE` : sql``;

  const results = await db.execute(sql`
    SELECT
      c.id AS chunk_id,
      c.document_id,
      c.content,
      c.heading,
      c.start_time,
      c.end_time,
      c.page_number,
      ts_rank(to_tsvector('english', c.content), to_tsquery('english', ${tsQuery})) AS keyword_rank,
      d.title AS document_title,
      d.type AS document_type,
      d.source_url,
      d.blob_path
    FROM chunks c
    JOIN documents d ON d.id = c.document_id
    WHERE c.church_id = ${churchId}
      AND d.status = 'indexed'
      ${memberFilter}
      AND to_tsvector('english', c.content) @@ to_tsquery('english', ${tsQuery})
    ORDER BY ts_rank(to_tsvector('english', c.content), to_tsquery('english', ${tsQuery})) DESC
    LIMIT ${limit}
  `);

  return (results as unknown as Record<string, unknown>[]).map((row) =>
    mapRowToChunk(row, "keyword")
  );
}

/**
 * Reciprocal rank fusion — pure ranking function, exposed for unit testing.
 * k=60 is the standard RRF constant. Used only for ordering, not for the
 * returned similarity value.
 */
export function fuseRankings(
  semantic: RetrievedChunk[],
  keyword: RetrievedChunk[],
  limit: number,
  k = 60
): { score: number; chunk: RetrievedChunk }[] {
  const scores = new Map<string, { score: number; chunk: RetrievedChunk }>();

  semantic.forEach((chunk, rank) => {
    scores.set(chunk.chunkId, { score: 1 / (k + rank + 1), chunk });
  });

  keyword.forEach((chunk, rank) => {
    const rrfScore = 1 / (k + rank + 1);
    const existing = scores.get(chunk.chunkId);
    if (existing) {
      existing.score += rrfScore;
    } else {
      scores.set(chunk.chunkId, { score: rrfScore, chunk });
    }
  });

  return Array.from(scores.values())
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

/**
 * Cosine-similarity floor for semantic hits. `text-embedding-3-small` produces
 * scores in roughly [0.0, 0.7] for real content — anything below ~0.3 is noise.
 */
export const SEMANTIC_SIMILARITY_FLOOR = 0.3;

/**
 * Hybrid search variant that takes a pre-computed embedding instead of
 * generating one. Lets latency-sensitive callers (e.g. the embedded
 * widget) parallelize `generateQueryEmbedding` with their auth/rate-limit
 * checks, then hand the resulting vector here once everything is gated.
 *
 * `fusionMultiplier` controls how many candidates each leg fetches before
 * fusion — defaults to 2 (matches `hybridSearch`). One-shot RAG callers
 * can pass a smaller value (e.g. 1.5) to trim SQL work when they don't
 * need a re-query head-room.
 */
export async function hybridSearchWithEmbedding(
  churchId: string,
  embedding: number[],
  query: string,
  limit = 8,
  scope: RetrievalScope = "member",
  fusionMultiplier = 2
): Promise<RetrievedChunk[]> {
  const fetchLimit = Math.max(limit, Math.ceil(limit * fusionMultiplier));

  const [semanticResults, keywordResults] = await Promise.all([
    semanticSearch(churchId, embedding, fetchLimit, scope),
    keywordSearch(churchId, query, fetchLimit, scope),
  ]);

  // Drop semantic hits below the noise floor before fusion. This keeps
  // irrelevant chunks (query "pizza" matching sermons about "peace") from
  // riding into the result set on a weak cosine score.
  const filteredSemantic = semanticResults.filter(
    (c) =>
      typeof c.semanticSimilarity === "number" &&
      c.semanticSimilarity >= SEMANTIC_SIMILARITY_FLOOR
  );

  // Collect both scores per chunkId so a chunk found in both search methods
  // retains both signals through fusion.
  const semanticByChunk = new Map<string, number>();
  for (const chunk of filteredSemantic) {
    if (typeof chunk.semanticSimilarity === "number") {
      semanticByChunk.set(chunk.chunkId, chunk.semanticSimilarity);
    }
  }
  const keywordByChunk = new Map<string, number>();
  for (const chunk of keywordResults) {
    if (typeof chunk.keywordRank === "number") {
      keywordByChunk.set(chunk.chunkId, chunk.keywordRank);
    }
  }

  const ranked = fuseRankings(filteredSemantic, keywordResults, limit);

  if (ranked.length === 0) return [];

  return ranked.map(({ chunk }) => ({
    ...chunk,
    semanticSimilarity: semanticByChunk.get(chunk.chunkId),
    keywordRank: keywordByChunk.get(chunk.chunkId),
  }));
}

/**
 * Hybrid search combining semantic and keyword search with reciprocal rank fusion.
 *
 * Each returned chunk carries `semanticSimilarity` and/or `keywordRank`
 * depending on which methods matched it. Both are set when a chunk is found
 * by both methods — a strong co-occurrence signal. These scores live on
 * different scales and must be compared separately (see callers).
 *
 * `scope` defaults to "member" so every existing call site keeps its current
 * behavior — only the sermon-writer and doctrine-check opt into "full".
 */
export async function hybridSearch(
  churchId: string,
  query: string,
  limit = 8,
  scope: RetrievalScope = "member"
): Promise<RetrievedChunk[]> {
  const embedding = await generateQueryEmbedding(query);
  return hybridSearchWithEmbedding(churchId, embedding, query, limit, scope);
}

function mapRowToChunk(
  row: Record<string, unknown>,
  source: "semantic" | "keyword"
): RetrievedChunk {
  const semanticSimilarity =
    source === "semantic" && row.semantic_similarity != null
      ? Number(row.semantic_similarity)
      : undefined;
  const keywordRank =
    source === "keyword" && row.keyword_rank != null
      ? Number(row.keyword_rank)
      : undefined;

  return {
    chunkId: row.chunk_id as string,
    documentId: row.document_id as string,
    documentTitle: row.document_title as string,
    documentType: row.document_type as RetrievedChunk["documentType"],
    content: row.content as string,
    semanticSimilarity,
    keywordRank,
    sourceUrl: (row.source_url as string) || (row.blob_path as string) || undefined,
    heading: (row.heading as string) || undefined,
    startTime: row.start_time != null ? Number(row.start_time) : undefined,
    endTime: row.end_time != null ? Number(row.end_time) : undefined,
    pageNumber: row.page_number != null ? Number(row.page_number) : undefined,
  };
}
