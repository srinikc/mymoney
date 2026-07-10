import { test, expect } from "@playwright/test"

test.describe("P2 — Loans", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login", { waitUntil: "domcontentloaded" })
    await page.waitForTimeout(2000)
    await page.locator("#email").fill("test@example.com")
    await page.locator("#password").fill("test123")
    await page.getByRole("button", { name: "Sign in with Email" }).click()
    await page.waitForURL("/", { timeout: 15000 })
    await page.waitForTimeout(2000)
  })

  test("loans page loads with heading", async ({ page }) => {
    await page.goto("/loans", { waitUntil: "domcontentloaded" })
    await page.waitForTimeout(3000)
    await expect(page.locator("h1")).toContainText("Loans")
  })

  test("create a loan with auto-calculated EMI", async ({ page }) => {
    await page.goto("/loans", { waitUntil: "domcontentloaded" })
    await page.waitForTimeout(3000)
    await page.getByText("Add Loan").click()
    await page.waitForTimeout(500)
    await page.fill('input[name="name"]', "Home Loan")
    await page.fill('input[name="principal"]', "5000000")
    await page.fill('input[name="interestRate"]', "8.5")
    await page.fill('input[name="tenureMonths"]', "240")
    await page.waitForTimeout(500)
    await page.getByRole("button", { name: "Add" }).click()
    await page.waitForTimeout(2000)
    await expect(page.getByText("Home Loan").first()).toBeVisible({ timeout: 5000 })
  })
})

test.describe("P2 — Insurance", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login", { waitUntil: "domcontentloaded" })
    await page.waitForTimeout(2000)
    await page.locator("#email").fill("test@example.com")
    await page.locator("#password").fill("test123")
    await page.getByRole("button", { name: "Sign in with Email" }).click()
    await page.waitForURL("/", { timeout: 15000 })
    await page.waitForTimeout(2000)
  })

  test("insurance page loads with heading and tab filters", async ({ page }) => {
    await page.goto("/insurance", { waitUntil: "domcontentloaded" })
    await page.waitForTimeout(3000)
    await expect(page.locator("h1")).toContainText("Insurance")
    await expect(page.getByText("Add Insurance")).toBeVisible()
  })

  test("create an insurance policy", async ({ page }) => {
    await page.goto("/insurance", { waitUntil: "domcontentloaded" })
    await page.waitForTimeout(3000)
    await page.getByText("Add Insurance").click()
    await page.waitForTimeout(500)
    await page.fill('input[name="name"]', "Health Policy")
    await page.fill('input[name="premium"]', "15000")
    await page.getByRole("button", { name: "Add" }).click()
    await page.waitForTimeout(2000)
    await expect(page.getByText("Health Policy").first()).toBeVisible({ timeout: 5000 })
  })
})
