import { task } from "@trigger.dev/sdk/v3";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { documents, chunks } from "@/db/schema";
import { chunkByTokens } from "../utils/chunking";
import { generateEmbeddings } from "../utils/embeddings";
import mammoth from "mammoth";

export const processWord = task({
  id: "process-word",
  machine: "small-1x",   // 1 vCPU / 512 MB — Word text extraction + embeddings
  retry: { maxAttempts: 2 },
  run: async (payload: { documentId: string }) => {
    const { documentId } = payload;

    try {
      // Fetch document
      const [doc] = await db
        .select()
        .from(documents)
        .where(eq(documents.id, documentId))
        .limit(1);

      if (!doc) throw new Error(`Document ${documentId} not found`);
      if (doc.type !== "word")
        throw new Error(`Document ${documentId} is not a Word document`);

      // Set processing status
      await db
        .update(documents)
        .set({ status: "processing", errorMessage: null, updatedAt: new Date() })
        .where(eq(documents.id, documentId));

      // Download Word document from blob storage
      if (!doc.blobPath) throw new Error("Document has no blob path");

      const response = await fetch(doc.blobPath);
      if (!response.ok)
        throw new Error(`Failed to download Word document: ${response.statusText}`);

      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      // Extract text from Word document
      const result = await mammoth.extractRawText({ buffer });
      const text = result.value;

      if (!text || text.trim().length === 0) {
        throw new Error("No text content extracted from Word document");
      }

      // Chunk by tokens (~300 per chunk)
      const textChunks = chunkByTokens(text, 300, 30);

      if (textChunks.length === 0) {
        throw new Error("No chunks generated from Word document text");
      }

      // Generate embeddings
      const embeddings = await generateEmbeddings(textChunks);

      // Delete existing chunks for this document
      await db.delete(chunks).where(eq(chunks.documentId, documentId));

      // Insert new chunks
      await db.insert(chunks).values(
        textChunks.map((content, index) => ({
          documentId,
          churchId: doc.churchId,
          content,
          chunkIndex: index,
          embedding: embeddings[index],
        }))
      );

      // Mark as indexed
      await db
        .update(documents)
        .set({ status: "indexed", updatedAt: new Date() })
        .where(eq(documents.id, documentId));

      return { success: true, chunkCount: textChunks.length };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unknown error occurred";

      await db
        .update(documents)
        .set({
          status: "failed",
          errorMessage: message,
          updatedAt: new Date(),
        })
        .where(eq(documents.id, documentId));

      throw error;
    }
  },
});
