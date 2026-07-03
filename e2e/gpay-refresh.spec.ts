import { test, expect } from "@playwright/test"

test.describe("GPay Refresh", () => {
  test("expenses page loads without errors", async ({ page }) => {
    await page.goto("/expenses", { waitUntil: "load", timeout: 20000 })
    await expect(page.locator("body")).not.toHaveClass(/error/)
  })

  test("settings integrations page loads without errors", async ({ page }) => {
    await page.goto("/settings/integrations", { waitUntil: "load", timeout: 20000 })
    await expect(page.locator("body")).not.toHaveClass(/error/)
  })
})
