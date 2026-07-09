import { test, expect } from "@playwright/test"

test.describe("Income Sources", () => {
  test("error state shows Add Income button that opens dialog", async ({ page }) => {
    // Navigate without auth (simulates real user who hasn't logged in yet)
    await page.goto("/income", { waitUntil: "domcontentloaded" })
    await page.waitForTimeout(3000)

    // Should show heading
    await expect(page.locator("h1")).toContainText("Income Sources")
    
    // Should show Add Income button (visible even in error state)
    await expect(page.getByText("Add Income")).toBeVisible()
    
    // Click Add Income - dialog should OPEN (this was the bug)
    await page.getByText("Add Income").click()
    await page.waitForTimeout(1000)
    await expect(page.getByText("Add Income Source")).toBeVisible()
  })

  test("create income source with auth", async ({ page }) => {
    await page.goto("/api/auth/test-login")
    await page.goto("/income", { waitUntil: "domcontentloaded" })
    await page.waitForTimeout(3000)

    await expect(page.locator("h1")).toContainText("Income Sources")
    await expect(page.getByText("Total Monthly Income")).toBeVisible()
    await expect(page.getByText("Add Income")).toBeVisible()

    await page.getByText("Add Income").click()
    await expect(page.getByText("Add Income Source")).toBeVisible()
    await page.fill('input[name="name"]', "Test Income")
    await page.fill('input[name="amount"]', "50000")
    await page.getByRole("button", { name: "Add" }).click()
    await page.waitForTimeout(2000)
    await expect(page.getByText("Test Income").first()).toBeVisible({ timeout: 5000 })
  })
})
