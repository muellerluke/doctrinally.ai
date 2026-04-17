import { PostgreSqlContainer, StartedPostgreSqlContainer } from "@testcontainers/postgresql";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { sql } from "drizzle-orm";
import path from "node:path";

let container: StartedPostgreSqlContainer | null = null;

/**
 * Boots a Postgres container with the `vector` extension preinstalled,
 * runs every Drizzle migration against it the same way `src/db/migrate.ts`
 * does in prod, and returns the connection URI. The URI is returned so
 * Vitest's globalSetup can write it to a file for worker processes to
 * read.
 */
export async function startTestContainer(): Promise<string> {
  if (container) return container.getConnectionUri();

  container = await new PostgreSqlContainer("pgvector/pgvector:pg16")
    .withDatabase("test")
    .withUsername("test")
    .withPassword("test")
    .start();

  const uri = container.getConnectionUri();

  // Run Drizzle migrations against the fresh container. Uses the SAME
  // migrator prod uses — so a broken migration fails here before deploy.
  const client = postgres(uri, { max: 1 });
  const db = drizzle(client);
  await migrate(db, {
    migrationsFolder: path.resolve(__dirname, "../../src/db/migrations"),
  });

  // Regression simulator for plan verification. Setting SIMULATE_PROD_DRIFT=1
  // re-adds the `document_upload_limit NOT NULL` column that caused the
  // production outage, so the full-onboarding-journey test fails with the
  // exact same error — proving the suite catches prod drift before deploy.
  if (process.env.SIMULATE_PROD_DRIFT === "1") {
    await client`
      ALTER TABLE "subscriptions"
      ADD COLUMN "document_upload_limit" integer NOT NULL DEFAULT 25
    `;
    await client`
      ALTER TABLE "subscriptions"
      ALTER COLUMN "document_upload_limit" DROP DEFAULT
    `;
  }

  await client.end();
  return uri;
}

export async function stopTestContainer() {
  if (container) {
    await container.stop();
    container = null;
  }
}

/**
 * Truncate all user-data tables between tests. Preserves the schema.
 * The Bible tables are seeded from static data and don't exist in test —
 * they are also empty after migration, so TRUNCATE on them is harmless.
 */
export async function truncateAll(client: postgres.Sql) {
  await client`
    TRUNCATE
      chunks,
      messages,
      chats,
      documents,
      folders,
      usage_records,
      subscriptions,
      memberships,
      invitations,
      password_reset_tokens,
      topics,
      churches,
      users
    RESTART IDENTITY CASCADE
  `;
}

/** Execute raw SQL with drizzle's sql helper. Handy for fixture seeding. */
export { sql };
