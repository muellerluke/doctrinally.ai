import { task } from "@trigger.dev/sdk/v3";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { documents, chunks } from "@/db/schema";
import { chunkByHeadings, chunkByTokens } from "../utils/chunking";
import { generateEmbeddings } from "../utils/embeddings";
import { formatProcessingError, logProcessingError } from "../utils/error-logging";
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

export async function processPlatejsBody(payload: { documentId: string }) {
  const { documentId } = payload;

  try {
    const [doc] = await db
      .select()
      .from(documents)
      .where(eq(documents.id, documentId))
      .limit(1);

    if (!doc) throw new Error(`Document ${documentId} not found`);
    if (doc.type !== "platejs")
      throw new Error(`Document ${documentId} is not a Platejs document`);

    await db
      .update(documents)
      .set({ status: "processing", errorMessage: null, updatedAt: new Date() })
      .where(eq(documents.id, documentId));

    const rawContent = doc.content;
    if (!rawContent || rawContent.trim().length === 0) {
      throw new Error("Document has no content");
    }

    // Content may be JSON (Plate nodes) or markdown (legacy).
    let markdown: string;
    try {
      const parsed = JSON.parse(rawContent);
      if (Array.isArray(parsed)) {
        markdown = await plateNodesToText(parsed);
      } else {
        markdown = rawContent;
      }
    } catch {
      markdown = rawContent;
    }

    if (!markdown.trim()) {
      throw new Error("Document has no extractable text content");
    }

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
      throw new Error("No chunks generated from document content");
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
      .set({ status: "indexed", updatedAt: new Date() })
      .where(eq(documents.id, documentId));

    return { success: true, chunkCount: allChunks.length };
  } catch (error) {
    logProcessingError("process-platejs", error);
    const message = formatProcessingError(error);

    await db
      .update(documents)
      .set({ status: "failed", errorMessage: message, updatedAt: new Date() })
      .where(eq(documents.id, documentId));

    throw error;
  }
}

export const processPlatejs = task({
  id: "process-platejs",
  machine: "small-1x", // 1 vCPU / 512 MB — text parsing + embeddings
  retry: { maxAttempts: 2 },
  run: processPlatejsBody,
});
