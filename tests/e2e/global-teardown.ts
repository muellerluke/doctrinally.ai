import fs from "node:fs";
import path from "node:path";

const URI_FILE = path.resolve(__dirname, "../../.testdb/e2e-url");
const ENV_LOCAL_FILE = path.resolve(__dirname, "../../.env.development.local");

export default async function globalTeardown() {
  const container = (globalThis as { __PW_PG_CONTAINER__?: { stop?: () => Promise<void> } })
    .__PW_PG_CONTAINER__;
  if (container?.stop) {
    await container.stop();
  }
  for (const file of [URI_FILE, ENV_LOCAL_FILE]) {
    try {
      fs.rmSync(file, { force: true });
    } catch {
      // ignore
    }
  }
}
