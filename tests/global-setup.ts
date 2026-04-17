import fs from "node:fs";
import path from "node:path";
import { startTestContainer, stopTestContainer } from "./helpers/container";

const URI_FILE = path.resolve(__dirname, "../.testdb/url");

/**
 * Vitest globalSetup runs once per test run in its own process. Workers
 * don't inherit its env, so we persist the DB URI to a file that each
 * worker's setup.integration.ts reads on startup.
 */
export async function setup() {
  const uri = await startTestContainer();
  fs.mkdirSync(path.dirname(URI_FILE), { recursive: true });
  fs.writeFileSync(URI_FILE, uri);
  console.log(`[globalSetup] Postgres ready at ${uri.replace(/:[^:@]+@/, ":***@")}`);
}

export async function teardown() {
  try {
    fs.rmSync(URI_FILE, { force: true });
  } catch {
    // ignore
  }
  await stopTestContainer();
}
