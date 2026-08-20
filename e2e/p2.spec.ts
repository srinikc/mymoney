import { test, expect } from "@playwright/test"

test.describe("P2 — Loans & Insurance", () => {

  test("SCENARIO: View empty loans page", async ({ page }) => {
    await page.goto("/loans", { waitUntil: "domcontentloaded" })
    await page.waitForTimeout(3000)
    await expect(page.locator("h1")).toContainText("Loans")
    await expect(page.getByText("Add Loan")).toBeVisible()
  })

  test("SCENARIO: Create a home loan with auto-calculated EMI", async ({ page }) => {
    await page.goto("/loans", { waitUntil: "domcontentloaded" })
    await page.waitForTimeout(3000)
    await page.getByText("Add Loan").click()
    await page.waitForTimeout(500)
    await page.fill('input[name="name"]', "Home Loan")
    await page.fill('input[name="principal"]', "5000000")
    await page.fill('input[name="interestRate"]', "8.5")
    await page.fill('input[name="tenureMonths"]', "240")
    await page.waitForTimeout(500)
    await page.getByRole("button", { name: "Add", exact: true }).click()
    await page.waitForTimeout(2000)
    await expect(page.getByText("Home Loan").first()).toBeVisible({ timeout: 5000 })
  })

  test("SCENARIO: Delete a loan with confirmation", async ({ page }) => {
    await page.goto("/loans", { waitUntil: "domcontentloaded" })
    await page.waitForTimeout(3000)
    const uniqueName = `Del-${Date.now()}`
    await page.getByText("Add Loan").click()
    await page.fill('input[name="name"]', uniqueName)
    await page.fill('input[name="principal"]', "100000")
    await page.fill('input[name="interestRate"]', "10")
    await page.fill('input[name="tenureMonths"]', "12")
    await page.getByRole("button", { name: "Add", exact: true }).click()
    await page.waitForTimeout(2000)
    await expect(page.getByText(uniqueName).first()).toBeVisible({ timeout: 5000 })
    const row = page.locator("tr", { has: page.getByText(uniqueName) })
    await row.locator("button").last().click()
    await expect(page.getByText(/are you sure/i)).toBeVisible()
    await page.getByRole("button", { name: "Delete" }).click()
    await page.waitForTimeout(1000)
    await expect(page.getByText(uniqueName)).toHaveCount(0)
  })

  test("SCENARIO: View empty insurance page", async ({ page }) => {
    await page.goto("/insurance", { waitUntil: "domcontentloaded" })
    await page.waitForTimeout(3000)
    await expect(page.locator("h1")).toContainText("Insurance")
    await expect(page.getByText("Add Insurance")).toBeVisible()
  })

  test("SCENARIO: Create a health insurance policy", async ({ page }) => {
    await page.goto("/insurance", { waitUntil: "domcontentloaded" })
    await page.waitForTimeout(3000)
    await page.getByText("Add Insurance").click()
    await page.waitForTimeout(500)
    await page.fill('input[name="name"]', "Health Policy")
    await page.fill('input[name="premium"]', "15000")
    await page.getByRole("button", { name: "Add", exact: true }).click()
    await page.waitForTimeout(2000)
    await expect(page.getByText("Health Policy").first()).toBeVisible({ timeout: 5000 })
  })

  test("SCENARIO: Delete insurance with confirmation", async ({ page }) => {
    await page.goto("/insurance", { waitUntil: "domcontentloaded" })
    await page.waitForTimeout(3000)
    const uniqueName = `Del-${Date.now()}`
    await page.getByText("Add Insurance").click()
    await page.fill('input[name="name"]', uniqueName)
    await page.fill('input[name="premium"]', "5000")
    await page.getByRole("button", { name: "Add", exact: true }).click()
    await page.waitForTimeout(2000)
    await expect(page.getByText(uniqueName).first()).toBeVisible({ timeout: 5000 })
    const row = page.locator("tr", { has: page.getByText(uniqueName) })
    await row.locator("button").last().click()
    await expect(page.getByText(/are you sure/i)).toBeVisible()
    await page.getByRole("button", { name: "Delete" }).click()
    await page.waitForTimeout(1000)
    await expect(page.getByText(uniqueName)).toHaveCount(0)
  })
})
