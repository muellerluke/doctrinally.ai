import { task, tasks } from "@trigger.dev/sdk/v3";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { documents, chunks } from "@/db/schema";
import { chunkByTokens } from "../utils/chunking";
import { generateEmbeddings } from "../utils/embeddings";
import { formatProcessingError, logProcessingError } from "../utils/error-logging";
import { extractText, getDocumentProxy } from "unpdf";

/**
 * Minimum length of usable text we expect from a PDF's text layer. Below
 * this, we assume the PDF is scanned/image-only and hand it off to the OCR
 * pipeline (process-pdf-ocr). A typical cover-page-only text extraction
 * runs 50–150 chars, so 200 is conservative — it errs toward OCR when in
 * doubt, which is the right call since OCR also works fine on text PDFs.
 */
const MIN_TEXT_LAYER_CHARS = 200;

export async function processPdfBody(payload: { documentId: string }) {
  const { documentId } = payload;

  try {
    const [doc] = await db
      .select()
      .from(documents)
      .where(eq(documents.id, documentId))
      .limit(1);

    if (!doc) throw new Error(`Document ${documentId} not found`);
    if (doc.type !== "pdf")
      throw new Error(`Document ${documentId} is not a PDF document`);

    await db
      .update(documents)
      .set({ status: "processing", errorMessage: null, updatedAt: new Date() })
      .where(eq(documents.id, documentId));

    if (!doc.blobPath) throw new Error("Document has no blob path");

    const response = await fetch(doc.blobPath);
    if (!response.ok)
      throw new Error(`Failed to download PDF: ${response.statusText}`);

    const arrayBuffer = await response.arrayBuffer();
    const data = new Uint8Array(arrayBuffer);

    // Extract text from PDF using unpdf (serverless-safe, no DOM deps)
    const pdf = await getDocumentProxy(data);
    const { text: extracted } = await extractText(pdf, { mergePages: true });
    const rawText = Array.isArray(extracted) ? extracted.join("\n") : extracted;

    // Postgres `text` columns reject NUL (U+0000) bytes — some PDFs embed them
    // via encoded fonts or raw binary. Strip before chunking.
    const text = rawText.replace(/\u0000/g, "");

    // If the text layer is empty or suspiciously thin, treat the PDF as
    // image-based and hand off to the OCR pipeline on a larger machine.
    if (!text || text.trim().length < MIN_TEXT_LAYER_CHARS) {
      console.log(
        `[process-pdf] text layer is ${text.trim().length} chars — below ${MIN_TEXT_LAYER_CHARS}, delegating to process-pdf-ocr`,
        { documentId }
      );
      await tasks.trigger("process-pdf-ocr", { documentId });
      // Leave status as 'processing' — process-pdf-ocr will flip it to
      // 'indexed' (or 'failed' with its own error message) when it finishes.
      return { success: true, delegated: "ocr" as const };
    }

    const textChunks = chunkByTokens(text, 300, 30);
    if (textChunks.length === 0) {
      throw new Error("No chunks generated from PDF text");
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
      .set({ status: "indexed", retryCount: 0, updatedAt: new Date() })
      .where(eq(documents.id, documentId));

    return { success: true, chunkCount: textChunks.length };
  } catch (error) {
    logProcessingError("process-pdf", error);
    const message = formatProcessingError(error);

    await db
      .update(documents)
      .set({ status: "failed", errorMessage: message, updatedAt: new Date() })
      .where(eq(documents.id, documentId));

    throw error;
  }
}

export const processPdf = task({
  id: "process-pdf",
  machine: "small-1x", // 1 vCPU / 512 MB — PDF text extraction + embeddings
  retry: { maxAttempts: 2 },
  queue: { concurrencyLimit: 25 },
  run: processPdfBody,
});
