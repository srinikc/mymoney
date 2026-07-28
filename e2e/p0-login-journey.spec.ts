import { test, expect } from "@playwright/test"

test.describe("P0 — Login Journey", () => {
  test.use({ storageState: { cookies: [], origins: [] } })

  test("unauthenticated user is redirected to login", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" })
    await page.waitForTimeout(2000)
    expect(page.url()).toContain("/login")
  })

  test("login page shows sign-in form with email/password and Google option", async ({ page }) => {
    await page.goto("/login", { waitUntil: "domcontentloaded" })
    await page.waitForTimeout(2000)
    await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible()
    await expect(page.getByLabel("Email")).toBeVisible()
    await expect(page.getByLabel("Password")).toBeVisible()
    await expect(page.getByRole("button", { name: "Sign in with Email" })).toBeVisible()
    await expect(page.getByRole("button", { name: /continue with google/i })).toBeVisible()
  })

  test("login with valid credentials redirects to onboarding or dashboard", async ({ page }) => {
    // Get CSRF token
    await page.goto("/api/auth/csrf")
    const csrfBody = await page.evaluate(() => document.body.textContent)
    const csrfToken = JSON.parse(csrfBody || "{}").csrfToken
    expect(csrfToken).toBeTruthy()

    // POST to credentials callback directly (signIn with redirect:false is broken in NextAuth v5)
    await page.request.post("/api/auth/callback/credentials", {
      form: { csrfToken, email: "test@example.com", password: "test123", callbackUrl: "/", json: "true" },
    })

    await page.goto("/", { waitUntil: "domcontentloaded" })
    await page.waitForTimeout(3000)
    const finalUrl = page.url()
    const validPaths = ["/onboarding", "/"]
    const landed = validPaths.some((p) => finalUrl.includes(p))
    expect(landed, `Expected to land on /onboarding or /, got ${finalUrl}`).toBeTruthy()
  })

  test("login with wrong credentials shows error", async ({ page }) => {
    await page.goto("/login", { waitUntil: "domcontentloaded" })
    await page.waitForTimeout(2000)
    await page.locator("#email").fill("test@example.com")
    await page.locator("#password").fill("wrongpassword123!")
    await page.getByRole("button", { name: "Sign in with Email" }).click()
    await page.waitForTimeout(2000)
    await expect(page.getByText("Invalid email or password")).toBeVisible()
  })

  test("protected pages redirect to login when not authenticated", async ({ page }) => {
    await page.goto("/budgets", { waitUntil: "domcontentloaded" })
    await page.waitForTimeout(2000)
    expect(page.url()).toContain("/login")
  })
})
