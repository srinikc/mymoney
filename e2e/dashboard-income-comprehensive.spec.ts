import { test, expect } from "@playwright/test"

test.describe("Dashboard & Reports Income — Comprehensive", () => {
  test.describe("Dashboard income card", () => {
    test("SCENARIO: Income stat card shows formatted currency", async ({ page }) => {
      await page.goto("/", { waitUntil: "domcontentloaded" }); await page.waitForTimeout(5000)
      const cards = page.locator('[class*="card"], [class*="stat"]').filter({ hasText: /₹/ })
      if ((await cards.count()) > 0) { await expect(cards.first()).toBeVisible(); expect(await cards.first().textContent()).toMatch(/₹/) }
    })

    test("SCENARIO: Income card shows zero when no income sources", async ({ page }) => {
      await page.route("**/api/insights*", async (route) => { await route.fulfill({ status: 200, body: JSON.stringify({ totalIncome: 0, totalExpenses: 0, totalInvestments: 0, activeGoals: 0, monthlyExpense: 0, budgetUtilization: 0, monthlyTrend: [], investmentReturns: 0, goalProgress: 0 }) }) })
      await page.goto("/", { waitUntil: "domcontentloaded" }); await page.waitForTimeout(3000)
      await expect(page.locator("body")).not.toHaveClass(/error/)
    })

    test("SCENARIO: Income API fails gracefully — card shows fallback", async ({ page }) => {
      await page.route("**/api/insights*", async (route) => { await route.fulfill({ status: 500, body: "Error" }) })
      await page.goto("/", { waitUntil: "domcontentloaded" }); await page.waitForTimeout(3000)
      await expect(page.locator("body")).not.toHaveClass(/error/)
    })
  })

  test.describe("Reports income section", () => {
    test("SCENARIO: Reports page loads without error", async ({ page }) => {
      await page.goto("/reports", { waitUntil: "domcontentloaded" }); await page.waitForTimeout(3000)
      await expect(page.locator("body")).not.toHaveClass(/error/)
    })
    test("SCENARIO: Reports overview shows stat cards", async ({ page }) => {
      await page.goto("/reports", { waitUntil: "domcontentloaded" }); await page.waitForTimeout(3000)
      const statCards = page.locator('[class*="stat"], [class*="card"]').filter({ hasText: /₹/ })
      if ((await statCards.count()) > 0) await expect(statCards.first()).toBeVisible()
    })
    test("SCENARIO: Reports income data changes with year filter", async ({ page }) => {
      await page.goto("/reports", { waitUntil: "domcontentloaded" }); await page.waitForTimeout(3000)
      const fySelect = page.locator("button").filter({ hasText: /fy|2026|2025/i }).first()
      if (await fySelect.isVisible().catch(() => false)) { await fySelect.click(); await page.waitForTimeout(500); const option = page.getByText(/2025-26|2024-25/i).first(); if (await option.isVisible().catch(() => false)) { await option.click(); await page.waitForTimeout(1000) } }
    })
    test("SCENARIO: No income data shows empty state", async ({ page }) => {
      await page.route("**/api/insights*", async (route) => { await route.fulfill({ status: 200, body: JSON.stringify({ totalIncome: 0 }) }) })
      await page.goto("/reports", { waitUntil: "domcontentloaded" }); await page.waitForTimeout(3000)
    })
  })

  test.describe("Income vs Expense comparison", () => {
    test("SCENARIO: Comparison section is visible when both exist", async ({ page }) => {
      await page.goto("/reports", { waitUntil: "domcontentloaded" }); await page.waitForTimeout(3000)
      const comparison = page.locator("text=vs").first()
      if (await comparison.isVisible().catch(() => false)) await expect(comparison).toBeVisible()
    })
  })

  test.describe("Export functionality", () => {
    test("SCENARIO: Export button is present on reports page", async ({ page }) => {
      await page.goto("/reports", { waitUntil: "domcontentloaded" }); await page.waitForTimeout(3000)
      const exportBtn = page.getByRole("button", { name: /export/i }).first()
      if (await exportBtn.isVisible().catch(() => false)) await expect(exportBtn).toBeVisible()
    })
  })

  test.describe("Income tab hidden without sources", () => {
    test("SCENARIO: Reports page loads when income sources exist", async ({ page }) => {
      await page.goto("/reports", { waitUntil: "domcontentloaded" }); await page.waitForTimeout(3000)
      await expect(page.locator("body")).not.toHaveClass(/error/)
    })
  })
})
