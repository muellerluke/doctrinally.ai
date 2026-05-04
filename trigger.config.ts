import { defineConfig } from "@trigger.dev/sdk/v3";
import { ffmpeg, aptGet } from "@trigger.dev/build/extensions/core";
import type { BuildExtension } from "@trigger.dev/core/v3/build";

/**
 * Headless-Chromium install for the website crawler. Used by
 * `fetch-and-convert-page` when the cheap native-fetch path can't
 * render an SPA or trips a JS-challenge bot wall.
 *
 * Inlined here instead of using `@trigger.dev/build/extensions/playwright`
 * because that extension's Dockerfile parses
 * `npx playwright install --dry-run` output by grep'ing for
 * `"browser: <slug>"`, a format Playwright emitted in older versions.
 * Playwright 1.59.x emits `(playwright <slug> vNNNN)` instead, so the
 * grep returns no match and the build fails at the Docker layer.
 *
 * This extension sidesteps the parsing entirely: it installs system
 * deps with apt, then `npx playwright install chromium-headless-shell`
 * downloads the binary the canonical way. Stable across Playwright
 * version bumps.
 */
function playwrightChromium(): BuildExtension {
  return {
    name: "PlaywrightChromium",
    externalsForTarget: (target) => (target === "dev" ? [] : ["playwright"]),
    onBuildComplete(context, manifest) {
      if (context.target === "dev") return;

      const playwrightExternal = manifest.externals?.find(
        (e) => e.name === "playwright" || e.name === "@playwright/test"
      );
      const version = playwrightExternal?.version;
      if (!version) {
        throw new Error(
          "PlaywrightChromium: could not detect Playwright version from manifest externals."
        );
      }

      // Debian 12 deps for Chromium. Pulled from Playwright's
      // `nativeDeps.ts` so the list stays in sync with what Playwright
      // expects on this OS.
      const chromiumDeps = [
        "libasound2",
        "libatk-bridge2.0-0",
        "libatk1.0-0",
        "libatspi2.0-0",
        "libcairo2",
        "libcups2",
        "libdbus-1-3",
        "libdrm2",
        "libgbm1",
        "libglib2.0-0",
        "libnspr4",
        "libnss3",
        "libpango-1.0-0",
        "libx11-6",
        "libxcb1",
        "libxcomposite1",
        "libxdamage1",
        "libxext6",
        "libxfixes3",
        "libxkbcommon0",
        "libxrandr2",
        "fonts-liberation",
        "fonts-unifont",
        "xfonts-scalable",
      ];

      context.addLayer({
        id: "playwright-chromium",
        image: {
          instructions: [
            // Pull in curl/unzip first — `npx playwright install`
            // uses them under the hood.
            `RUN apt-get update && apt-get install -y --no-install-recommends \
              curl unzip ca-certificates \
              && apt-get clean && rm -rf /var/lib/apt/lists/*`,
            // Chromium system deps.
            `RUN apt-get update && apt-get install -y --no-install-recommends ${chromiumDeps.join(" ")} \
              && apt-get clean && rm -rf /var/lib/apt/lists/*`,
            // Pin the global playwright CLI to the same version we
            // bundle so dry-run / install behavior stays consistent.
            `RUN npm install -g playwright@${version}`,
            // Download the headless-shell variant only — smaller than
            // full chromium and what `chromium.launch({ headless: true })`
            // actually uses in Playwright 1.49+.
            `RUN PLAYWRIGHT_BROWSERS_PATH=/ms-playwright npx playwright install chromium-headless-shell`,
          ],
        },
        deploy: {
          env: {
            PLAYWRIGHT_BROWSERS_PATH: "/ms-playwright",
            PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD: "1",
            PLAYWRIGHT_SKIP_BROWSER_VALIDATION: "1",
          },
          override: true,
        },
        dependencies: { playwright: version },
      });
    },
  };
}

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
      // Headless Chromium for the website crawler. See above for why
      // this is inlined instead of using the official extension.
      playwrightChromium(),
    ],
  },
});
