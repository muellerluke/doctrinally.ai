import { test, expect } from "@playwright/test";

test.describe("Public marketing + auth pages", () => {
  test("landing page loads with a headline and a CTA", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/Doctrinally\.AI/i);
    // Any h1 on the page.
    await expect(page.locator("h1").first()).toBeVisible();
    // Links out to the sign-up flow.
    const signupLinks = page.locator('a[href*="sign-up"], a[href*="pricing"]');
    await expect(signupLinks.first()).toBeVisible();
  });

  test("pricing page shows the current plan limits (1,500 and 3,000)", async ({
    page,
  }) => {
    await page.goto("/pricing");
    await expect(page.getByText(/1,500 member questions/i)).toBeVisible();
    await expect(page.getByText(/3,000 member questions/i)).toBeVisible();
  });

  test("sign-in page renders the form", async ({ page }) => {
    await page.goto("/sign-in");
    await expect(page.locator("#email")).toBeVisible();
    await expect(page.locator("#password")).toBeVisible();
    await expect(page.getByRole("button", { name: /^sign in$/i })).toBeVisible();
  });

  test("sign-up page renders the form", async ({ page }) => {
    await page.goto("/sign-up");
    await expect(page.locator("#name")).toBeVisible();
    await expect(page.locator("#email")).toBeVisible();
    await expect(page.locator("#password")).toBeVisible();
  });
});
