import { test, expect } from "@playwright/test"

test.describe("Income Sources", () => {
  test("page loads with heading, summary and add button", async ({ page }) => {
    await page.goto("/api/auth/test-login")
    await page.goto("/income", { waitUntil: "domcontentloaded" })
    await page.waitForTimeout(3000)
    await expect(page.locator("h1")).toContainText("Income Sources")
    await expect(page.getByText("Add Income")).toBeVisible()
    await expect(page.getByText("Total Monthly Income")).toBeVisible()
  })

  test("create income source via dialog", async ({ page }) => {
    await page.goto("/api/auth/test-login")
    await page.goto("/income", { waitUntil: "domcontentloaded" })
    await page.waitForTimeout(2000)

    await page.getByText("Add Income").click()
    await expect(page.getByText("Add Income Source")).toBeVisible()
    await page.fill('input[name="name"]', "My Salary")
    await page.fill('input[name="amount"]', "50000")
    await page.getByRole("button", { name: "Add" }).click()
    await page.waitForTimeout(2000)
    await expect(page.getByText("My Salary").first()).toBeVisible({ timeout: 5000 })
  })
})
