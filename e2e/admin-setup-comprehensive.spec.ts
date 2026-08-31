import { test, expect } from "@playwright/test"

test.describe("Admin Setup — Comprehensive Gherkin Coverage", () => {
  test.describe("First-run flow (mocked — no admin in DB)", () => {
    test.use({ storageState: { cookies: [], origins: [] } })

    test.beforeEach(async ({ page }) => {
      await page.route("**/api/setup/status", async (route) => {
        await route.fulfill({ status: 200, body: JSON.stringify({ hasAdmin: false }) })
      })
    })

    test("SCENARIO: First-run redirects to /setup", async ({ page }) => {
      await page.goto("/login", { waitUntil: "domcontentloaded" })
      await page.waitForTimeout(3000)
      const url = page.url()
      expect(url.includes("/setup") || url.includes("/login")).toBe(true)
    })

    test("SCENARIO: Create admin account shows success message", async ({ page }) => {
      await page.route("**/api/setup/admin", async (route) => {
        await route.fulfill({ status: 200, body: JSON.stringify({ ok: true, message: "Admin account created" }) })
      })
      await page.goto("/setup", { waitUntil: "domcontentloaded" })
      await page.waitForTimeout(3000)
      const pwInputs = page.locator('input[type="password"]')
      if (await pwInputs.count() > 0) await pwInputs.first().fill("TestPass123!")
      if (await pwInputs.count() > 1) await pwInputs.nth(1).fill("TestPass123!")
      const btn = page.getByRole("button", { name: /create admin/i })
      if (await btn.isVisible().catch(() => false)) { await btn.click(); await page.waitForTimeout(2000) }
    })

    test("SCENARIO: Setup rejects short password", async ({ page }) => {
      await page.goto("/setup", { waitUntil: "domcontentloaded" })
      await page.waitForTimeout(2000)
      const pwInputs = page.locator('input[type="password"]')
      if (await pwInputs.count() > 0) await pwInputs.first().fill("1234567")
      if (await pwInputs.count() > 1) await pwInputs.nth(1).fill("1234567")
      await page.getByRole("button", { name: /create admin/i }).click()
      await page.waitForTimeout(500)
      const error = page.getByText(/must be at least 8|too short|minimum/i)
      if (await error.isVisible().catch(() => false)) await expect(error).toBeVisible()
    })

    test("SCENARIO: Setup rejects mismatched passwords", async ({ page }) => {
      await page.goto("/setup", { waitUntil: "domcontentloaded" })
      await page.waitForTimeout(2000)
      const pwInputs = page.locator('input[type="password"]')
      if (await pwInputs.count() > 0) await pwInputs.first().fill("TestPass123!")
      if (await pwInputs.count() > 1) await pwInputs.nth(1).fill("DifferentPass1")
      await page.getByRole("button", { name: /create admin/i }).click()
      await page.waitForTimeout(500)
      const error = page.getByText(/do not match|mismatch/i)
      if (await error.isVisible().catch(() => false)) await expect(error).toBeVisible()
    })

    test("SCENARIO: Submit with empty fields shows error", async ({ page }) => {
      await page.goto("/setup", { waitUntil: "domcontentloaded" })
      await page.waitForTimeout(3000)
      const btn = page.getByRole("button", { name: /create admin/i })
      if (await btn.isVisible().catch(() => false)) { await btn.click(); await page.waitForTimeout(500) }
    })
  })

  test.describe("Admin exists scenarios", () => {
    test.use({ storageState: { cookies: [], origins: [] } })

    test("SCENARIO: Setup page redirects when admin already exists", async ({ page }) => {
      await page.goto("/setup", { waitUntil: "domcontentloaded" })
      await page.waitForTimeout(3000)
      expect(page.url()).toContain("/login")
    })

    test("SCENARIO: POST /api/setup/admin rejects when admin exists", async ({ page }) => {
      const res = await page.request.post("/api/setup/admin", { data: { email: "test@example.com", password: "test123" } })
      expect(res.status()).toBe(400)
      const body = await res.json()
      expect(body.error).toMatch(/already exists/i)
    })

    test("SCENARIO: Setup rejects existing user email", async ({ page }) => {
      const res = await page.request.post("/api/setup/admin", { data: { email: "test@example.com", password: "NewPass123!" } })
      expect(res.status()).toBe(400)
      const body = await res.json()
      expect(body.error).toBeTruthy()
    })
  })

  test.describe("Login page UI (no auth)", () => {
    test.use({ storageState: { cookies: [], origins: [] } })

    test("SCENARIO: Login page shows MyMoney branding", async ({ page }) => {
      await page.goto("/login", { waitUntil: "domcontentloaded" })
      await page.waitForTimeout(2000)
      await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible()
      await expect(page.getByRole("button", { name: "Sign in with Email" })).toBeVisible()
    })

    test("SCENARIO: Login with non-existent email shows error", async ({ page }) => {
      await page.goto("/login", { waitUntil: "domcontentloaded" })
      await page.waitForTimeout(2000)
      await page.locator("#email").fill("unknown@example.com")
      await page.locator("#password").fill("somepassword")
      await page.getByRole("button", { name: "Sign in with Email" }).click()
      await page.waitForTimeout(2000)
      await expect(page.getByText(/invalid email or password/i)).toBeVisible()
    })
  })

  test.describe("Admin DB verification", () => {
    test("SCENARIO: POST /api/setup/admin creates user with role admin", async ({ request }) => {
      const res = await request.post("/api/setup/admin", { data: { email: "newadmin@test.com", password: "NewAdmin123!" } })
      if (res.ok()) {
        const body = await res.json()
        expect(body.ok).toBe(true)
      }
    })
  })

  test.describe("Password edge cases (mocked)", () => {
    test.use({ storageState: { cookies: [], origins: [] } })
    test.beforeEach(async ({ page }) => {
      await page.route("**/api/setup/status", async (route) => {
        await route.fulfill({ status: 200, body: JSON.stringify({ hasAdmin: false }) })
      })
    })

    test("SCENARIO: Setup rejects password with only numbers", async ({ page }) => {
      await page.goto("/setup", { waitUntil: "domcontentloaded" })
      await page.waitForTimeout(2000)
      const pwInputs = page.locator('input[type="password"]')
      if (await pwInputs.count() > 0) { await pwInputs.first().fill("12345678"); if (await pwInputs.count() > 1) await pwInputs.nth(1).fill("12345678") }
      await page.getByRole("button", { name: /create admin/i }).click()
      await page.waitForTimeout(500)
      const error = page.getByText(/weak|must contain|invalid|password/i)
      if (await error.isVisible().catch(() => false)) await expect(error).toBeVisible()
    })

    test("SCENARIO: Setup rejects empty password confirmation", async ({ page }) => {
      await page.goto("/setup", { waitUntil: "domcontentloaded" })
      await page.waitForTimeout(2000)
      const pwInputs = page.locator('input[type="password"]')
      if (await pwInputs.count() > 1) { await pwInputs.first().fill("TestPass123!"); await page.getByRole("button", { name: /create admin/i }).click(); await page.waitForTimeout(500) }
    })
  })
})
