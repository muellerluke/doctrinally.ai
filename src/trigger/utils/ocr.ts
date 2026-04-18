/**
 * Local OCR pipeline for PDFs with no usable text layer (scanned/image-only).
 *
 * No external API. Flow:
 *   1. Use `unpdf.renderPageAsImage` (backed by `@napi-rs/canvas`) to
 *      rasterize each PDF page to a PNG buffer.
 *   2. Feed each page's PNG to Tesseract (tesseract.js — pure WASM, no
 *      native tesseract binary required).
 *
 * Default languages cover the content mix this platform sees:
 *   - `eng` — English (vast majority of uploads)
 *   - `heb` — Hebrew (Torah parsha documents)
 *   - `grc` — Ancient/Koine Greek (New Testament exegesis)
 *   - `spa` — Spanish
 * Each traineddata file (~10 MB) is downloaded from the tessdata CDN on
 * worker init and kept in the worker's memory for the rest of the run.
 * Override per-call with `{ langs: [...] }` to trim or add more.
 *
 * Tuned for the large-1x Trigger.dev machine; a 50-page scanned PDF
 * typically OCRs in 2–5 minutes at scale=2.
 */

import { createWorker, type Worker } from "tesseract.js";
import { getDocumentProxy, renderPageAsImage } from "unpdf";

// Dynamic import so the native canvas addon only loads at runtime on the
// OCR worker (and never on the small-1x process-pdf machine, which doesn't
// need it). @napi-rs/canvas ships platform-specific binaries via
// optionalDependencies — npm selects the right one for the Linux runtime
// where Trigger.dev executes tasks.
const canvasImport = () => import("@napi-rs/canvas");

export interface OcrPage {
  /** Zero-based page index from the PDF. */
  index: number;
  /** Extracted plain text from the page. */
  markdown: string;
}

const DEFAULT_LANGS = ["eng", "heb", "grc", "spa"] as const;
/** Render scale for the PDF→PNG step. 2 = 2× device pixel ratio. Higher
 *  values improve OCR accuracy but multiply CPU / memory / time. */
const DEFAULT_RENDER_SCALE = 2;

export interface OcrOptions {
  /** Tesseract language packs to load. Defaults to `["eng"]`. */
  langs?: readonly string[];
  /** Image render scale before OCR. Defaults to 2. */
  renderScale?: number;
  /** Optional progress callback — fires once per page with `{ page, total }`. */
  onPageProgress?: (state: { page: number; total: number }) => void;
}

/**
 * OCR a PDF byte buffer and return one text blob per page. The PDF must
 * be the raw bytes — for blob-storage URLs, fetch them first.
 */
export async function ocrPdfWithTesseract(
  pdfData: Uint8Array,
  options: OcrOptions = {}
): Promise<OcrPage[]> {
  const langs = options.langs ?? DEFAULT_LANGS;
  const scale = options.renderScale ?? DEFAULT_RENDER_SCALE;

  // pdfjs-dist *transfers* (detaches) any ArrayBuffer it receives, and its
  // bundled worker instantiates its OWN NodeCanvasFactory that doesn't
  // share our resolved `@napi-rs/canvas` module. Workaround: keep a master
  // copy of the bytes and hand a FRESH clone to unpdf on every call. That
  // forces unpdf's `renderPageAsImage` through the canvas-aware code path
  // each time (it calls getDocumentProxy internally with the CanvasFactory
  // it constructed from our canvasImport).
  const master = Buffer.from(pdfData);
  const cloneBytes = () => new Uint8Array(master);

  const pdf = await getDocumentProxy(cloneBytes());
  const totalPages = pdf.numPages;
  if (totalPages === 0) return [];

  // tesseract.js expects a single lang string like "eng" or "eng+heb".
  const langsArg = langs.join("+");
  const worker: Worker = await createWorker(langsArg);

  try {
    const pages: OcrPage[] = [];
    for (let i = 1; i <= totalPages; i++) {
      options.onPageProgress?.({ page: i, total: totalPages });

      let imageBuffer: Uint8Array;
      try {
        const ab = await renderPageAsImage(cloneBytes(), i, {
          scale,
          canvasImport,
        });
        imageBuffer = new Uint8Array(ab);
      } catch (err) {
        console.warn(
          `[ocr] failed to render page ${i}/${totalPages} — skipping`,
          err instanceof Error ? err.message : err
        );
        continue;
      }

      const { data } = await worker.recognize(Buffer.from(imageBuffer));
      pages.push({ index: i - 1, markdown: (data.text ?? "").trim() });
    }
    return pages;
  } finally {
    await worker.terminate();
  }
}
