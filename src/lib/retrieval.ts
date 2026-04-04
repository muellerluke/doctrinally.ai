import { db } from "@/db";
import { sql, eq, and } from "drizzle-orm";
import { chunks } from "@/db/schema/chunks";
import { documents } from "@/db/schema/documents";
import type { RetrievedChunk } from "@/lib/types/citations";

const OPENAI_EMBEDDINGS_URL = "https://api.openai.com/v1/embeddings";
const EMBEDDING_MODEL = "text-embedding-3-small";

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
  limit = 10
): Promise<RetrievedChunk[]> {
  const vectorStr = `[${embedding.join(",")}]`;

  const results = await db.execute(sql`
    SELECT
      c.id AS chunk_id,
      c.document_id,
      c.content,
      c.heading,
      c.start_time,
      c.end_time,
      c.page_number,
      1 - (c.embedding <=> ${vectorStr}::vector) AS similarity,
      d.title AS document_title,
      d.type AS document_type,
      d.source_url,
      d.blob_path
    FROM chunks c
    JOIN documents d ON d.id = c.document_id
    WHERE c.church_id = ${churchId}
      AND d.status = 'indexed'
      AND c.embedding IS NOT NULL
    ORDER BY c.embedding <=> ${vectorStr}::vector
    LIMIT ${limit}
  `);

  return (results as unknown as Record<string, unknown>[]).map(mapRowToChunk);
}

/**
 * Keyword search using PostgreSQL full-text search.
 */
export async function keywordSearch(
  churchId: string,
  query: string,
  limit = 10
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

  const results = await db.execute(sql`
    SELECT
      c.id AS chunk_id,
      c.document_id,
      c.content,
      c.heading,
      c.start_time,
      c.end_time,
      c.page_number,
      ts_rank(to_tsvector('english', c.content), to_tsquery('english', ${tsQuery})) AS similarity,
      d.title AS document_title,
      d.type AS document_type,
      d.source_url,
      d.blob_path
    FROM chunks c
    JOIN documents d ON d.id = c.document_id
    WHERE c.church_id = ${churchId}
      AND d.status = 'indexed'
      AND to_tsvector('english', c.content) @@ to_tsquery('english', ${tsQuery})
    ORDER BY ts_rank(to_tsvector('english', c.content), to_tsquery('english', ${tsQuery})) DESC
    LIMIT ${limit}
  `);

  return (results as unknown as Record<string, unknown>[]).map(mapRowToChunk);
}

/**
 * Hybrid search combining semantic and keyword search with reciprocal rank fusion.
 */
export async function hybridSearch(
  churchId: string,
  query: string,
  limit = 8
): Promise<RetrievedChunk[]> {
  const embedding = await generateQueryEmbedding(query);

  const [semanticResults, keywordResults] = await Promise.all([
    semanticSearch(churchId, embedding, limit * 2),
    keywordSearch(churchId, query, limit * 2),
  ]);

  // Reciprocal rank fusion
  const k = 60; // RRF constant
  const scores = new Map<string, { score: number; chunk: RetrievedChunk }>();

  semanticResults.forEach((chunk, rank) => {
    const rrfScore = 1 / (k + rank + 1);
    scores.set(chunk.chunkId, {
      score: rrfScore,
      chunk,
    });
  });

  keywordResults.forEach((chunk, rank) => {
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
    .slice(0, limit)
    .map(({ chunk }) => chunk);
}

function mapRowToChunk(row: Record<string, unknown>): RetrievedChunk {
  return {
    chunkId: row.chunk_id as string,
    documentId: row.document_id as string,
    documentTitle: row.document_title as string,
    documentType: row.document_type as RetrievedChunk["documentType"],
    content: row.content as string,
    similarity: row.similarity as number | undefined,
    sourceUrl: (row.source_url as string) || (row.blob_path as string) || undefined,
    heading: (row.heading as string) || undefined,
    startTime: row.start_time != null ? Number(row.start_time) : undefined,
    endTime: row.end_time != null ? Number(row.end_time) : undefined,
    pageNumber: row.page_number != null ? Number(row.page_number) : undefined,
  };
}
