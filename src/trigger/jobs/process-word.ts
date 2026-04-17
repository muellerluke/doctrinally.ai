import { task } from "@trigger.dev/sdk/v3";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { documents, chunks } from "@/db/schema";
import { chunkByTokens } from "../utils/chunking";
import { generateEmbeddings } from "../utils/embeddings";
import { formatProcessingError, logProcessingError } from "../utils/error-logging";
import mammoth from "mammoth";

export async function processWordBody(payload: { documentId: string }) {
  const { documentId } = payload;

  try {
    const [doc] = await db
      .select()
      .from(documents)
      .where(eq(documents.id, documentId))
      .limit(1);

    if (!doc) throw new Error(`Document ${documentId} not found`);
    if (doc.type !== "word")
      throw new Error(`Document ${documentId} is not a Word document`);

    await db
      .update(documents)
      .set({ status: "processing", errorMessage: null, updatedAt: new Date() })
      .where(eq(documents.id, documentId));

    if (!doc.blobPath) throw new Error("Document has no blob path");

    const response = await fetch(doc.blobPath);
    if (!response.ok)
      throw new Error(
        `Failed to download Word document: ${response.statusText}`
      );

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const result = await mammoth.extractRawText({ buffer });
    const text = result.value;

    if (!text || text.trim().length === 0) {
      throw new Error("No text content extracted from Word document");
    }

    const textChunks = chunkByTokens(text, 300, 30);
    if (textChunks.length === 0) {
      throw new Error("No chunks generated from Word document text");
    }

    const embeddings = await generateEmbeddings(textChunks);

    await db.delete(chunks).where(eq(chunks.documentId, documentId));
    await db.insert(chunks).values(
      textChunks.map((content, index) => ({
        documentId,
        churchId: doc.churchId,
        content,
        chunkIndex: index,
        embedding: embeddings[index],
      }))
    );

    await db
      .update(documents)
      .set({ status: "indexed", updatedAt: new Date() })
      .where(eq(documents.id, documentId));

    return { success: true, chunkCount: textChunks.length };
  } catch (error) {
    logProcessingError("process-word", error);
    const message = formatProcessingError(error);

    await db
      .update(documents)
      .set({ status: "failed", errorMessage: message, updatedAt: new Date() })
      .where(eq(documents.id, documentId));

    throw error;
  }
}

export const processWord = task({
  id: "process-word",
  machine: "small-1x", // 1 vCPU / 512 MB — Word text extraction + embeddings
  retry: { maxAttempts: 2 },
  run: processWordBody,
});
