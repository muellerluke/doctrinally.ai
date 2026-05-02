/**
 * One-off backfill for the Website Chat rollout. Populates
 * `embed_public_key` and flips `embed_enabled` to true for every
 * church that doesn't have a key yet, so the marketing claim
 * "Website Chat is included on every plan" is true for legacy
 * churches the same moment it ships.
 *
 * Existing `church_feature_flags` rows with `embedded_chat = false`
 * are intentionally left untouched — those are explicit super-admin
 * overrides (abuse / billing escalation / manual disable) and the
 * kill-switch behavior must be preserved across this migration.
 *
 * Safe to re-run. Dry-run is the default; pass `--confirm` to write.
 *
 * Usage:
 *   npx tsx --env-file=.env src/scripts/backfill-embed-keys.ts
 *   npx tsx --env-file=.env src/scripts/backfill-embed-keys.ts --confirm
 */

import { randomBytes } from "crypto";
import postgres from "postgres";

const TARGET_URL = process.env.DATABASE_URL;
if (!TARGET_URL) {
  console.error("DATABASE_URL environment variable is required");
  process.exit(1);
}

const confirm = process.argv.includes("--confirm");
const sql = postgres(TARGET_URL, { idle_timeout: 30, max: 1 });

function generateEmbedKey(): string {
  return `dai_pk_${randomBytes(18).toString("base64url")}`;
}

async function main() {
  const candidates = await sql<{ id: string; name: string }[]>`
    SELECT id, name FROM churches WHERE embed_public_key IS NULL
  `;

  console.log(
    `Found ${candidates.length} church(es) without an embed key.${
      confirm ? "" : " (dry-run — pass --confirm to write)"
    }`
  );

  if (candidates.length === 0) {
    console.log("Nothing to do.");
    await sql.end();
    return;
  }

  for (const church of candidates) {
    const key = generateEmbedKey();
    if (confirm) {
      await sql`
        UPDATE churches
        SET embed_public_key = ${key},
            embed_enabled = true,
            updated_at = NOW()
        WHERE id = ${church.id}
      `;
      console.log(`  ✓ ${church.name} (${church.id}) → ${key}`);
    } else {
      console.log(`  · ${church.name} (${church.id}) → would generate ${key}`);
    }
  }

  console.log(
    `${confirm ? "Updated" : "Would update"} ${candidates.length} church(es).`
  );
  await sql.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
