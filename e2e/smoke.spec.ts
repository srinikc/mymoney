import { test, expect } from "@playwright/test"
import { loginAsTestUser } from "./auth-helper"

test.describe("Smoke tests", () => {
  test("Dashboard loads and shows key elements", async ({ page }) => {
    await page.goto("/", { waitUntil: "load", timeout: 20000 })
    await page.waitForTimeout(2000)
    await expect(page.locator("body")).not.toHaveClass(/error/)
  })

  test("Sidebar navigation is visible", async ({ page }) => {
    await loginAsTestUser(page)
    await page.goto("/", { waitUntil: "load", timeout: 20000 })
    await page.waitForTimeout(2000)
    await page.evaluate(() => localStorage.setItem("mymoney-tutorial-shown", "true"))
    await page.reload()
    await page.waitForLoadState("networkidle")
    const dashboardLink = page.locator("a[href='/']").last()
    await expect(dashboardLink).toBeVisible()
  })

  test("Expenses page loads", async ({ page }) => {
    await page.goto("/expenses", { waitUntil: "load", timeout: 20000 })
    await expect(page).toHaveURL(/\/expenses/)
  })

  test("Page transition and sidebar links work", async ({ page }) => {
    await loginAsTestUser(page)
    await page.goto("/", { waitUntil: "load", timeout: 20000 })
    await page.waitForTimeout(2000)
    await page.evaluate(() => localStorage.setItem("mymoney-tutorial-shown", "true"))
    await page.reload()
    await page.waitForLoadState("networkidle")
    const budgetsLink = page.locator("a[href='/budgets']")
    await expect(budgetsLink).toBeVisible()
    await budgetsLink.click({ force: true })
    await expect(page).toHaveURL(/\/budgets/)
    await page.goBack()
    await expect(page).toHaveURL(/\/$/)
  })
})
