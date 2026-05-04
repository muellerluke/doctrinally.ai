#!/usr/bin/env node
import { AwsClient } from "aws4fetch";

const args = process.argv.slice(2);
const shaArg = args.find((a) => a.startsWith("--sha="));
const sha = shaArg?.slice("--sha=".length);

if (!sha) {
  console.error("Usage: npm run embed:rollback -- --sha=<git-sha>");
  process.exit(1);
}

const required = {
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
  console.error(`Missing required env vars: ${missing.join(", ")}`);
  process.exit(1);
}

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
const CONTENT_TYPE = "application/javascript; charset=utf-8";

const pinnedKey = `embed.${sha}.js`;

const getRes = await r2.fetch(`${r2Endpoint}/${pinnedKey}`, { method: "GET" });
if (!getRes.ok) {
  console.error(`Could not fetch ${pinnedKey} from R2: ${getRes.status} ${getRes.statusText}`);
  console.error(`Make sure the SHA is one that has been deployed to production.`);
  process.exit(1);
}
const body = await getRes.text();

const putRes = await r2.fetch(`${r2Endpoint}/embed.js`, {
  method: "PUT",
  body,
  headers: {
    "Content-Type": CONTENT_TYPE,
    "Cache-Control": STABLE_CACHE,
  },
});
if (!putRes.ok) {
  const text = await putRes.text().catch(() => "");
  console.error(`R2 PUT embed.js failed: ${putRes.status} ${putRes.statusText} — ${text}`);
  process.exit(1);
}

const stableUrl = `${publicBase}/embed.js`;
const purgeEndpoint = `https://api.cloudflare.com/client/v4/zones/${process.env.CLOUDFLARE_ZONE_ID}/purge_cache`;

const delays = [1000, 2000, 4000];
let purgeId;
let lastErr;
for (let attempt = 0; attempt <= delays.length; attempt++) {
  try {
    const res = await fetch(purgeEndpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.CLOUDFLARE_API_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ files: [stableUrl] }),
    });
    const json = await res.json();
    if (res.ok && json.success) {
      purgeId = json.result?.id ?? "ok";
      break;
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

if (!purgeId) {
  console.error(`Rollback uploaded but purge failed: ${lastErr}`);
  console.error(`Edge cache will serve stale until ${stableUrl} TTL expires.`);
  process.exit(1);
}

console.log(
  `[embed-rollback] Rolled back to sha=${sha.slice(0, 8)}\n` +
    `  ${pinnedKey} → embed.js (${body.length} bytes)\n` +
    `  purge id=${purgeId} url=${stableUrl}`
);
