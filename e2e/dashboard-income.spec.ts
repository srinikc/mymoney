import { test, expect } from "@playwright/test"

test.describe("P6 — Dashboard Income Card", () => {

  test("SCENARIO: Dashboard shows income stat card", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" })
    await page.waitForTimeout(3000)
    await expect(page.getByText("Total Income").first()).toBeVisible()
    await expect(page.getByText("Total Expenses").first()).toBeVisible()
    await expect(page.getByText("Total Investments").first()).toBeVisible()
    await expect(page.getByText("Active Goals").first()).toBeVisible()
  })

  test("SCENARIO: Dashboard loads without error", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" })
    await page.waitForTimeout(3000)
    await expect(page.locator("body")).not.toHaveClass(/error/)
  })
})
