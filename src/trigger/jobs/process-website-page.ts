import { task } from "@trigger.dev/sdk/v3";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { documents, chunks } from "@/db/schema";
import { chunkByHeadings, chunkByTokens } from "../utils/chunking";
import { generateEmbeddings } from "../utils/embeddings";
import { formatProcessingError, logProcessingError } from "../utils/error-logging";

export async function processWebsitePageBody(payload: { documentId: string }) {
  const { documentId } = payload;

  try {
    const [doc] = await db
      .select()
      .from(documents)
      .where(eq(documents.id, documentId))
      .limit(1);

    if (!doc) throw new Error(`Document ${documentId} not found`);
    if (doc.type !== "website_page")
      throw new Error(`Document ${documentId} is not a website_page`);

    await db
      .update(documents)
      .set({ status: "processing", errorMessage: null, updatedAt: new Date() })
      .where(eq(documents.id, documentId));

    const markdown = doc.content?.trim();
    if (!markdown) throw new Error("Crawled page has no content");

    // Firecrawl returns clean markdown with heading hierarchy intact.
    // Mirror the Platejs pipeline: split by headings, then break long
    // sections into ~300-token sub-chunks with overlap so the embeddings
    // stay within model limits and retrieval has fine-grained matches.
    const sections = chunkByHeadings(markdown);
    const allChunks: { heading: string | null; content: string }[] = [];

    for (const section of sections) {
      if (!section.content || section.content.trim().length === 0) continue;
      const subChunks = chunkByTokens(section.content, 300, 30);
      for (const subChunk of subChunks) {
        allChunks.push({ heading: section.heading, content: subChunk });
      }
    }

    if (allChunks.length === 0) {
      throw new Error("No chunks generated from crawled page");
    }

    const texts = allChunks.map((c) =>
      c.heading ? `${c.heading}\n\n${c.content}` : c.content
    );
    const embeddings = await generateEmbeddings(texts);

    await db.delete(chunks).where(eq(chunks.documentId, documentId));
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

    await db
      .update(documents)
      .set({ status: "indexed", retryCount: 0, updatedAt: new Date() })
      .where(eq(documents.id, documentId));

    return { success: true, chunkCount: allChunks.length };
  } catch (error) {
    logProcessingError("process-website-page", error);
    const message = formatProcessingError(error);

    await db
      .update(documents)
      .set({ status: "failed", errorMessage: message, updatedAt: new Date() })
      .where(eq(documents.id, documentId));

    throw error;
  }
}

export const processWebsitePage = task({
  id: "process-website-page",
  machine: "small-1x",
  retry: { maxAttempts: 2 },
  run: processWebsitePageBody,
});
