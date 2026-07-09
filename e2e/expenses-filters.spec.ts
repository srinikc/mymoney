import { test, expect } from "@playwright/test"
import { loginAsTestUser } from "./auth-helper"

test.describe("Expenses Filters", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsTestUser(page)
    await page.goto("/expenses", { waitUntil: "load", timeout: 20000 })
    await page.waitForSelector('[data-testid="filter-btn-Vendor"]', { timeout: 15000 }).catch(() => {})
  })

  test("column filters present in table header", async ({ page }) => {
    const headers = ["Date", "Vendor", "Category", "Sub Cat", "Person", "Mode", "Bank", "Amount", "Comments", "Type", "Other"]
    for (const header of headers) {
      const btn = page.getByTestId(`filter-btn-${header}`)
      await expect(btn).toBeVisible()
    }
  })

  test("category filter opens popover on click", async ({ page }) => {
    const btn = page.getByTestId("filter-btn-Category")
    await expect(btn).toBeVisible()
    await btn.click()
    await expect(page.getByRole("dialog")).toBeVisible({ timeout: 3000 })
    await page.keyboard.press("Escape")
  })

  test("vendor filter opens popover on click", async ({ page }) => {
    const btn = page.getByTestId("filter-btn-Vendor")
    await expect(btn).toBeVisible()
    await btn.click()
    await expect(page.getByRole("dialog")).toBeVisible({ timeout: 3000 })
    await page.keyboard.press("Escape")
  })

  test("person filter opens popover on click", async ({ page }) => {
    const btn = page.getByTestId("filter-btn-Person")
    await expect(btn).toBeVisible()
    await btn.click()
    await expect(page.getByRole("dialog")).toBeVisible({ timeout: 3000 })
    await page.keyboard.press("Escape")
  })

  test("amount column opens filter on click", async ({ page }) => {
    const btn = page.getByTestId("filter-btn-Amount")
    await expect(btn).toBeVisible()
    await btn.click()
    await expect(page.getByRole("dialog")).toBeVisible({ timeout: 3000 })
    await page.keyboard.press("Escape")
  })

  test("sub category filter opens popover on click", async ({ page }) => {
    const btn = page.getByTestId("filter-btn-Sub Cat")
    await expect(btn).toBeVisible()
    await btn.click()
    await expect(page.getByRole("dialog")).toBeVisible({ timeout: 3000 })
    await page.keyboard.press("Escape")
  })

  test("mode filter opens popover on click", async ({ page }) => {
    const btn = page.getByTestId("filter-btn-Mode")
    await expect(btn).toBeVisible()
    await btn.click()
    await expect(page.getByRole("dialog")).toBeVisible({ timeout: 3000 })
    await page.keyboard.press("Escape")
  })

  test("type filter opens popover on click", async ({ page }) => {
    const btn = page.getByTestId("filter-btn-Type")
    await expect(btn).toBeVisible()
    await btn.click()
    await expect(page.getByRole("dialog")).toBeVisible({ timeout: 3000 })
    await page.keyboard.press("Escape")
  })
})
