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

  test("create income source with auth", async ({ page }) => {
    // Login via real login page
    await page.goto("/login", { waitUntil: "domcontentloaded" })
    await page.waitForTimeout(2000)
    await page.locator("#email").fill("test@example.com")
    await page.locator("#password").fill("test123")
    await page.getByRole("button", { name: "Sign in with Email" }).click()
    await page.waitForURL("/", { timeout: 15000 })
    await page.waitForTimeout(2000)

    await page.goto("/income", { waitUntil: "domcontentloaded" })
    await page.waitForTimeout(3000)
    await expect(page.locator("h1")).toContainText("Income Sources")
    await expect(page.locator("text=Total Monthly Income")).toBeVisible({ timeout: 10000 })
    await expect(page.getByText("Add Income")).toBeVisible()

    await page.getByText("Add Income").click()
    await page.fill('input[name="name"]', "Test Income")
    await page.fill('input[name="amount"]', "50000")
    await page.getByRole("button", { name: "Add" }).click()
    await page.waitForTimeout(2000)
    await expect(page.getByText("Test Income").first()).toBeVisible({ timeout: 5000 })
  })
})
