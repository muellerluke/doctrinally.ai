/**
 * OpenAI embedding utility for generating vector embeddings.
 * Uses text-embedding-3-small with 1536 dimensions.
 *
 * Retries on 429 (rate limit): honors the `Retry-After` header when present,
 * otherwise exponential backoff with jitter. Up to MAX_RETRIES attempts per
 * batch before giving up.
 */

const OPENAI_EMBEDDINGS_URL = "https://api.openai.com/v1/embeddings";
const MODEL = "text-embedding-3-small";
const BATCH_SIZE = 100;
const MAX_RETRIES = 6;
const BASE_BACKOFF_MS = 1_000;
const MAX_BACKOFF_MS = 30_000;

interface EmbeddingResponse {
  data: { embedding: number[]; index: number }[];
  usage: { prompt_tokens: number; total_tokens: number };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function backoffDelayMs(attempt: number): number {
  const exp = Math.min(MAX_BACKOFF_MS, BASE_BACKOFF_MS * 2 ** attempt);
  const jitter = Math.random() * BASE_BACKOFF_MS;
  return exp + jitter;
}

function parseRetryAfterMs(header: string | null): number | null {
  if (!header) return null;
  const seconds = Number(header);
  if (Number.isFinite(seconds) && seconds >= 0) return seconds * 1000;
  const date = Date.parse(header);
  if (Number.isFinite(date)) return Math.max(0, date - Date.now());
  return null;
}

async function embedBatch(
  batch: string[],
  apiKey: string
): Promise<number[][]> {
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const response = await fetch(OPENAI_EMBEDDINGS_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ model: MODEL, input: batch, dimensions: 1536 }),
    });

    if (response.ok) {
      const data: EmbeddingResponse = await response.json();
      const out = new Array<number[]>(batch.length);
      for (const item of data.data) out[item.index] = item.embedding;
      return out;
    }

    if (response.status === 429 && attempt < MAX_RETRIES) {
      const retryAfter = parseRetryAfterMs(response.headers.get("retry-after"));
      const delay = retryAfter ?? backoffDelayMs(attempt);
      // Drain body so the connection can be reused.
      await response.text().catch(() => "");
      console.warn(
        `[embeddings] 429 rate-limited on attempt ${attempt + 1}/${MAX_RETRIES + 1}; retrying in ${Math.round(delay)}ms`
      );
      await sleep(delay);
      continue;
    }

    const errorText = await response.text().catch(() => "");
    throw new Error(
      `OpenAI embeddings API error (${response.status}): ${errorText}`
    );
  }
  throw new Error(
    `OpenAI embeddings rate-limited after ${MAX_RETRIES + 1} attempts`
  );
}

/**
 * Generate embeddings for an array of text strings using OpenAI's API.
 * Batches requests in groups of 100; each batch retries on 429.
 */
export async function generateEmbeddings(
  texts: string[]
): Promise<number[][]> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY environment variable is not set");
  }

  const allEmbeddings: number[][] = new Array(texts.length);

  for (let i = 0; i < texts.length; i += BATCH_SIZE) {
    const batch = texts.slice(i, i + BATCH_SIZE);
    const batchEmbeddings = await embedBatch(batch, apiKey);
    for (let j = 0; j < batchEmbeddings.length; j++) {
      allEmbeddings[i + j] = batchEmbeddings[j];
    }
  }

  return allEmbeddings;
}
