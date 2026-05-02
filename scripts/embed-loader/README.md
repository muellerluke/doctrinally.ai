# Embed loader

The widget loader script churches paste into their site as one `<script>` tag. Lives in Vercel Blob, not in the Next.js app.

## Files

- `embed.js` — IIFE source. The `__APP_URL__` token is substituted at upload time.
- `build.mjs` — reads `embed.js`, substitutes `__APP_URL__`, uploads to Vercel Blob with a stable pathname.

## Production deploy

`build.mjs` runs as the `postbuild` step in `package.json` and only uploads when `VERCEL_ENV === "production"`. Preview / branch deploys skip it.

After the first successful production build, copy the printed Blob URL into Vercel project settings as `NEXT_PUBLIC_EMBED_SCRIPT_URL` (Production scope), then redeploy so the admin form picks it up.

## Local dev upload

Run it manually after editing `embed.js`:

```
NEXT_PUBLIC_APP_URL=http://localhost:3000 \
BLOB_READ_WRITE_TOKEN=<your-token> \
node scripts/embed-loader/build.mjs --local --app-url=http://localhost:3000
```

This uploads to `embed-dev.js` on Blob (separate path so dev uploads never overwrite prod). Paste the printed URL into your `.env.local` as `NEXT_PUBLIC_EMBED_SCRIPT_URL` and restart the dev server.

## Rollback

There is no Blob versioning. To revert:

1. `git checkout <good-sha> -- scripts/embed-loader/embed.js`
2. Re-run the build (locally with `--local` for staging, or trigger a Vercel redeploy from the good commit).
3. Wait up to 5 minutes (`Cache-Control: max-age=300`) for caches to drop the bad bytes.
