import { test, expect } from "@playwright/test"
import { seedUnmappedExpense, deleteExpense } from "./helpers"

/**
 * Feature: Expired session redirects to login
 *
 *   As a user whose session has expired
 *   I want the app to take me to the login page
 *   So that I don't see a bare "Unauthorized" error on an action
 *
 *   Background:
 *     Given I am logged in (via the shared storage state, e.g. test@example.com)
 *     And my session later expires while I'm on the Vendors page
 *
 *   Scenario: An action that gets a 401 redirects to /login
 *     When I click "Dismiss All"
 *     Then I am taken to /login with a callbackUrl back to the Vendors page
 */

test.describe("Expired session → login redirect", () => {
  let seededExpenseId = 0

  test.afterEach(async () => {
    await deleteExpense(seededExpenseId)
    seededExpenseId = 0
  })

  test("an action that gets a 401 redirects to /login", async ({ page }) => {
    // Seed an unmapped vendor so the Dismiss All button is enabled (count > 0)
    const vendorName = `sessionexpiry-${Date.now()}`
    seededExpenseId = await seedUnmappedExpense(page, vendorName)

    await page.goto("/expenses/vendors", { waitUntil: "domcontentloaded", timeout: 30000 })
    await expect(page.getByRole("heading", { name: "Vendors", level: 1 })).toBeVisible({ timeout: 20000 })

    // Wait for the unmapped data to load (button enabled with a non-zero count)
    const dismissAll = page.getByRole("button", { name: /Dismiss All \(/ })
    await expect(dismissAll).toBeEnabled({ timeout: 25000 })

    // Simulate session expiry: replace the session cookie with an invalid value.
    // The middleware only checks cookie *presence*, so the page stays reachable,
    // but the API route will reject the token with 401 — exactly like a real expiry.
    await page.context().clearCookies()
    await page.context().addCookies([
      { name: "authjs.session-token", value: "expired-invalid-token", url: "http://localhost:3005" },
    ])

    // Accept the confirm dialog, then trigger the dismiss action
    page.once("dialog", (d) => d.accept())
    await dismissAll.click()

    // The 401 should have redirected us to /login with a callbackUrl back here
    await page.waitForURL(/\/login\?callbackUrl=/, { timeout: 15000 })
    await expect(page).toHaveURL(/\/login\?callbackUrl=%2Fexpenses%2Fvendors/)
  })
})