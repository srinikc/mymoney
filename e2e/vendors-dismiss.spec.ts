import { test, expect } from "@playwright/test"
import { seedUnmappedExpense, deleteExpense } from "./helpers"

/**
 * Feature: Vendors page — Dismiss + URL
 *
 *   As a user reviewing unmapped vendors
 *   I want to dismiss vendors from the Unmapped review list
 *   So that dismissed vendors disappear from Unmapped and are NOT added to All Mappings
 *
 *   Background:
 *     Given I am logged in (via the shared storage state, e.g. test@example.com)
 *     And the Vendors page is at /expenses/vendors
 *
 *   Scenario: Vendors page loads at the renamed URL
 *     When I navigate to /expenses/vendors
 *     Then I see the Vendors page (Vendors heading, Unmapped and All Mappings tabs)
 *
 *   Scenario: Old /expenses/merchants URL no longer serves the page
 *     When I navigate to /expenses/merchants
 *     Then I am NOT shown the Vendors page
 *
 *   Scenario: Dismissing a vendor removes it from Unmapped
 *     Given the Unmapped tab shows at least one vendor
 *     When I select a vendor and click Dismiss
 *     Then that vendor is no longer listed under Unmapped
 *
 *   Scenario: Dismissing a vendor does NOT add it to All Mappings
 *     Given I have dismissed a vendor from Unmapped
 *     When I switch to the All Mappings tab
 *     Then the dismissed vendor is NOT listed there
 */

test.describe("Vendors page — Dismiss + URL", () => {
  let seededExpenseId = 0

  test.afterEach(async () => {
    await deleteExpense(seededExpenseId)
    seededExpenseId = 0
  })

  test("Vendors page loads at /expenses/vendors", async ({ page }) => {
    await page.goto("/expenses/vendors", { waitUntil: "domcontentloaded", timeout: 30000 })
    await expect(page).toHaveURL(/\/expenses\/vendors/)
    // The page header is "Vendors"
    await expect(page.getByRole("heading", { name: "Vendors", level: 1 })).toBeVisible({ timeout: 20000 })
    // Tabs present
    await expect(page.getByRole("button", { name: /Unmapped/ }).first()).toBeVisible()
    await expect(page.getByText("All Mappings").first()).toBeVisible()
  })

  test("old /expenses/merchants URL no longer serves the Vendors page", async ({ page }) => {
    await page.goto("/expenses/merchants", { waitUntil: "domcontentloaded", timeout: 30000 })
    // Should NOT show the Vendors H1 (soft 404)
    await page.waitForTimeout(1500)
    await expect(page.getByRole("heading", { name: "Vendors", level: 1 })).toHaveCount(0)
  })

  test("dismissing a vendor removes it from Unmapped and not added to All Mappings", async ({ page }) => {
    // Seed a unique unmapped vendor (no VendorMapping exists for it yet).
    const vendorName = `dismisstest-${Date.now()}`
    seededExpenseId = await seedUnmappedExpense(page, vendorName)

    await page.goto("/expenses/vendors", { waitUntil: "domcontentloaded", timeout: 30000 })
    await expect(page.getByRole("button", { name: /Unmapped/ }).first()).toBeVisible({ timeout: 25000 })

    // The seeded vendor should appear in the Unmapped table (name column = lowercase key)
    const row = page.locator("table tbody tr", { hasText: vendorName })
    await expect(row.first()).toBeVisible({ timeout: 25000 })

    // Select the row via its checkbox
    const checkbox = row.first().locator('button[role="checkbox"], input[type="checkbox"]').first()
    await checkbox.click({ force: true })

    // Click "Dismiss Selected"
    const dismissBtn = page.getByRole("button", { name: /Dismiss Selected/ })
    await expect(dismissBtn).toBeVisible()
    await dismissBtn.click()

    // After the reload, the dismissed vendor should no longer appear in the Unmapped table
    await expect(row.first()).not.toBeVisible({ timeout: 25000 }).catch(() => {})
    await page.waitForTimeout(1500)
    const bodyText = (await page.locator("body").textContent()) ?? ""
    expect(bodyText).not.toContain(vendorName)

    // Switch to All Mappings — the dismissed vendor must NOT be listed
    await page.getByText("All Mappings").first().click()
    await page.waitForTimeout(2000)
    const mappingsText = (await page.locator("body").textContent()) ?? ""
    expect(mappingsText).not.toContain(vendorName)
  })
})