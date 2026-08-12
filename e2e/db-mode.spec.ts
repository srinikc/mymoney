import { test, expect } from "@playwright/test"

/**
 * Gherkin Scenarios:
 *
 * Feature: Database Mode Switching
 *   As an admin user
 *   I want to switch between production and test databases
 *   So that I can test features in isolation without affecting production data
 *
 *   Background:
 *     Given TEST_DATABASE_URL is configured in the environment
 *     And the app is currently using the production database
 *
 *   Scenario: Admin can see database mode settings page
 *     Given I am logged in as an admin user
 *     When I navigate to /settings
 *     Then I should see the "Database" settings card
 *     When I click the "Database" card
 *     Then I should be on /settings/database
 *     And I should see the current database mode
 *     And I should see buttons to switch between Production and Test DB
 *
 *   Scenario: Non-admin user cannot see database settings
 *     Given I am logged in as a regular user (non-admin)
 *     When I navigate to /settings
 *     Then I should NOT see the "Database" settings card
 *
 *   Scenario: Non-admin user cannot access database mode API
 *     Given I am logged in as a regular user (non-admin)
 *     When I send a GET request to /api/admin/db-mode
 *     Then I should receive a 403 response
 *
 *   Scenario: Non-admin user cannot switch database mode
 *     Given I am logged in as a regular user (non-admin)
 *     When I send a PUT request to /api/admin/db-mode with mode "test"
 *     Then I should receive a 403 response
 *
 *   Scenario: Admin can switch to test database
 *     Given I am logged in as an admin user
 *     When I switch to test database mode
 *     Then the response should indicate the mode is "test"
 *     And a subsequent GET request should return mode "test"
 *
 *   Scenario: Admin can switch back to production database
 *     Given I am logged in as an admin user
 *     And the database mode is currently "test"
 *     When I switch to production database mode
 *     Then the response should indicate the mode is "production"
 *     And a subsequent GET request should return mode "production"
 *
 *   Scenario: Invalid mode value is rejected
 *     Given I am logged in as an admin user
 *     When I send a PUT request to /api/admin/db-mode with mode "invalid"
 *     Then I should receive a 400 response with an error message
 */

test.describe("P5 — Database Mode Switching (Admin)", () => {

  test.describe("Unauthenticated access is blocked", () => {
    test("GET /api/admin/db-mode returns 401 when not logged in", async ({ browser }) => {
      const context = await browser.newContext({ storageState: { cookies: [], origins: [] } })
      const page = await context.newPage()
      const response = await page.request.get("/api/admin/db-mode")
      await context.close()
      expect(response.status()).toBeGreaterThanOrEqual(401)
    })

    test("PUT /api/admin/db-mode returns 401 when not logged in", async ({ browser }) => {
      const context = await browser.newContext({ storageState: { cookies: [], origins: [] } })
      const page = await context.newPage()
      const response = await page.request.put("/api/admin/db-mode", {
        data: { mode: "test" },
      })
      await context.close()
      expect(response.status()).toBeGreaterThanOrEqual(401)
    })
  })

  test.describe("Non-admin user is rejected", () => {
    const loginAs = async (browser: import("@playwright/test").Browser, email: string, password: string) => {
      const context = await browser.newContext({ storageState: { cookies: [], origins: [] } })
      const page = await context.newPage()
      await page.goto("/login")
      await page.fill("input[type='email']", email)
      await page.fill("input[type='password']", password)
      await page.click("button[type='submit']")
      await page.waitForURL(/\/$|\/onboarding/, { timeout: 15000 })
      return { context, page }
    }

    test("non-admin user gets 403 on GET /api/admin/db-mode", async ({ browser }) => {
      const { context, page } = await loginAs(browser, "regular@example.com", "test123")
      const response = await page.request.get("/api/admin/db-mode")
      await context.close()
      expect(response.status()).toBe(403)
    })

    test("non-admin user gets 403 on PUT /api/admin/db-mode", async ({ browser }) => {
      const { context, page } = await loginAs(browser, "regular@example.com", "test123")
      const response = await page.request.put("/api/admin/db-mode", {
        data: { mode: "test" },
      })
      await context.close()
      expect(response.status()).toBe(403)
    })

    test("non-admin user does not see Database card in settings", async ({ browser }) => {
      const { context, page } = await loginAs(browser, "regular@example.com", "test123")
      await page.goto("/settings")
      await expect(page.locator("text=Database")).not.toBeVisible()
      await context.close()
    })
  })

  test.describe("Admin can manage database mode", () => {
    test("admin sees Database card in settings", async ({ browser }) => {
      // Login as admin
      const context = await browser.newContext({ storageState: { cookies: [], origins: [] } })
      const page = await context.newPage()
      await page.goto("/login")
      await page.fill("input[type='email']", "admin@test.com")
      await page.fill("input[type='password']", "admin123")
      await page.click("button[type='submit']")
      await page.waitForURL(/\/$|\/onboarding/, { timeout: 15000 })

      await page.goto("/settings")
      await expect(page.locator("text=Database").first()).toBeVisible()
      await context.close()
    })

    test("admin can get current db mode", async ({ page }) => {
      const response = await page.request.get("/api/admin/db-mode")
      expect(response.status()).toBe(200)
      const data = await response.json()
      expect(["production", "test"]).toContain(data.mode)
    })

    test("admin can switch to test mode and back", async ({ page }) => {
      test.skip(!process.env.TEST_DATABASE_URL, "TEST_DATABASE_URL not configured in this environment")
      // Switch to test
      const putRes = await page.request.put("/api/admin/db-mode", {
        data: { mode: "test" },
      })
      expect(putRes.status()).toBe(200)
      let data = await putRes.json()
      expect(data.mode).toBe("test")

      // Verify
      const getRes = await page.request.get("/api/admin/db-mode")
      data = await getRes.json()
      expect(data.mode).toBe("test")

      // Switch back to production
      const putBack = await page.request.put("/api/admin/db-mode", {
        data: { mode: "production" },
      })
      expect(putBack.status()).toBe(200)
      data = await putBack.json()
      expect(data.mode).toBe("production")

      // Verify
      const getBack = await page.request.get("/api/admin/db-mode")
      data = await getBack.json()
      expect(data.mode).toBe("production")
    })

    test("invalid mode is rejected with 400", async ({ page }) => {
      const response = await page.request.put("/api/admin/db-mode", {
        data: { mode: "invalid" },
      })
      expect(response.status()).toBe(400)
    })

    test("settings page shows current mode", async ({ page }) => {
      const getRes = await page.request.get("/api/admin/db-mode")
      const data = await getRes.json()
      const currentMode = data.mode

      await page.goto("/settings/database")
      await expect(page.locator(`text=${currentMode === "test" ? "Test Database" : "Production Database"}`)).toBeVisible()
    })
  })
})
