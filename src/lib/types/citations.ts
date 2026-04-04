export interface Citation {
  index: number;
  documentId: string;
  documentTitle: string;
  documentType: "youtube" | "video" | "pdf" | "word" | "platejs";
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
  documentType: "youtube" | "video" | "pdf" | "word" | "platejs";
  content: string;
  similarity?: number;
  sourceUrl?: string;
  heading?: string;
  startTime?: number;
  endTime?: number;
  pageNumber?: number;
}
