# Embed loader

The widget loader script churches paste into their site as one `<script>` tag. Production is served from Cloudflare R2 behind `widget.doctrinally.ai`. Local dev is served by a Next.js route handler.

## Files

- `embed.js` — IIFE source. The `__APP_URL__` token is substituted at upload (production) or request (dev) time.
- `build.mjs` — postbuild script. Substitutes `__APP_URL__`, **minifies via esbuild** (~50% size reduction), uploads two objects to R2: a stable mutable `embed.js` and a content-pinned `embed.<git-sha>.js` for rollback. Purges the Cloudflare edge cache on success.
- `rollback.mjs` — re-uploads a previously-deployed pinned copy as the live `embed.js` and purges the edge. ~30s rollback without a Vercel rebuild. Pinned copies are already minified, so rollback re-publishes the same minified bytes that originally shipped.

Local dev (`/embed-dev.js`) serves the **unminified** source for easier debugging — the browser DevTools "Sources" tab shows the original code with comments and full identifier names. Production serves the minified bytes.

## Local dev

The loader is served by `src/app/embed-dev.js/route.ts`. Set in `.env.local`:

```
NEXT_PUBLIC_EMBED_SCRIPT_URL=http://localhost:3000/embed-dev.js
```

`npm run dev`, then the script loads at `http://localhost:3000/embed-dev.js`. No external services, no credentials. The route reads `embed.js` from disk on every request and substitutes `NEXT_PUBLIC_APP_URL` — edits are live without restarting.

The route is hard-disabled in production (`NODE_ENV === "production"` returns 404) so it can never accidentally serve from Vercel.

## Production deploy

`build.mjs` runs as the `postbuild` step in `package.json` and only uploads when `VERCEL_ENV === "production"`. Preview / branch deploys skip it.

### One-time Cloudflare setup

Prereq: `doctrinally.ai` zone is on Cloudflare DNS (R2 custom domains require it).

1. **R2 bucket.** R2 → Create bucket → `doctrinallyai` (or any name; set `R2_BUCKET_NAME` to match), default location.
2. **Custom domain.** Bucket → Settings → Custom Domains → connect `widget.doctrinally.ai`. Cloudflare auto-provisions DNS + TLS.
3. **CORS rule.** Bucket → Settings → CORS Policy:
   ```json
   [{ "AllowedOrigins": ["*"], "AllowedMethods": ["GET", "HEAD"] }]
   ```
   Belt-and-braces: script tags don't enforce CORS, but `fetch()`-based loaders (some Drupal modules) do.
4. **R2 access token.** R2 → Manage R2 API Tokens → Create token, `Object Read & Write` scoped to *this bucket only*. Save the access key ID + secret + account ID.
5. **Cache-purge token.** My Profile → API Tokens → Create token, permission `Zone → Cache Purge` for the `doctrinally.ai` zone. Save the token + zone ID.

### Vercel env vars (Production scope)

```
R2_ACCOUNT_ID=...
R2_ACCESS_KEY_ID=...
R2_SECRET_ACCESS_KEY=...
R2_BUCKET_NAME=doctrinallyai
CLOUDFLARE_API_TOKEN=...
CLOUDFLARE_ZONE_ID=...
EMBED_PUBLIC_BASE_URL=https://widget.doctrinally.ai
NEXT_PUBLIC_EMBED_SCRIPT_URL=https://widget.doctrinally.ai/embed.js
```

Once set, every production deploy:
1. Uploads `embed.<git-sha>.js` (immutable, 1-year cache).
2. Uploads `embed.js` (mutable, 10-min browser / 1-day edge / 7-day SWR).
3. Purges `https://widget.doctrinally.ai/embed.js` from Cloudflare's edge.

If the purge call fails after 3 retries (1s/2s/4s backoff), the build fails so Vercel marks the deploy red. Better failed deploy than silent stale bytes.

## Rollback

```
npm run embed:rollback -- --sha=<git-sha>
```

Where `<git-sha>` is the full commit SHA of a known-good prior production deploy. The script downloads `embed.<sha>.js` from R2, re-uploads it as `embed.js`, and purges the edge. Takes about 30 seconds. Requires the same env vars as `build.mjs`.

If you don't remember the SHA, R2 → bucket → object list shows every `embed.<sha>.js` ever published.

## CSP for churches embedding the widget

Churches with strict Content-Security-Policy on their site need:

```
script-src https://widget.doctrinally.ai
connect-src https://app.doctrinally.ai
font-src https://fonts.gstatic.com
style-src 'unsafe-inline' https://fonts.googleapis.com
```

(Replace `app.doctrinally.ai` with whatever production app URL you actually use.) The widget injects Google Fonts at document level and styles into a Shadow DOM — see `embed.js` line 46.

We deliberately do NOT ship Subresource Integrity (`integrity=...` on the `<script>` tag). SRI hashes invalidate on every deploy and would force every church to re-paste their snippet. Stripe.js, Intercom, and Drift skip SRI for the same reason.
