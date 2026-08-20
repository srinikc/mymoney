import { test, expect } from "@playwright/test"

test.describe("Remaining Pages — All remaining UI pages validated", () => {
  function ready(page: import("@playwright/test").Page) { return expect(page.locator("body")).not.toHaveClass(/error/) }

  test.describe("Static / Documentation pages", () => {
    test("SCENARIO: Setup guide loads without error", async ({ page }) => { await page.goto("/setup-guide", { waitUntil: "domcontentloaded" }); await page.waitForTimeout(3000); await ready(page) })
    test("SCENARIO: User guide loads without error", async ({ page }) => { await page.goto("/guide", { waitUntil: "domcontentloaded" }); await page.waitForTimeout(2000); await ready(page) })
    test("SCENARIO: Privacy policy loads without error", async ({ page }) => { await page.goto("/privacy", { waitUntil: "domcontentloaded" }); await page.waitForTimeout(2000); await ready(page) })
  })

  test.describe("Expenses sub-pages", () => {
    test("SCENARIO: Expenses archive page loads without error", async ({ page }) => { await page.goto("/expenses/archive", { waitUntil: "domcontentloaded" }); await page.waitForTimeout(3000); await ready(page) })
    test("SCENARIO: Import page loads without error", async ({ page }) => { await page.goto("/expenses/import", { waitUntil: "domcontentloaded" }); await page.waitForTimeout(3000); await ready(page) })
    test("SCENARIO: Merchants page loads without error", async ({ page }) => { await page.goto("/expenses/vendors", { waitUntil: "domcontentloaded" }); await page.waitForTimeout(3000); await ready(page) })
  })

  test.describe("Settings sub-pages", () => {
    test("SCENARIO: Settings session-link loads without error", async ({ page }) => { await page.goto("/settings/session-link", { waitUntil: "domcontentloaded" }); await page.waitForTimeout(3000); await ready(page) })
    test("SCENARIO: Settings bank-accounts loads without error", async ({ page }) => { await page.goto("/settings/bank-accounts", { waitUntil: "domcontentloaded" }); await page.waitForTimeout(3000); await ready(page) })
    test("SCENARIO: Settings gmail-parser loads without error", async ({ page }) => { await page.goto("/settings/gmail-parser", { waitUntil: "domcontentloaded" }); await page.waitForTimeout(3000); await ready(page) })
  })

  test.describe("Bank account detail", () => { test("SCENARIO: Bank account list page loads", async ({ page }) => { await page.goto("/bank-accounts", { waitUntil: "domcontentloaded" }); await page.waitForTimeout(3000); await ready(page) }) })
  test.describe("Audit log", () => { test("SCENARIO: Audit log page loads without error", async ({ page }) => { await page.goto("/audit-log", { waitUntil: "domcontentloaded" }); await page.waitForTimeout(3000); await ready(page) }) })
  test.describe("Onboarding", () => {
    test("SCENARIO: Onboarding page loads without error", async ({ page }) => {
      await page.goto("/onboarding", { waitUntil: "domcontentloaded" })
      await page.waitForTimeout(2000)
      if (page.url().includes("/onboarding")) await ready(page)
    })
  })
})
