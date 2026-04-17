/**
 * One-off cleanup for orphan documents left behind by the pre-2026-04-17
 * upload flow, which created the `documents` row in Phase 1 (token signing)
 * before the bytes actually uploaded. If the upload never completed, the
 * row stuck around in `status='uploaded'` with `blob_path=NULL` forever.
 *
 * Safe to re-run. Dry-run is the default; pass `--confirm` to delete.
 * `chunks.document_id` has ON DELETE CASCADE, so any stray chunks get
 * cleaned up automatically (shouldn't exist on these rows — they never
 * got processed — but the cascade is there as insurance).
 *
 * Usage:
 *   npx tsx --env-file=.env src/scripts/cleanup-orphan-uploads.ts
 *   npx tsx --env-file=.env src/scripts/cleanup-orphan-uploads.ts --confirm
 */

import postgres from "postgres";

const TARGET_URL = process.env.DATABASE_URL;
if (!TARGET_URL) {
  console.error("DATABASE_URL environment variable is required");
  process.exit(1);
}

const confirm = process.argv.includes("--confirm");
const sql = postgres(TARGET_URL, { idle_timeout: 30, max: 1 });

async function main() {
  const candidates = await sql<
    { id: string; church_id: string; title: string; created_at: Date }[]
  >`
    SELECT id, church_id, title, created_at
    FROM documents
    WHERE status = 'uploaded'
      AND blob_path IS NULL
      AND created_at < NOW() - INTERVAL '1 hour'
    ORDER BY created_at ASC
  `;

  console.log(`Found ${candidates.length} orphan document(s).`);
  if (candidates.length === 0) {
    await sql.end();
    return;
  }

  const preview = candidates.slice(0, 10);
  for (const row of preview) {
    console.log(
      `  - ${row.id}  church=${row.church_id}  "${row.title}"  created=${row.created_at.toISOString()}`
    );
  }
  if (candidates.length > preview.length) {
    console.log(`  … and ${candidates.length - preview.length} more`);
  }

  if (!confirm) {
    console.log("\nDry run. Re-run with --confirm to delete these rows.");
    await sql.end();
    return;
  }

  const ids = candidates.map((c) => c.id);
  const result = await sql`
    DELETE FROM documents
    WHERE id IN ${sql(ids)}
  `;
  console.log(`\nDeleted ${result.count} rows.`);
  await sql.end();
}

main().catch(async (err) => {
  console.error(err);
  await sql.end();
  process.exit(1);
});
