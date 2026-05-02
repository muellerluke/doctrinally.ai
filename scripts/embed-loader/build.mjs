#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { put } from "@vercel/blob";

const args = process.argv.slice(2);
const isLocal = args.includes("--local");
const appUrlArg = args.find((a) => a.startsWith("--app-url="));
const appUrl = appUrlArg
  ? appUrlArg.slice("--app-url=".length)
  : process.env.NEXT_PUBLIC_APP_URL;

const __dirname = dirname(fileURLToPath(import.meta.url));
const sourcePath = join(__dirname, "embed.js");
const pathname = isLocal ? "embed-dev.js" : "embed.js";

if (!isLocal && process.env.VERCEL_ENV !== "production") {
  console.log(
    `[embed-loader] Skipping upload (VERCEL_ENV=${process.env.VERCEL_ENV ?? "unset"}). ` +
      `Only production builds publish embed.js.`
  );
  process.exit(0);
}

if (!appUrl) {
  console.error(
    "[embed-loader] No app URL set. Pass --app-url=<url> or set NEXT_PUBLIC_APP_URL."
  );
  process.exit(1);
}

if (!process.env.BLOB_READ_WRITE_TOKEN) {
  console.error(
    "[embed-loader] BLOB_READ_WRITE_TOKEN is not set. Cannot upload to Vercel Blob."
  );
  process.exit(1);
}

const source = await readFile(sourcePath, "utf8");
const output = source.replace(/__APP_URL__/g, appUrl);

if (output.includes("__APP_URL__")) {
  console.error("[embed-loader] Substitution failed: __APP_URL__ still present in output.");
  process.exit(1);
}
if (!output.startsWith("(function(){")) {
  console.error("[embed-loader] Output does not start with the expected IIFE.");
  process.exit(1);
}

const blob = await put(pathname, output, {
  access: "public",
  contentType: "application/javascript; charset=utf-8",
  addRandomSuffix: false,
  allowOverwrite: true,
  cacheControlMaxAge: 300,
});

console.log(`[embed-loader] Uploaded ${output.length} bytes to ${blob.url}`);
