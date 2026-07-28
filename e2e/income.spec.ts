import { test, expect } from "@playwright/test"

test.describe("Income Sources", () => {
  test("error state shows Add Income button that opens dialog", async ({ page }) => {
    await page.goto("/income", { waitUntil: "domcontentloaded" })
    await page.waitForTimeout(3000)
    await expect(page.locator("h1")).toContainText("Income Sources")
    await expect(page.getByText("Add Income")).toBeVisible()
    await page.getByText("Add Income").click()
    await page.waitForTimeout(1000)
    await expect(page.getByText("Add Income Source")).toBeVisible()
  })

  test("create income source", async ({ page }) => {
    await page.goto("/income", { waitUntil: "domcontentloaded" })
    await page.waitForTimeout(3000)
    await expect(page.locator("h1")).toContainText("Income Sources")

    await page.getByText("Add Income").click()
    await page.waitForTimeout(500)
    await page.fill('input[name="name"]', "Test Income")
    await page.fill('input[name="amount"]', "50000")
    await page.getByRole("button", { name: "Add" }).click()
    await page.waitForTimeout(2000)
    await expect(page.getByText("Test Income").first()).toBeVisible({ timeout: 5000 })
  })
})
