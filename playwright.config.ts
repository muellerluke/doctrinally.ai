import { defineConfig, devices } from "@playwright/test";
import { PostgreSqlContainer } from "@testcontainers/postgresql";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import fs from "node:fs";
import path from "node:path";

const PORT = 3100;

async function buildConfig() {
  // Belt-and-braces cleanup of files left over from a killed previous run.
  // globalTeardown normally handles this, but it doesn't run if the
  // previous run's webServer setup crashed.
  for (const file of [
    path.resolve(__dirname, ".testdb/e2e-url"),
    path.resolve(__dirname, ".env.development.local"),
  ]) {
    if (fs.existsSync(file)) fs.rmSync(file, { force: true });
  }

  // Boot a one-shot Postgres container for this test run. Playwright will
  // tear it down via globalTeardown.
  const container = await new PostgreSqlContainer("pgvector/pgvector:pg16")
    .withDatabase("e2e")
    .withUsername("e2e")
    .withPassword("e2e")
    .start();
  const uri = container.getConnectionUri();

  // Run Drizzle migrations against the fresh container — same migrator prod
  // uses. A broken migration fails E2E bootstrap, not in prod.
  const client = postgres(uri, { max: 1 });
  const db = drizzle(client);
  await migrate(db, {
    migrationsFolder: path.resolve(__dirname, "src/db/migrations"),
  });
  await client.end();

  // Tests read this file to connect to the same DB the webServer wrote to.
  const uriFile = path.resolve(__dirname, ".testdb/e2e-url");
  fs.mkdirSync(path.dirname(uriFile), { recursive: true });
  fs.writeFileSync(uriFile, uri);

  // Next.js 16 loads .env (with the dev Neon DATABASE_URL) and that wins
  // over webServer.env overrides in some cases. Writing a
  // .env.development.local file — which Next loads with higher precedence
  // than .env — guarantees the dev server connects to the container.
  const envLocal = path.resolve(__dirname, ".env.development.local");
  fs.writeFileSync(
    envLocal,
    `# Written by playwright.config.ts for the E2E run.\n` +
      `# Deleted in globalTeardown.\n` +
      `DATABASE_URL=${uri}\n` +
      `NEXT_PUBLIC_APP_DOMAIN=localhost:${PORT}\n` +
      `NEXT_PUBLIC_APP_URL=http://localhost:${PORT}\n` +
      `NEXTAUTH_URL=http://localhost:${PORT}\n` +
      `NEXTAUTH_SECRET=e2e-nextauth-secret-thirty-two-chars-minimum\n` +
      `STRIPE_SECRET_KEY=sk_test_e2e_placeholder\n` +
      `STRIPE_WEBHOOK_SECRET=whsec_e2e_placeholder\n` +
      `STRIPE_STANDARD_PRICE_ID=price_e2e_standard\n` +
      `STRIPE_ENTERPRISE_PRICE_ID=price_e2e_enterprise\n`
  );

  // Globals so globalTeardown can stop the container.
  (globalThis as unknown as { __PW_PG_CONTAINER__: unknown }).__PW_PG_CONTAINER__ =
    container;

  console.log(
    `[playwright config] Postgres at ${uri.replace(/:[^:@]+@/, ":***@")}`
  );

  return defineConfig({
    testDir: "./tests/e2e",
    timeout: 30_000,
    expect: { timeout: 5_000 },
    fullyParallel: false,
    retries: process.env.CI ? 2 : 0,
    workers: process.env.CI ? 2 : 1,
    reporter: process.env.CI
      ? [["github"], ["html", { open: "never" }]]
      : "list",
    globalTeardown: path.resolve(__dirname, "./tests/e2e/global-teardown.ts"),
    use: {
      baseURL: `http://localhost:${PORT}`,
      trace: "on-first-retry",
      screenshot: "only-on-failure",
    },
    projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
    webServer: {
      // Next reads .env.development.local (written above) with higher
      // precedence than .env, so no env overrides needed here.
      command: `next dev --port ${PORT}`,
      url: `http://localhost:${PORT}`,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      stdout: "pipe",
      stderr: "pipe",
    },
  });
}

export default buildConfig();
