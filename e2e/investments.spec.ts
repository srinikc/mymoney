import { test, expect } from "@playwright/test"

test.describe("Investments Page", () => {
  test("loads without errors", async ({ page }) => {
    await page.goto("/investments", { waitUntil: "load", timeout: 20000 })
    await expect(page.locator("body")).not.toHaveClass(/error/)
  })
})
