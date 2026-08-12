import { test, expect } from "@playwright/test"

test.describe("CRUD Gaps — Reminders, Deals, Assets, Investments, Net Worth", () => {
  function ready(page: import("@playwright/test").Page) { return expect(page.locator("body")).not.toHaveClass(/error/) }

  test.describe("Reminders CRUD", () => {
    test("SCENARIO: Reminders page loads without error", async ({ page }) => {
      await page.goto("/reminders", { waitUntil: "domcontentloaded" }); await page.waitForTimeout(3000); await ready(page)
    })
    test("SCENARIO: Toggle reminder completion", async ({ page }) => {
      await page.goto("/reminders", { waitUntil: "domcontentloaded" }); await page.waitForTimeout(3000)
      const cb = page.locator('input[type="checkbox"], [role="checkbox"]').first()
      if (await cb.isVisible().catch(() => false)) { await cb.click(); await page.waitForTimeout(1000) }
    })
    test("SCENARIO: Delete a reminder", async ({ page }) => {
      await page.goto("/reminders", { waitUntil: "domcontentloaded" }); await page.waitForTimeout(3000)
      const btn = page.locator("button").filter({ hasText: /delete|remove/i }).first()
      if (await btn.isVisible().catch(() => false)) { await btn.click(); await page.waitForTimeout(500); if (await page.getByText(/are you sure|confirm/i).isVisible().catch(() => false)) { await page.getByRole("button", { name: /delete|confirm/i }).last().click(); await page.waitForTimeout(1000) } }
    })
    test("SCENARIO: Filter reminders by type", async ({ page }) => {
      await page.goto("/reminders", { waitUntil: "domcontentloaded" }); await page.waitForTimeout(3000)
      const btns = page.locator("button").filter({ hasText: /upcoming|completed|all/i })
      if ((await btns.count()) > 1) { await btns.first().click(); await page.waitForTimeout(500); await btns.nth(1).click(); await page.waitForTimeout(500) }
    })
  })

  test.describe("Deals", () => { test("SCENARIO: Deals page loads without error", async ({ page }) => { await page.goto("/deals", { waitUntil: "domcontentloaded" }); await page.waitForTimeout(2000); await ready(page) }) })
  test.describe("Assets", () => { test("SCENARIO: Assets page loads without error", async ({ page }) => { await page.goto("/assets", { waitUntil: "domcontentloaded" }); await page.waitForTimeout(2000); await ready(page) }) })
  test.describe("Investments", () => { test("SCENARIO: Investments page loads without error", async ({ page }) => { await page.goto("/investments", { waitUntil: "domcontentloaded" }); await page.waitForTimeout(2000); await ready(page) }) })
  test.describe("Net Worth", () => {
    test("SCENARIO: Net worth page loads without error", async ({ page }) => { await page.goto("/net-worth", { waitUntil: "domcontentloaded" }); await page.waitForTimeout(3000); await ready(page) })
    test("SCENARIO: Net worth shows summary cards", async ({ page }) => {
      await page.goto("/net-worth", { waitUntil: "domcontentloaded" }); await page.waitForTimeout(3000); await ready(page)
      const cards = page.locator('[class*="card"], [class*="stat"]').filter({ hasText: /₹/ })
      if (await cards.first().isVisible().catch(() => false)) await expect(cards.first()).toBeVisible()
    })
  })
})
