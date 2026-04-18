/**
 * Local OCR pipeline for PDFs with no usable text layer (scanned/image-only).
 *
 * Uses two system binaries that live in the Trigger.dev container via the
 * aptGet() build extension in trigger.config.ts:
 *   - `pdftoppm` (poppler-utils) rasterizes each PDF page to a PNG
 *   - `tesseract` runs OCR over each PNG
 *
 * No Node-native addons — we previously tried `@napi-rs/canvas` + tesseract.js
 * but @napi-rs/canvas's optionalDependencies include a musl Linux binary,
 * and npm 10+ refuses to install our (glibc) platform when it can't find a
 * matching musl prebuild. CLI tools sidestep that entire packaging problem.
 *
 * Default languages cover the content mix this platform sees:
 *   - `eng` — English (vast majority of uploads)
 *   - `heb` — Hebrew (Torah parsha documents)
 *   - `grc` — Ancient/Koine Greek (New Testament exegesis)
 *   - `spa` — Spanish
 *
 * Tuned for the large-1x Trigger.dev machine. Native tesseract is ~5-10×
 * faster than the WASM port; a 50-page scanned PDF typically OCRs in
 * 30-90 seconds at 200 DPI.
 */

import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { mkdtemp, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

const execFileP = promisify(execFile);

// Resolve binary paths. The Trigger.dev aptGet() extension places both on
// PATH, so default names work; env overrides help with local testing.
const PDFTOPPM_BIN = process.env.PDFTOPPM_PATH || "pdftoppm";
const TESSERACT_BIN = process.env.TESSERACT_PATH || "tesseract";

export interface OcrPage {
  /** Zero-based page index from the PDF. */
  index: number;
  /** Extracted plain text from the page. */
  markdown: string;
}

const DEFAULT_LANGS = ["eng", "heb", "grc", "spa"] as const;
/** Resolution used for the PDF→PNG rasterization step. 200 DPI is the
 *  widely-cited sweet spot for OCR accuracy vs. speed. */
const DEFAULT_DPI = 200;

export interface OcrOptions {
  /** Tesseract language packs to use. Defaults to `["eng", "heb", "grc", "spa"]`. */
  langs?: readonly string[];
  /** Rasterization DPI. Defaults to 200. */
  dpi?: number;
  /** Optional progress callback — fires once per page with `{ page, total }`. */
  onPageProgress?: (state: { page: number; total: number }) => void;
}

/**
 * OCR a PDF byte buffer and return one text blob per page. For blob-storage
 * URLs, fetch them first and pass the bytes in.
 */
export async function ocrPdfWithTesseract(
  pdfData: Uint8Array,
  options: OcrOptions = {}
): Promise<OcrPage[]> {
  const langs = options.langs ?? DEFAULT_LANGS;
  const dpi = options.dpi ?? DEFAULT_DPI;
  const langArg = langs.join("+");

  const workDir = await mkdtemp(join(tmpdir(), "doctrinally-ocr-"));
  try {
    const pdfPath = join(workDir, "input.pdf");
    await writeFile(pdfPath, pdfData);

    // Step 1: rasterize every page. Writes page-1.png, page-2.png, ...
    // (Default numbering scheme; width of the counter varies by page count.)
    const pageStem = join(workDir, "page");
    await execFileP(PDFTOPPM_BIN, [
      "-png",
      "-r",
      String(dpi),
      pdfPath,
      pageStem,
    ]);

    // Collect and sort the generated images in natural page order.
    const entries = (await readdir(workDir))
      .filter((f) => f.startsWith("page") && f.endsWith(".png"))
      .map((f) => ({
        name: f,
        page: parsePageNumber(f),
      }))
      .filter((e) => e.page !== null)
      .sort((a, b) => (a.page as number) - (b.page as number));

    if (entries.length === 0) return [];

    // Step 2: OCR each page. Run sequentially to keep memory predictable
    // on large-1x (4 vCPU / 8 GB). Native tesseract is single-threaded per
    // invocation but quick — ~1-2 s per page at 200 DPI.
    const pages: OcrPage[] = [];
    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i];
      options.onPageProgress?.({ page: i + 1, total: entries.length });

      const imagePath = join(workDir, entry.name);
      try {
        // `tesseract <image> - -l <langs>` writes to stdout.
        const { stdout } = await execFileP(
          TESSERACT_BIN,
          [imagePath, "-", "-l", langArg],
          { maxBuffer: 64 * 1024 * 1024 } // plenty for a single page
        );
        pages.push({
          index: (entry.page as number) - 1,
          markdown: stdout.replace(/\u0000/g, "").trim(),
        });
      } catch (err) {
        console.warn(
          `[ocr] tesseract failed on page ${entry.page} — skipping`,
          err instanceof Error ? err.message : err
        );
      }
    }

    return pages;
  } finally {
    await rm(workDir, { recursive: true, force: true }).catch(() => {});
  }
}

/**
 * Parse the page number out of pdftoppm's output filenames.
 * pdftoppm uses a zero-padded counter whose width depends on the page
 * count: "page-01.png", "page-001.png", etc. We accept any suffix after
 * a dash or directly after the stem.
 */
function parsePageNumber(filename: string): number | null {
  // Strip the .png extension and match any trailing digits.
  const stem = filename.replace(/\.png$/i, "");
  const m = stem.match(/(\d+)$/);
  if (!m) return null;
  return parseInt(m[1], 10);
}

