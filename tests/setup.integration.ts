import { afterAll, afterEach, beforeAll, vi } from "vitest";
import { config } from "dotenv";
import fs from "node:fs";
import path from "node:path";
import { server } from "./helpers/msw/handlers";

config({ path: path.resolve(__dirname, "../.env.test") });

// Replace the DATABASE_URL from .env.test with the one the Testcontainers
// globalSetup wrote. This MUST happen before any module imports `@/db`.
const URI_FILE = path.resolve(__dirname, "../.testdb/url");
if (!fs.existsSync(URI_FILE)) {
  throw new Error(
    `Test DB URI file not found at ${URI_FILE}. Is globalSetup configured?`
  );
}
process.env.DATABASE_URL = fs.readFileSync(URI_FILE, "utf-8").trim();

// next/cache is a no-op in server actions run outside of a request context.
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
  unstable_noStore: vi.fn(),
}));

// `cookies()` from next/headers requires a request context. Provide a
// minimal in-memory impl so server actions that set cookies don't crash
// when invoked directly from tests.
vi.mock("next/headers", () => {
  const store = new Map<string, string>();
  return {
    cookies: async () => ({
      get: (name: string) =>
        store.has(name) ? { name, value: store.get(name)! } : undefined,
      set: (
        name: string,
        value: string,
        _opts?: Record<string, unknown>
      ) => {
        store.set(name, value);
      },
      delete: (name: string) => store.delete(name),
    }),
    headers: async () =>
      new Map<string, string>() as unknown as Headers,
  };
});

// Default-mock Resend — we assert on call args, don't send real email.
vi.mock("@/lib/email", () => ({
  sendPasswordResetEmail: vi.fn(async () => ({ success: true })),
  sendInvitationEmail: vi.fn(async () => ({ success: true })),
}));

beforeAll(() => {
  server.listen({ onUnhandledRequest: "bypass" });
});

afterEach(async () => {
  server.resetHandlers();
  // Truncate after each test so the next one sees a clean slate.
  const { truncateAllTables } = await import("./helpers/db");
  await truncateAllTables();
});

afterAll(async () => {
  server.close();
  const { closeTestDbClient } = await import("./helpers/db");
  await closeTestDbClient();
});
