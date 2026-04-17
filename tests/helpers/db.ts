import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import * as schema from "@/db/schema";

type Sql = ReturnType<typeof postgres>;
type Drizzle = ReturnType<typeof drizzle<typeof schema>>;

let rawClient: Sql | null = null;
let drizzleClient: Drizzle | null = null;

function getClients() {
  if (rawClient && drizzleClient) return { rawClient, drizzleClient };
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL not set — is setup.integration.ts loaded?");
  rawClient = postgres(url, { max: 4 });
  drizzleClient = drizzle(rawClient, { schema });
  return { rawClient, drizzleClient };
}

/** Drizzle client bound to the Testcontainers Postgres. Same API as `@/db`. */
export function getTestDb(): Drizzle {
  return getClients().drizzleClient;
}

/** Raw postgres-js client for TRUNCATE + raw SQL in tests. */
export function getTestSql(): Sql {
  return getClients().rawClient;
}

/**
 * Wipe user-data rows between tests. Preserves schema, so the container
 * stays hot across the whole run.
 */
export async function truncateAllTables() {
  const client = getTestSql();
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

export async function closeTestDbClient() {
  if (rawClient) {
    await rawClient.end();
    rawClient = null;
    drizzleClient = null;
  }
}

/** Alias preserved for older test files. */
export const resetTestDbData = truncateAllTables;
