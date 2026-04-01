import { task } from "@trigger.dev/sdk/v3";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { documents, chunks } from "@/db/schema";
import { chunkByHeadings, chunkByTokens } from "../utils/chunking";
import { generateEmbeddings } from "../utils/embeddings";

export const processPlatejs = task({
  id: "process-platejs",
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
      if (doc.type !== "platejs")
        throw new Error(`Document ${documentId} is not a Platejs document`);

      // Set processing status
      await db
        .update(documents)
        .set({ status: "processing", errorMessage: null, updatedAt: new Date() })
        .where(eq(documents.id, documentId));

      // Get markdown content
      const markdown = doc.content;
      if (!markdown || markdown.trim().length === 0) {
        throw new Error("Document has no content");
      }

      // Split by headings first
      const sections = chunkByHeadings(markdown);

      // For each section, further split into ~300 token chunks if needed
      const allChunks: { heading: string | null; content: string }[] = [];

      for (const section of sections) {
        if (!section.content || section.content.trim().length === 0) continue;

        const subChunks = chunkByTokens(section.content, 300, 30);
        for (const subChunk of subChunks) {
          allChunks.push({
            heading: section.heading,
            content: subChunk,
          });
        }
      }

      if (allChunks.length === 0) {
        throw new Error("No chunks generated from document content");
      }

      // Generate embeddings
      const texts = allChunks.map((c) => {
        // Prepend heading to content for better embedding context
        if (c.heading) return `${c.heading}\n\n${c.content}`;
        return c.content;
      });
      const embeddings = await generateEmbeddings(texts);

      // Delete existing chunks for this document
      await db.delete(chunks).where(eq(chunks.documentId, documentId));

      // Insert new chunks
      await db.insert(chunks).values(
        allChunks.map((chunk, index) => ({
          documentId,
          churchId: doc.churchId,
          content: chunk.content,
          chunkIndex: index,
          heading: chunk.heading,
          embedding: embeddings[index],
        }))
      );

      // Mark as indexed
      await db
        .update(documents)
        .set({ status: "indexed", updatedAt: new Date() })
        .where(eq(documents.id, documentId));

      return { success: true, chunkCount: allChunks.length };
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
