import { defineConfig } from "@trigger.dev/sdk/v3";
import { ffmpeg, aptGet } from "@trigger.dev/build/extensions/core";

export default defineConfig({
  project: process.env.TRIGGER_PROJECT_REF!,
  runtime: "node",
  dirs: ["src/trigger"],
  maxDuration: 300,
  build: {
    extensions: [
      // Audio extraction for video uploads (process-video).
      ffmpeg(),
      // OCR pipeline for scanned PDFs (process-pdf-ocr):
      //   - poppler-utils    → `pdftoppm` rasterizes PDF pages to PNG
      //   - tesseract-ocr    → OCR engine
      //   - tesseract-ocr-*  → language traineddata, bundled at build time
      //                        so workers don't need network access on cold
      //                        start to download lang packs.
      aptGet({
        packages: [
          "poppler-utils",
          "tesseract-ocr",
          "tesseract-ocr-eng",
          "tesseract-ocr-heb",
          "tesseract-ocr-grc",
          "tesseract-ocr-spa",
        ],
      }),
    ],
  },
});
