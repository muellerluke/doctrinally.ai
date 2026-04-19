export interface Citation {
  index: number;
  documentId: string;
  documentTitle: string;
  documentType: "youtube" | "video" | "pdf" | "word" | "platejs" | "website_page";
  sourceUrl?: string;
  heading?: string;
  startTime?: number;
  endTime?: number;
  pageNumber?: number;
  chunkContent: string;
}

export interface RetrievedChunk {
  chunkId: string;
  documentId: string;
  documentTitle: string;
  documentType: "youtube" | "video" | "pdf" | "word" | "platejs" | "website_page";
  content: string;
  /** Cosine similarity from the embedding vector, in [0, 1]. Set only when
   *  the chunk was found via semantic search. */
  semanticSimilarity?: number;
  /** PostgreSQL `ts_rank` from full-text search (unbounded, typically small).
   *  Set only when the chunk was found via keyword search. A chunk may have
   *  both scores if it appeared in both search methods — these scores are on
   *  different scales and must never be compared to each other. */
  keywordRank?: number;
  sourceUrl?: string;
  heading?: string;
  startTime?: number;
  endTime?: number;
  pageNumber?: number;
}
