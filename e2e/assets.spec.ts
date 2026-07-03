import { test, expect } from "@playwright/test"

test.describe("Assets Page", () => {
  test("loads without errors", async ({ page }) => {
    await page.goto("/assets", { waitUntil: "load", timeout: 20000 })
    await expect(page.locator("body")).not.toHaveClass(/error/)
  })
})
