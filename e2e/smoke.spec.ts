import { test, expect } from "@playwright/test"

test.describe("Smoke tests", () => {
  test("Dashboard loads and shows key elements", async ({ page }) => {
    await page.goto("/")
    await expect(page.locator("h1, h2, h3").first()).toBeVisible()
    await expect(page.getByText("MyMoney")).toBeVisible()
  })

  test("Sidebar navigation is visible", async ({ page }) => {
    await page.goto("/")
    await expect(page.getByText("Dashboard")).toBeVisible()
    await expect(page.getByText("Expenses")).toBeVisible()
    await expect(page.getByText("Budgets")).toBeVisible()
  })

  test("Expenses page loads", async ({ page }) => {
    await page.goto("/expenses")
    await expect(page).toHaveURL(/\/expenses/)
  })

  test("Page transition does not break layout", async ({ page }) => {
    await page.goto("/")
    await page.getByText("Expenses").click()
    await expect(page).toHaveURL(/\/expenses/)
    await page.getByText("Dashboard").click()
    await expect(page).toHaveURL(/\/$/)
  })
})
