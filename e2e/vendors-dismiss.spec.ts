import { test, expect, Page } from "@playwright/test"

/**
 * Feature: Vendors page — Dismiss + URL
 *
 *   As a user reviewing unmapped vendors
 *   I want to dismiss vendors from the Unmapped review list
 *   So that dismissed vendors disappear from Unmapped and are NOT added to All Mappings
 *
 *   Background:
 *     Given I am logged in
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

const TEST_EMAIL = "vendor-1786719132192@test.dev"
const TEST_PASSWORD = "test123"

async function login(page: Page) {
  await page.goto("/api/auth/csrf")
  const body = await page.evaluate(() => document.body.textContent)
  const csrfToken = JSON.parse(body || "{}").csrfToken
  if (!csrfToken) throw new Error("Could not get CSRF token")
  const res = await page.request.post("/api/auth/callback/credentials", {
    form: { csrfToken, email: TEST_EMAIL, password: TEST_PASSWORD, callbackUrl: "/", json: "true" },
  })
  if (!res.ok() && !res.url().includes("/")) {
    throw new Error("Login POST failed: " + res.status())
  }
  await page.goto("/")
  await page.waitForLoadState("domcontentloaded")
}

test.describe("Vendors page — Dismiss + URL", () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
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
    // Seed a unique unmapped vendor (no VendorMapping exists for it yet)
    const vendorName = `dismisstest-${Date.now()}`
    const createRes = await page.request.post("/api/expenses", {
      data: { date: "2026-08-17", amount: 250, vendor: vendorName, description: "e2e dismiss", paymentMode: "UPI" },
    })
    expect(createRes.ok()).toBe(true)

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
