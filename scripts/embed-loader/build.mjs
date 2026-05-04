#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { execSync } from "node:child_process";
import { AwsClient } from "aws4fetch";
import { transform } from "esbuild";

const args = process.argv.slice(2);
const appUrlArg = args.find((a) => a.startsWith("--app-url="));
const appUrl = appUrlArg
  ? appUrlArg.slice("--app-url=".length)
  : process.env.NEXT_PUBLIC_APP_URL;

const __dirname = dirname(fileURLToPath(import.meta.url));
const sourcePath = join(__dirname, "embed.js");

if (process.env.VERCEL_ENV !== "production") {
  console.log(
    `[embed-loader] Skipping upload (VERCEL_ENV=${process.env.VERCEL_ENV ?? "unset"}). ` +
      `Only production builds publish embed.js. Local dev is served from /embed-dev.js.`
  );
  process.exit(0);
}

const required = {
  NEXT_PUBLIC_APP_URL: appUrl,
  R2_ACCOUNT_ID: process.env.R2_ACCOUNT_ID,
  R2_ACCESS_KEY_ID: process.env.R2_ACCESS_KEY_ID,
  R2_SECRET_ACCESS_KEY: process.env.R2_SECRET_ACCESS_KEY,
  R2_BUCKET_NAME: process.env.R2_BUCKET_NAME,
  CLOUDFLARE_API_TOKEN: process.env.CLOUDFLARE_API_TOKEN,
  CLOUDFLARE_ZONE_ID: process.env.CLOUDFLARE_ZONE_ID,
  EMBED_PUBLIC_BASE_URL: process.env.EMBED_PUBLIC_BASE_URL,
};

const missing = Object.entries(required)
  .filter(([, v]) => !v)
  .map(([k]) => k);
if (missing.length) {
  console.error(`[embed-loader] Missing required env vars: ${missing.join(", ")}`);
  process.exit(1);
}

const gitSha = (
  process.env.VERCEL_GIT_COMMIT_SHA ||
  execSync("git rev-parse HEAD", { encoding: "utf8" })
).trim();

const source = await readFile(sourcePath, "utf8");
const substituted = source.replace(/__APP_URL__/g, appUrl);

if (substituted.includes("__APP_URL__")) {
  console.error("[embed-loader] Substitution failed: __APP_URL__ still present in output.");
  process.exit(1);
}
if (!substituted.startsWith("(function(){")) {
  console.error("[embed-loader] Source does not start with the expected IIFE.");
  process.exit(1);
}

const minified = await transform(substituted, {
  minify: true,
  target: "es2017",
  legalComments: "none",
});
const output = minified.code;
const sourceBytes = Buffer.byteLength(substituted, "utf8");
const minifiedBytes = Buffer.byteLength(output, "utf8");

const r2 = new AwsClient({
  accessKeyId: process.env.R2_ACCESS_KEY_ID,
  secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  service: "s3",
  region: "auto",
});

const bucket = process.env.R2_BUCKET_NAME;
const r2Endpoint = `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${bucket}`;
const publicBase = process.env.EMBED_PUBLIC_BASE_URL.replace(/\/$/, "");

const STABLE_CACHE = "public, max-age=600, s-maxage=86400, stale-while-revalidate=604800";
const PINNED_CACHE = "public, max-age=31536000, immutable";
const CONTENT_TYPE = "application/javascript; charset=utf-8";

async function putObject(key, body, cacheControl) {
  const res = await r2.fetch(`${r2Endpoint}/${key}`, {
    method: "PUT",
    body,
    headers: {
      "Content-Type": CONTENT_TYPE,
      "Cache-Control": cacheControl,
    },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`R2 PUT ${key} failed: ${res.status} ${res.statusText} — ${text}`);
  }
  return res.headers.get("etag");
}

async function purgeEdgeCache(url) {
  const endpoint = `https://api.cloudflare.com/client/v4/zones/${process.env.CLOUDFLARE_ZONE_ID}/purge_cache`;
  const delays = [1000, 2000, 4000];
  let lastErr;

  for (let attempt = 0; attempt <= delays.length; attempt++) {
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.CLOUDFLARE_API_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ files: [url] }),
      });
      const json = await res.json();
      if (res.ok && json.success) {
        return json.result?.id ?? "ok";
      }
      lastErr = new Error(`purge failed: ${res.status} ${JSON.stringify(json.errors ?? json)}`);
      if (res.status < 500 && res.status !== 429) throw lastErr;
    } catch (err) {
      lastErr = err;
    }
    if (attempt < delays.length) {
      await new Promise((r) => setTimeout(r, delays[attempt]));
    }
  }
  throw lastErr;
}

const pinnedKey = `embed.${gitSha}.js`;
const stableKey = "embed.js";

const pinnedEtag = await putObject(pinnedKey, output, PINNED_CACHE);
const stableEtag = await putObject(stableKey, output, STABLE_CACHE);

const stableUrl = `${publicBase}/${stableKey}`;
const purgeId = await purgeEdgeCache(stableUrl);

const ratio = ((1 - minifiedBytes / sourceBytes) * 100).toFixed(1);
console.log(
  `[embed-loader] Uploaded ${minifiedBytes} bytes to R2 (sha=${gitSha.slice(0, 8)}, ` +
    `minified from ${sourceBytes} bytes, ${ratio}% smaller)\n` +
    `  ${stableKey} etag=${stableEtag}\n` +
    `  ${pinnedKey} etag=${pinnedEtag}\n` +
    `  purge id=${purgeId} url=${stableUrl}`
);
