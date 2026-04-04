/**
 * One-time script to copy BSB Bible data from the biblify.ai database
 * into the doctrinally.ai database. Resumable — skips already-inserted rows.
 *
 * Usage: npx tsx --env-file=.env src/scripts/copy-bible-data.ts
 */

import postgres from "postgres";

const SOURCE_URL =
  "postgres://doadmin:AVNS_lO-pjlTPmNFijC-IxVR@prod-db-do-user-18011580-0.e.db.ondigitalocean.com:25060/biblify?sslmode=require";
const TARGET_URL = process.env.DATABASE_URL!;

if (!TARGET_URL) {
  console.error("DATABASE_URL environment variable is required");
  process.exit(1);
}

const source = postgres(SOURCE_URL, { idle_timeout: 30, max: 1 });
const target = postgres(TARGET_URL, { idle_timeout: 30, max: 1 });

const BATCH_SIZE = 200;

async function copyBooks() {
  console.log("Copying books...");
  const existing = await target`SELECT count(*) as c FROM bible_books`;
  if (Number(existing[0].c) >= 66) {
    console.log("  Already copied (66 books). Skipping.");
    return;
  }

  const rows = await source`SELECT id, name, sort_order, total_chapters FROM books ORDER BY sort_order`;
  console.log(`  Found ${rows.length} books`);

  for (const row of rows) {
    await target`
      INSERT INTO bible_books (id, name, sort_order, total_chapters)
      VALUES (${row.id}, ${row.name}, ${row.sort_order}, ${row.total_chapters})
      ON CONFLICT (id) DO NOTHING
    `;
  }
  console.log(`  Done: ${rows.length} books`);
}

async function copyChapters() {
  console.log("Copying chapters...");
  const existing = await target`SELECT count(*) as c FROM bible_chapters`;
  if (Number(existing[0].c) >= 1189) {
    console.log("  Already copied (1189 chapters). Skipping.");
    return;
  }

  const rows = await source`SELECT id, number, book_id FROM chapters ORDER BY id`;
  console.log(`  Found ${rows.length} chapters`);

  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    for (const row of batch) {
      await target`
        INSERT INTO bible_chapters (id, number, book_id)
        VALUES (${row.id}, ${row.number}, ${row.book_id})
        ON CONFLICT (id) DO NOTHING
      `;
    }
    console.log(`  ${Math.min(i + BATCH_SIZE, rows.length)}/${rows.length}`);
  }

  const maxId = rows[rows.length - 1].id;
  await target`SELECT setval('bible_chapters_id_seq', ${maxId}, true)`;
  console.log("  Done.");
}

async function copyChapterContents() {
  console.log("Copying chapter contents...");

  // Check how many we already have to resume from
  const existingResult = await target`SELECT max(id) as max_id, count(*) as c FROM bible_chapter_contents`;
  const existingCount = Number(existingResult[0].c);
  const maxExistingId = Number(existingResult[0].max_id) || 0;

  const countResult = await source`SELECT count(*) as total FROM chapter_contents`;
  const total = Number(countResult[0].total);

  if (existingCount >= total) {
    console.log(`  Already copied (${existingCount} rows). Skipping.`);
    return;
  }

  console.log(`  Source: ${total} rows, already copied: ${existingCount}, resuming from id > ${maxExistingId}`);

  let offset = 0;
  let inserted = 0;
  let maxId = maxExistingId;

  while (true) {
    const rows = await source`
      SELECT id, chapter_id, verse_number, type, content
      FROM chapter_contents
      WHERE id > ${maxExistingId}
      ORDER BY id
      LIMIT ${BATCH_SIZE} OFFSET ${offset}
    `;

    if (rows.length === 0) break;

    for (const row of rows) {
      await target`
        INSERT INTO bible_chapter_contents (id, chapter_id, verse_number, type, content)
        VALUES (${row.id}, ${row.chapter_id}, ${row.verse_number}, ${row.type}, ${row.content ? JSON.stringify(row.content) : null}::jsonb)
        ON CONFLICT (id) DO NOTHING
      `;
      if (row.id > maxId) maxId = row.id;
      inserted++;
    }

    offset += BATCH_SIZE;
    const remaining = total - existingCount;
    console.log(`  ${Math.min(inserted, remaining)}/${remaining} new rows`);

    // Small pause to avoid overwhelming the source DB
    await new Promise((r) => setTimeout(r, 100));
  }

  await target`SELECT setval('bible_chapter_contents_id_seq', ${maxId}, true)`;
  console.log(`  Done. Total: ${existingCount + inserted} rows.`);
}

async function copyChapterFootnotes() {
  console.log("Copying chapter footnotes...");

  const existingResult = await target`SELECT count(*) as c FROM bible_chapter_footnotes`;
  const existingCount = Number(existingResult[0].c);

  const countResult = await source`SELECT count(*) as total FROM chapter_footnotes`;
  const totalSource = Number(countResult[0].total);

  if (existingCount >= totalSource) {
    console.log(`  Already copied (${existingCount} rows). Skipping.`);
    return;
  }

  const rows = await source`
    SELECT id, chapter_id, text, reference_verse
    FROM chapter_footnotes
    ORDER BY id
  `;
  console.log(`  Found ${rows.length} footnotes`);

  let maxId = 0;
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    for (const row of batch) {
      await target`
        INSERT INTO bible_chapter_footnotes (id, chapter_id, text, reference_verse)
        VALUES (${row.id}, ${row.chapter_id}, ${row.text}, ${row.reference_verse})
        ON CONFLICT (id) DO NOTHING
      `;
      if (row.id > maxId) maxId = row.id;
    }
    console.log(`  ${Math.min(i + BATCH_SIZE, rows.length)}/${rows.length}`);
    await new Promise((r) => setTimeout(r, 50));
  }

  await target`SELECT setval('bible_chapter_footnotes_id_seq', ${maxId}, true)`;
  console.log("  Done.");
}

async function main() {
  console.log("Starting BSB Bible data copy (resumable)...\n");

  try {
    await copyBooks();
    await copyChapters();
    await copyChapterContents();
    await copyChapterFootnotes();

    console.log("\nDone! Bible data copied successfully.");
  } catch (err) {
    console.error("\nError during copy:", err);
    console.log("\nRe-run the script to resume from where it left off.");
    process.exit(1);
  } finally {
    await source.end();
    await target.end();
  }
}

main();
