/**
 * One-off cleanup for unrecoverable document rows — documents with no
 * source at all (`blob_path IS NULL AND source_url IS NULL AND content IS
 * NULL/empty`). These can never be processed and exist only because an
 * upload was abandoned mid-flow or a YouTube submission never wrote its
 * source URL.
 *
 * Covers every doc type:
 *   - pdf/word/video  → need `blob_path`
 *   - youtube          → needs `source_url`
 *   - platejs          → needs `content`
 *
 * Matches any status (uploaded, queued, processing, failed, etc.) — the
 * retry scheduler tends to bounce these between `failed` and `queued`
 * indefinitely, so filtering on status alone would miss them.
 *
 * Safe to re-run. Dry-run is the default; pass `--confirm` to delete.
 * `chunks.document_id` has ON DELETE CASCADE, so any stray chunks get
 * cleaned up automatically.
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
    {
      id: string;
      church_id: string;
      type: string;
      status: string;
      title: string;
      created_at: Date;
    }[]
  >`
    SELECT id, church_id, type, status, title, created_at
    FROM documents
    WHERE blob_path IS NULL
      AND source_url IS NULL
      AND (content IS NULL OR content = '')
      AND created_at < NOW() - INTERVAL '1 hour'
    ORDER BY created_at ASC
  `;

  console.log(`Found ${candidates.length} unrecoverable document(s).`);
  if (candidates.length === 0) {
    await sql.end();
    return;
  }

  const preview = candidates.slice(0, 10);
  for (const row of preview) {
    console.log(
      `  - ${row.id}  type=${row.type}  status=${row.status}  church=${row.church_id}  "${row.title}"  created=${row.created_at.toISOString()}`
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
