import { test, expect, Page } from "@playwright/test"

/**
 * Feature: Expired session redirects to login
 *
 *   As a user whose session has expired
 *   I want the app to take me to the login page
 *   So that I don't see a bare "Unauthorized" error on an action
 *
 *   Background:
 *     Given I am logged in
 *     And my session later expires while I'm on the Vendors page
 *
 *   Scenario: An action that gets a 401 redirects to /login
 *     When I click "Dismiss All"
 *     Then I am taken to /login with a callbackUrl back to the Vendors page
 */

const TEST_EMAIL = "vendor-1786719132192@test.dev"
const TEST_PASSWORD = "test123"

async function login(page: Page) {
  await page.goto("/api/auth/csrf")
  const body = await page.evaluate(() => document.body.textContent)
  const csrfToken = JSON.parse(body || "{}").csrfToken
  if (!csrfToken) throw new Error("Could not get CSRF token")
  await page.request.post("/api/auth/callback/credentials", {
    form: { csrfToken, email: TEST_EMAIL, password: TEST_PASSWORD, callbackUrl: "/", json: "true" },
  })
  await page.goto("/")
  await page.waitForLoadState("domcontentloaded")
}

test.describe("Expired session → login redirect", () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
  })

  test("an action that gets a 401 redirects to /login", async ({ page }) => {
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