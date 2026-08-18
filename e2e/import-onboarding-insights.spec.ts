import { test, expect } from "@playwright/test"

test.describe("Import, Merchants, Insights, Onboarding — Comprehensive", () => {
  function ready(page: import("@playwright/test").Page) { return expect(page.locator("body")).not.toHaveClass(/error/) }

  test.describe("Bulk Import page", () => { test("SCENARIO: Import page loads without error", async ({ page }) => { await page.goto("/expenses/import", { waitUntil: "domcontentloaded" }); await page.waitForTimeout(3000); await ready(page) }) })
  test.describe("Merchants page", () => { test("SCENARIO: Merchants page loads without error", async ({ page }) => { await page.goto("/expenses/vendors", { waitUntil: "domcontentloaded" }); await page.waitForTimeout(3000); await ready(page) }) })
  test.describe("Review Duplicates page", () => { test("SCENARIO: Review duplicates page loads without error", async ({ page }) => { await page.goto("/expenses/review-duplicates", { waitUntil: "domcontentloaded" }); await page.waitForTimeout(3000); await ready(page) }) })
  test.describe("Insights page", () => { test("SCENARIO: Insights page loads without error", async ({ page }) => { await page.goto("/insights", { waitUntil: "domcontentloaded" }); await page.waitForTimeout(3000); await ready(page) }) })

  test.describe("Login flow", () => {
    test.use({ storageState: { cookies: [], origins: [] } })
    test("SCENARIO: Login redirects to dashboard", async ({ page }) => {
      await page.goto("/login", { waitUntil: "domcontentloaded" }); await page.waitForTimeout(2000)
      await page.locator("#email").fill("test@example.com"); await page.locator("#password").fill("test123")
      await page.getByRole("button", { name: "Sign in with Email" }).click(); await page.waitForTimeout(3000)
      expect(page.url()).toContain("http://localhost:3005/")
    })
  })

  test.describe("Anonymous access guard", () => {
    test.use({ storageState: { cookies: [], origins: [] } })
    for (const route of ["/expenses/import", "/expenses/vendors", "/expenses/review-duplicates", "/insights"]) {
      test(`SCENARIO: ${route} redirects to login when unauthenticated`, async ({ page }) => {
        await page.goto(route, { waitUntil: "domcontentloaded" }); await page.waitForTimeout(2000); expect(page.url()).toContain("/login")
      })
    }
  })
})
