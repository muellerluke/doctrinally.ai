import { test, expect } from "@playwright/test";
import postgres from "postgres";
import fs from "node:fs";
import path from "node:path";

const TEST_DB_URL = fs
  .readFileSync(path.resolve(__dirname, "../../.testdb/e2e-url"), "utf-8")
  .trim();

test.describe("Sign-up → onboarding journey", () => {
  test("new user can sign up, lands on onboarding, and a user row exists in the DB", async ({
    page,
  }) => {
    const email = `e2e+${Date.now()}@example.com`;
    const password = "StrongPass1";

    await page.goto("/sign-up");

    await page.locator("#name").fill("E2E Tester");
    await page.locator("#email").fill(email);
    await page.locator("#password").fill(password);

    // Terms checkbox — shadcn Checkbox renders a button[role=checkbox].
    const terms = page.getByRole("checkbox");
    await terms.click();

    await page.getByRole("button", { name: /create account|sign up/i }).click();

    // Sign-up action fires → client signs in → redirects. Land on onboarding.
    await page.waitForURL(/\/(onboarding|dashboard)/, { timeout: 10_000 });

    // Verify the user row exists in the Testcontainers DB the app wrote to.
    const sql = postgres(TEST_DB_URL, { max: 1 });
    const rows = await sql`
      SELECT email, hashed_password IS NOT NULL AS has_hash
      FROM users WHERE email = ${email}
    `;
    await sql.end();

    expect(rows.length).toBe(1);
    expect(rows[0].has_hash).toBe(true);
  });
});
