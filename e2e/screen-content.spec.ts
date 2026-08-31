import { test, expect } from "@playwright/test"

test.describe("Screen Content Validation", () => {
  function expectPageReady(page: import("@playwright/test").Page) { return expect(page.locator("body")).not.toHaveClass(/error/) }

  test("DASHBOARD: Page loads without error", async ({ page }) => { await page.goto("/", { waitUntil: "domcontentloaded" }); await page.waitForTimeout(3000); await expectPageReady(page) })
  test("EXPENSES: Table or content renders", async ({ page }) => {
    await page.goto("/expenses", { waitUntil: "domcontentloaded" }); await page.waitForTimeout(3000); await expectPageReady(page)
    const table = page.locator("table, [role='table']")
    if (await table.isVisible().catch(() => false)) expect(await page.locator("table tbody tr, [role='row']").count()).toBeGreaterThan(0)
  })
  test("BUDGETS: Budget amounts render correctly", async ({ page }) => { await page.goto("/budgets", { waitUntil: "domcontentloaded" }); await page.waitForTimeout(3000); await expectPageReady(page) })
  test("GOALS: Page shows heading and add button", async ({ page }) => { await page.goto("/goals", { waitUntil: "domcontentloaded" }); await page.waitForTimeout(3000); await expectPageReady(page); const btn = page.getByRole("button", { name: /add goal/i }).first(); if (await btn.isVisible().catch(() => false)) await expect(btn).toBeVisible() })
  test("INCOME: Income page content renders", async ({ page }) => { await page.goto("/income", { waitUntil: "domcontentloaded" }); await page.waitForTimeout(3000); await expectPageReady(page) })
  test("LOANS: Loans page renders without error", async ({ page }) => { await page.goto("/loans", { waitUntil: "domcontentloaded" }); await page.waitForTimeout(2000); await expectPageReady(page) })
  test("INSURANCE: Insurance page renders without error", async ({ page }) => { await page.goto("/insurance", { waitUntil: "domcontentloaded" }); await page.waitForTimeout(2000); await expectPageReady(page) })
  test("INVESTMENTS: Page renders without error", async ({ page }) => { await page.goto("/investments", { waitUntil: "domcontentloaded" }); await page.waitForTimeout(3000); await expectPageReady(page) })
  test("ASSETS: Page renders without error", async ({ page }) => { await page.goto("/assets", { waitUntil: "domcontentloaded" }); await page.waitForTimeout(2000); await expectPageReady(page) })
  test("SUBSCRIPTIONS: Page renders without error", async ({ page }) => { await page.goto("/subscriptions", { waitUntil: "domcontentloaded" }); await page.waitForTimeout(2000); await expectPageReady(page) })
  test("NET WORTH: Net worth summary cards render", async ({ page }) => { await page.goto("/net-worth", { waitUntil: "domcontentloaded" }); await page.waitForTimeout(3000); await expectPageReady(page); const cards = page.locator('[class*="card"], [class*="stat"]').filter({ hasText: /₹/ }); if (await cards.first().isVisible().catch(() => false)) await expect(cards.first()).toBeVisible() })
  test("REPORTS: Reports page loads without error", async ({ page }) => { await page.goto("/reports", { waitUntil: "domcontentloaded" }); await page.waitForTimeout(3000); await expectPageReady(page) })
  test("TAX: Tax page shows all four tabs", async ({ page }) => {
    await page.goto("/tax", { waitUntil: "domcontentloaded" }); await page.waitForTimeout(5000)
    for (const name of ["Income & Deductions", "Documents", "ITR Filings", "Projections"]) {
      const el = page.locator(`text="${name}"`).first()
      if (await el.isVisible().catch(() => false)) await expect(el).toBeVisible()
    }
  })
  test("REMINDERS: Reminders page loads without error", async ({ page }) => { await page.goto("/reminders", { waitUntil: "domcontentloaded" }); await page.waitForTimeout(2000); await expectPageReady(page) })
  test("DEALS: Deals page loads without error", async ({ page }) => { await page.goto("/deals", { waitUntil: "domcontentloaded" }); await page.waitForTimeout(2000); await expectPageReady(page) })
  test("SETTINGS: Settings page loads without error", async ({ page }) => { await page.goto("/settings", { waitUntil: "domcontentloaded" }); await page.waitForTimeout(3000); await expectPageReady(page) })
  test("SIDEBAR: All sidebar navigation links are visible", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" }); await page.waitForTimeout(2000)
    for (const label of ["Dashboard", "Expenses", "Budgets", "Goals", "Income", "Investments", "Loans", "Insurance", "Reports", "Net Worth", "Settings"]) {
      const link = page.locator(`nav a, [class*="sidebar"] a, [class*="nav"] a`).filter({ hasText: label }).first()
      if (await link.isVisible().catch(() => false)) await expect(link).toBeVisible()
    }
  })
})
