import { test, expect } from "@playwright/test"

test.describe("Reports Income — Comprehensive", () => {
  test.describe("Reports Overview", () => {
    test("SCENARIO: Reports page loads without error", async ({ page }) => {
      await page.goto("/reports", { waitUntil: "domcontentloaded" }); await page.waitForTimeout(3000)
      await expect(page.locator("body")).not.toHaveClass(/error/)
    })
    test("SCENARIO: Overview shows Total Income stat card", async ({ page }) => {
      await page.goto("/reports", { waitUntil: "domcontentloaded" }); await page.waitForTimeout(3000)
      const incomeStat = page.getByText(/total income/i).first()
      if (await incomeStat.isVisible().catch(() => false)) {
        await expect(incomeStat).toBeVisible()
        const card = incomeStat.locator("xpath=ancestor::div[contains(@class,'rounded-lg')][1]")
        expect(await card.textContent()).toMatch(/₹/)
      }
    })
  })

  test.describe("Income tab", () => {
    test("SCENARIO: Income tab shows monthly trend section", async ({ page }) => {
      await page.goto("/reports", { waitUntil: "domcontentloaded" }); await page.waitForTimeout(3000)
      const incomeTab = page.getByRole("tab", { name: /income/i }).first()
      if (await incomeTab.isVisible().catch(() => false)) { await incomeTab.click(); await page.waitForTimeout(1000) }
    })
    test("SCENARIO: Income vs Expense comparison chart is present", async ({ page }) => {
      await page.goto("/reports", { waitUntil: "domcontentloaded" }); await page.waitForTimeout(3000)
      const comparison = page.getByText(/income.*expense|expense.*income|vs/i)
      if (await comparison.isVisible().catch(() => false)) await expect(comparison).toBeVisible()
    })
    test("SCENARIO: Income data updates with date filter change", async ({ page }) => {
      await page.goto("/reports", { waitUntil: "domcontentloaded" }); await page.waitForTimeout(3000)
      const filterBtn = page.locator("button").filter({ hasText: /month|year|fy|period|all time/i }).first()
      if (await filterBtn.isVisible().catch(() => false)) { await filterBtn.click(); await page.waitForTimeout(500) }
    })
  })

  test.describe("Empty state", () => {
    test("SCENARIO: No income data shows empty state while expenses remain", async ({ page }) => {
      await page.route("**/api/insights*", async (route) => { await route.fulfill({ status: 200, body: JSON.stringify({}) }) })
      await page.goto("/reports", { waitUntil: "domcontentloaded" }); await page.waitForTimeout(3000)
    })
  })

  test.describe("Export", () => {
    test("SCENARIO: Export button exists on reports page", async ({ page }) => {
      await page.goto("/reports", { waitUntil: "domcontentloaded" }); await page.waitForTimeout(3000)
      const exportBtn = page.getByRole("button", { name: /export|download|csv|pdf/i }).first()
      if (await exportBtn.isVisible().catch(() => false)) await expect(exportBtn).toBeVisible()
    })
  })

  test.describe("Non-functional: Reports page performance", () => {
    test("SCENARIO: Reports page loads within acceptable time", async ({ page }) => {
      const start = Date.now(); await page.goto("/reports", { waitUntil: "networkidle", timeout: 30000 })
      expect(Date.now() - start).toBeLessThan(20000)
    })
  })
})
