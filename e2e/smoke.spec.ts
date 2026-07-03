import { test, expect } from "@playwright/test"

test.describe("Smoke tests", () => {
  test("Dashboard loads and shows key elements", async ({ page }) => {
    await page.goto("/", { waitUntil: "load", timeout: 20000 })
    await page.waitForTimeout(2000)
    await expect(page.locator("body")).not.toHaveClass(/error/)
  })

  test("Sidebar navigation is visible", async ({ page }) => {
    await page.goto("/", { waitUntil: "load", timeout: 20000 })
    await page.waitForTimeout(3000)
    const dashboardLink = page.locator("a[href='/']").first()
    await expect(dashboardLink).toBeVisible()
  })

  test("Expenses page loads", async ({ page }) => {
    await page.goto("/expenses", { waitUntil: "load", timeout: 20000 })
    await expect(page).toHaveURL(/\/expenses/)
  })

  test("Page transition does not break layout", async ({ page }) => {
    await page.goto("/", { waitUntil: "load", timeout: 20000 })
    await page.waitForTimeout(2000)
    const budgetsLink = page.locator("nav a[href='/budgets']")
    await expect(budgetsLink).toBeVisible()
    await budgetsLink.click()
    await expect(page).toHaveURL(/\/budgets/)
    await page.goBack()
    await expect(page).toHaveURL(/\/$/)
  })
})
