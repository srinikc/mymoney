import { test, expect } from "@playwright/test"

test.describe("Subscriptions Page", () => {
  test("loads without errors", async ({ page }) => {
    await page.goto("/subscriptions", { waitUntil: "load", timeout: 20000 })
    await expect(page.locator("body")).not.toHaveClass(/error/)
  })
})
