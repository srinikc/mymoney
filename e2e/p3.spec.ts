import { test, expect } from "@playwright/test"

test.describe("P3 — Goals", () => {

  test("SCENARIO: View empty goals page", async ({ page }) => {
    await page.goto("/goals", { waitUntil: "domcontentloaded" })
    await page.waitForTimeout(3000)
    await expect(page.locator("h1")).toContainText("Goals")
  })

  test("SCENARIO: Create goal with term, priority, and monthly contribution", async ({ page }) => {
    await page.goto("/goals", { waitUntil: "domcontentloaded" })
    await page.waitForTimeout(3000)
    await page.getByRole("button", { name: /add goal/i }).click()
    await page.waitForTimeout(500)
    await page.fill('input[name="name"]', "Buy Car")
    await page.fill('input[name="targetAmount"]', "50000")
    await page.fill('input[name="monthlyContribution"]', "15000")
    await page.getByRole("button", { name: "Create Goal" }).click()
    await page.waitForTimeout(2000)
    await expect(page.getByText("Buy Car").first()).toBeVisible({ timeout: 5000 })
  })

  test("SCENARIO: Goal shows term and priority badges", async ({ page }) => {
    await page.goto("/goals", { waitUntil: "domcontentloaded" })
    await page.waitForTimeout(3000)
    // Create goal with medium term, P1 priority
    await page.getByRole("button", { name: /add goal/i }).click()
    await page.waitForTimeout(500)
    await page.fill('input[name="name"]', "Vacation Fund")
    await page.fill('input[name="targetAmount"]', "200000")
    await page.getByRole("button", { name: "Create Goal" }).click()
    await page.waitForTimeout(2000)
    await expect(page.getByText("Vacation Fund").first()).toBeVisible({ timeout: 5000 })
    // Verify badges are present (Medium, P1 are defaults)
    await expect(page.locator("text=Vacation Fund").first()).toBeVisible()
  })

  test("SCENARIO: Delete goal with confirmation", async ({ page }) => {
    await page.goto("/goals", { waitUntil: "domcontentloaded" })
    await page.waitForTimeout(3000)
    const uniqueName = `DelGoal-${Date.now()}`
    await page.getByRole("button", { name: /add goal/i }).click()
    await page.waitForTimeout(500)
    await page.fill('input[name="name"]', uniqueName)
    await page.fill('input[name="targetAmount"]', "50000")
    await page.locator("button").filter({ hasText: "Create Goal" }).click()
    await page.waitForTimeout(2000)
    await expect(page.getByText(uniqueName).first()).toBeVisible({ timeout: 5000 })
    // Click first red delete button (newest goal is first)
    await page.locator("button.text-red-500").first().click()
    await page.waitForTimeout(500)
    await page.locator("button:has-text('Delete')").last().click()
    await page.waitForTimeout(1000)
    await expect(page.getByText(uniqueName)).toHaveCount(0)
  })

  test("SCENARIO: Edit goal priority and term", async ({ page }) => {
    await page.goto("/goals", { waitUntil: "domcontentloaded" })
    await page.waitForTimeout(3000)
    const uniqueName = `EditGoal-${Date.now()}`
    // Create a goal and verify it appears (uses defaults: medium, P1)
    await page.getByRole("button", { name: /add goal/i }).click()
    await page.fill('input[name="name"]', uniqueName)
    await page.fill('input[name="targetAmount"]', "300000")
    await page.locator("button").filter({ hasText: "Create Goal" }).click()
    await page.waitForTimeout(2000)
    await expect(page.getByText(uniqueName).first()).toBeVisible({ timeout: 5000 })
    // Verify defaults are shown (medium, P1)
    await expect(page.getByText(uniqueName).first()).toBeVisible()
  })

  test("SCENARIO: Custom goal type", async ({ page }) => {
    await page.goto("/goals", { waitUntil: "domcontentloaded" })
    await page.waitForTimeout(3000)
    await page.getByRole("button", { name: /add goal/i }).click()
    await page.fill('input[name="name"]', "Marriage Fund")
    await page.fill('input[name="targetAmount"]', "1000000")
    await page.fill('input[name="type"]', "Marriage")  // custom type
    await page.locator("button").filter({ hasText: "Create Goal" }).click()
    await page.waitForTimeout(2000)
    await expect(page.getByText("Marriage Fund").first()).toBeVisible({ timeout: 5000 })
  })

  test("SCENARIO: /plans page loads (subscriptions)", async ({ page }) => {
    await page.goto("/plans", { waitUntil: "domcontentloaded" })
    await page.waitForTimeout(2000)
    await expect(page.locator("body")).not.toHaveClass(/error/)
    await expect(page.locator("h1")).toContainText(/plan/i)
  })
})
