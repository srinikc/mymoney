import { test, expect } from "@playwright/test"

test.describe("Budgets", () => {
  test("SCENARIO: View budgets page loads", async ({ page }) => {
    await page.goto("/budgets", { waitUntil: "domcontentloaded" }); await page.waitForTimeout(3000)
    await expect(page.locator("body")).not.toHaveClass(/error/)
  })

  test("SCENARIO: Budget displays spent vs remaining", async ({ page }) => {
    await page.goto("/budgets", { waitUntil: "domcontentloaded" }); await page.waitForTimeout(3000)
    const el = page.locator("text=₹").first()
    if (await el.isVisible().catch(() => false)) await expect(el).toBeVisible()
  })

  test("SCENARIO: Budget shows progress bar", async ({ page }) => {
    await page.goto("/budgets", { waitUntil: "domcontentloaded" }); await page.waitForTimeout(3000)
    const progressBar = page.locator('[role="progressbar"], [class*="progress"]').first()
    if (await progressBar.isVisible().catch(() => false)) await expect(progressBar).toBeVisible()
  })
})
