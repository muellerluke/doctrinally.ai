import { task } from "@trigger.dev/sdk/v3";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { documents, chunks } from "@/db/schema";
import { chunkByHeadings, chunkByTokens } from "../utils/chunking";
import { generateEmbeddings } from "../utils/embeddings";
import { lookupPassage } from "@/lib/bible";

/**
 * Extract plain text from Plate editor JSON nodes, preserving headings
 * as markdown-style headings for the chunking pipeline.
 * Fetches actual Bible passage text for bible_passage nodes.
 */
async function plateNodesToText(nodes: any[]): Promise<string> {
  const lines: string[] = [];

  for (const node of nodes) {
    if (!node) continue;

    if (node.type === "h1") {
      lines.push(`# ${extractText(node)}`);
    } else if (node.type === "h2") {
      lines.push(`## ${extractText(node)}`);
    } else if (node.type === "h3") {
      lines.push(`### ${extractText(node)}`);
    } else if (node.type === "blockquote") {
      lines.push(`> ${extractText(node)}`);
    } else if (node.type === "bible_passage") {
      const book = node.book || "";
      const chapter = node.chapter || 0;
      const verse = String(node.verse || "");

      if (book && chapter && verse) {
        const verseParts = verse.split("-");
        const verseStart = parseInt(verseParts[0], 10);
        const verseEnd = verseParts[1] ? parseInt(verseParts[1], 10) : undefined;

        try {
          const result = await lookupPassage(book, chapter, verseStart, verseEnd);
          if (result) {
            lines.push(`${result.reference}: ${result.text}`);
          } else {
            lines.push(`${book} ${chapter}:${verse}`);
          }
        } catch {
          lines.push(`${book} ${chapter}:${verse}`);
        }
      }
    } else {
      const text = extractText(node);
      if (text.trim()) lines.push(text);
    }
  }

  return lines.join("\n\n");
}

function extractText(node: any): string {
  if (typeof node === "string") return node;
  if (node.text !== undefined) return node.text;
  if (Array.isArray(node.children)) {
    return node.children.map(extractText).join("");
  }
  return "";
}

export const processPlatejs = task({
  id: "process-platejs",
  machine: "small-1x",   // 1 vCPU / 512 MB — text parsing + embeddings
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
      if (doc.type !== "platejs")
        throw new Error(`Document ${documentId} is not a Platejs document`);

      // Set processing status
      await db
        .update(documents)
        .set({ status: "processing", errorMessage: null, updatedAt: new Date() })
        .where(eq(documents.id, documentId));

      // Get content — may be JSON (Plate nodes) or markdown (legacy)
      const rawContent = doc.content;
      if (!rawContent || rawContent.trim().length === 0) {
        throw new Error("Document has no content");
      }

      // Convert Plate JSON to markdown-like text for chunking
      let markdown: string;
      try {
        const parsed = JSON.parse(rawContent);
        if (Array.isArray(parsed)) {
          markdown = await plateNodesToText(parsed);
        } else {
          markdown = rawContent;
        }
      } catch {
        // Already markdown
        markdown = rawContent;
      }

      if (!markdown.trim()) {
        throw new Error("Document has no extractable text content");
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
