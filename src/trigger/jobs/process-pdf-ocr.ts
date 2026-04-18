import { task } from "@trigger.dev/sdk/v3";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { documents, chunks } from "@/db/schema";
import { chunkByTokens } from "../utils/chunking";
import { generateEmbeddings } from "../utils/embeddings";
import { ocrPdfWithTesseract } from "../utils/ocr";
import { formatProcessingError, logProcessingError } from "../utils/error-logging";

/**
 * OCR-based PDF pipeline — fallback for scanned/image-only PDFs where the
 * fast text-layer extraction (process-pdf on small-1x) returned nothing.
 *
 * Runs on large-1x because local Tesseract OCR is CPU-bound and memory-
 * hungry: rendering each page to a PNG at 2× scale + running the WASM
 * tesseract engine peaks well above small-1x's 512 MB cap on any
 * multi-page document.
 *
 * process-pdf triggers this task by ID — no direct import required.
 */
export async function processPdfOcrBody(payload: { documentId: string }) {
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
    if (!doc.blobPath) throw new Error("Document has no blob path");

    await db
      .update(documents)
      .set({ status: "processing", errorMessage: null, updatedAt: new Date() })
      .where(eq(documents.id, documentId));

    console.log(
      `[process-pdf-ocr] starting OCR for document ${documentId} (${doc.title})`
    );

    // Download the PDF bytes — local Tesseract needs raw bytes for both
    // rasterization (via unpdf + @napi-rs/canvas) and OCR.
    const response = await fetch(doc.blobPath);
    if (!response.ok) {
      throw new Error(`Failed to download PDF: ${response.statusText}`);
    }
    const arrayBuffer = await response.arrayBuffer();
    const pdfData = new Uint8Array(arrayBuffer);

    const pages = await ocrPdfWithTesseract(pdfData, {
      onPageProgress: ({ page, total }) => {
        if (page === 1 || page === total || page % 10 === 0) {
          console.log(`[process-pdf-ocr] page ${page}/${total}`);
        }
      },
    });
    console.log(`[process-pdf-ocr] OCR returned ${pages.length} pages`);

    if (pages.length === 0) {
      throw new Error("OCR returned no pages");
    }

    // Chunk each page's markdown independently so every chunk carries the
    // source page number. Scanned content often lacks clean heading
    // structure, so chunkByTokens (with the hard-split fallback) is the
    // safer pass — chunkByHeadings can leave us with one giant heading-less
    // block per page when OCR misses structure.
    type PendingChunk = { content: string; pageNumber: number };
    const pending: PendingChunk[] = [];
    for (const page of pages) {
      // Strip NUL bytes (OCR can emit them) — Postgres text rejects U+0000.
      const md = (page.markdown ?? "").replace(/\u0000/g, "").trim();
      if (!md) continue;
      const pieces = chunkByTokens(md, 300, 30);
      for (const content of pieces) {
        pending.push({ content, pageNumber: page.index + 1 });
      }
    }

    if (pending.length === 0) {
      throw new Error("OCR pages contained no extractable text");
    }

    const embeddings = await generateEmbeddings(pending.map((p) => p.content));

    await db.delete(chunks).where(eq(chunks.documentId, documentId));
    await db.insert(chunks).values(
      pending.map((p, index) => ({
        documentId,
        churchId: doc.churchId,
        content: p.content,
        chunkIndex: index,
        pageNumber: p.pageNumber,
        embedding: embeddings[index],
      }))
    );

    await db
      .update(documents)
      .set({ status: "indexed", updatedAt: new Date() })
      .where(eq(documents.id, documentId));

    console.log(
      `[process-pdf-ocr] indexed document ${documentId} — ${pending.length} chunks across ${pages.length} pages`
    );

    return {
      success: true,
      chunkCount: pending.length,
      pagesProcessed: pages.length,
    };
  } catch (error) {
    logProcessingError("process-pdf-ocr", error);
    const message = formatProcessingError(error);

    await db
      .update(documents)
      .set({ status: "failed", errorMessage: message, updatedAt: new Date() })
      .where(eq(documents.id, documentId));

    throw error;
  }
}

export const processPdfOcr = task({
  id: "process-pdf-ocr",
  machine: "large-1x", // OCR + embedding many pages — needs more RAM than process-pdf
  retry: { maxAttempts: 2 },
  queue: { concurrencyLimit: 10 },
  maxDuration: 600, // OCR of a long book can take minutes
  run: processPdfOcrBody,
});
