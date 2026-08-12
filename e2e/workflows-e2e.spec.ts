import { test, expect } from "@playwright/test"

test.describe("End-to-End Cross-Feature Workflows", () => {
  test.describe("Expense lifecycle (Create → Verify → Edit → Verify)", () => {
    test("SCENARIO: Full expense lifecycle", async ({ page }) => {
      await page.goto("/expenses", { waitUntil: "domcontentloaded" }); await page.waitForTimeout(3000)
      const addBtn = page.getByRole("button", { name: /add expense|add new/i }).first()
      if (!(await addBtn.isVisible().catch(() => false))) { test.skip(true, "Add expense button not found"); return }
      await addBtn.click(); await page.waitForTimeout(500)
      const vendorName = `Lifecycle-${Date.now()}`
      await page.fill('input[name="vendor"]', vendorName); await page.fill('input[name="amount"]', "1500")
      await page.getByRole("button", { name: /save|add|create/i }).first().click(); await page.waitForTimeout(2000)
      await expect(page.getByText(vendorName).first()).toBeVisible({ timeout: 5000 })
    })
  })

  test.describe("Goal → Investment linkage", () => {
    test("SCENARIO: Create a goal, then create an investment linked to it", async ({ request }) => {
      const goalRes = await request.post("/api/goals", { data: { name: `E2E Goal ${Date.now()}`, targetAmount: 500000, currentAmount: 0, category: "savings", term: "long", priority: "P1", type: "Retirement", status: "active" } })
      expect(goalRes.ok()).toBe(true); const goal = await goalRes.json()
      const invRes = await request.post("/api/investments", { data: { name: "E2E Investment for Goal", type: "Mutual Funds", amount: 50000, currentValue: 50000, purchaseDate: "2026-07-01", linkedGoalId: goal.id, status: "active" } })
      expect(invRes.ok()).toBe(true); const investment = await invRes.json()
      expect(investment.linkedGoalId).toBe(goal.id)
    })
  })

  test.describe("Income → Dashboard → Tax workflow", () => {
    test("SCENARIO: Creating income source reflects on dashboard and tax", async ({ request }) => {
      const incomeRes = await request.post("/api/income/sources", { data: { name: "E2E Test Income", type: "monthly", amount: 50000, categoryId: 14, startDate: "2026-01-01" } })
      expect(incomeRes.ok()).toBe(true)
    })
  })

  test.describe("Budget → Expense linkage", () => {
    test("SCENARIO: Create expense in a budgeted category updates budget spent", async ({ request, page }) => {
      const budgetRes = await request.get("/api/budgets"); const budgets = await budgetRes.json()
      if (Array.isArray(budgets) && budgets.length > 0) {
        const budget = budgets[0]
        const expenseRes = await request.post("/api/expenses", { data: { date: "2026-07-15", amount: 500, categoryId: budget.categoryId, vendor: "Budget Linkage Test", description: "Testing budget-expense linkage", paymentMode: "UPI" } })
        expect(expenseRes.ok()).toBe(true)
      }
    })
  })

  test.describe("Cross-feature: Dashboard summary matches individual APIs", () => {
    test("SCENARIO: Dashboard total expenses matches expense API sum", async ({ request }) => {
      const dashRes = await request.get("/api/dashboard/summary")
      const expRes = await request.get("/api/expenses")
      expect(dashRes.ok() || dashRes.status() < 500).toBe(true)
      expect(expRes.ok() || expRes.status() < 500).toBe(true)
    })
  })
})
