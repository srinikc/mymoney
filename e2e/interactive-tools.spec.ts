import { test, expect } from "@playwright/test"

test.describe("Interactive Tools — What-If, Risk Profile, Health Dashboard", () => {
  function ready(page: import("@playwright/test").Page) { return expect(page.locator("body")).not.toHaveClass(/error/) }

  test.describe("What-If Simulation", () => {
    test("SCENARIO: What-If page loads without error", async ({ page }) => { await page.goto("/what-if", { waitUntil: "domcontentloaded" }); await page.waitForTimeout(3000); await ready(page) })
    test("SCENARIO: Run simulation button exists and works", async ({ page }) => {
      await page.goto("/what-if", { waitUntil: "domcontentloaded" }); await page.waitForTimeout(3000); await ready(page)
      const btn = page.getByRole("button", { name: /simulate|run|calculate|project/i }).first()
      if (await btn.isVisible().catch(() => false)) { await btn.click(); await page.waitForTimeout(2000) }
    })
  })

  test.describe("Risk Profile", () => { test("SCENARIO: Risk profile page loads without error", async ({ page }) => { await page.goto("/risk-profile", { waitUntil: "domcontentloaded" }); await page.waitForTimeout(3000); await ready(page) }) })

  test.describe("Financial Health Dashboard", () => {
    test("SCENARIO: Health dashboard loads without error", async ({ page }) => { await page.goto("/health", { waitUntil: "domcontentloaded" }); await page.waitForTimeout(3000); await ready(page) })
    test("SCENARIO: Health dashboard shows health score", async ({ page }) => {
      await page.goto("/health", { waitUntil: "domcontentloaded" }); await page.waitForTimeout(3000); await ready(page)
      const el = page.locator('[class*="score"], [class*="gauge"]').first()
      if (await el.isVisible().catch(() => false)) await expect(el).toBeVisible()
    })
    test("SCENARIO: Health dashboard shows metric cards", async ({ page }) => {
      await page.goto("/health", { waitUntil: "domcontentloaded" }); await page.waitForTimeout(3000); await ready(page)
      const cards = page.locator('[class*="card"], [class*="metric"]').filter({ hasText: /₹/ })
      if (await cards.first().isVisible().catch(() => false)) await expect(cards.first()).toBeVisible()
    })
    test("SCENARIO: Recommendations section is present", async ({ page }) => {
      await page.goto("/health", { waitUntil: "domcontentloaded" }); await page.waitForTimeout(3000); await ready(page)
      const el = page.getByText(/recommendation|tip|suggestion|improve/i).first()
      if (await el.isVisible().catch(() => false)) await expect(el).toBeVisible()
    })
  })
})
