import { test, expect } from "@playwright/test"

test.describe("Smoke tests", () => {
  test("Dashboard loads and shows key elements", async ({ page }) => {
    await page.goto("/")
    await expect(page.locator("h1, h2, h3").first()).toBeVisible()
    await expect(page.getByRole("link", { name: /MyMoney/ })).toBeVisible()
  })

  test("Sidebar navigation is visible", async ({ page }) => {
    await page.goto("/")
    await expect(page.getByRole("link", { name: /Dashboard/ })).toBeVisible()
    await expect(page.getByRole("button", { name: /Expenses/ })).toBeVisible()
    await expect(page.getByRole("link", { name: /Budgets/ })).toBeVisible()
  })

  test("Expenses page loads", async ({ page }) => {
    await page.goto("/expenses")
    await expect(page).toHaveURL(/\/expenses/)
  })

  test("Page transition does not break layout", async ({ page }) => {
    await page.goto("/")
    await page.getByRole("link", { name: /Budgets/ }).click()
    await expect(page).toHaveURL(/\/budgets/)
    await page.getByRole("link", { name: /Dashboard/ }).click()
    await expect(page).toHaveURL(/\/$/)
  })
})
