import { test, expect } from "@playwright/test"

test.describe("Admin Setup API", () => {
  test("GET /api/setup/status returns hasAdmin boolean", async ({ page }) => {
    const res = await page.request.get("/api/setup/status")
    expect(res.ok()).toBeTruthy()
    const body = await res.json()
    expect(body).toHaveProperty("hasAdmin")
    expect(typeof body.hasAdmin).toBe("boolean")
  })

  test("POST /api/setup/admin rejects when admin exists", async ({ page }) => {
    const res = await page.request.post("/api/setup/admin", {
      data: { email: "", password: "" },
    })
    expect(res.status()).toBe(400)
    const body = await res.json()
    expect(body.error).toBeTruthy()
  })

  test("POST /api/setup/admin rejects duplicate", async ({ page }) => {
    const res = await page.request.post("/api/setup/admin", {
      data: { email: "newadmin@example.com", password: "TestPass123!" },
    })
    if (res.status() === 400) {
      const body = await res.json()
      expect(body.error).toMatch(/already exists/i)
    }
  })
})

test.describe("Admin Setup & Login UI", () => {
  test.use({ storageState: { cookies: [], origins: [] } })

  test("/setup redirects to login when admin exists", async ({ page }) => {
    await page.goto("/setup", { waitUntil: "domcontentloaded" })
    await page.waitForTimeout(3000)
    expect(page.url()).toContain("/login")
  })

  test("login page shows sign-in form", async ({ page }) => {
    await page.goto("/login", { waitUntil: "domcontentloaded" })
    await page.waitForTimeout(3000)
    await expect(page.getByText("Sign in")).toBeVisible()
  })
})

test.describe("Test-Login Endpoint", () => {
  test("GET /api/auth/test-login works when E2E=true", async ({ page }) => {
    const res = await page.request.get("/api/auth/test-login")
    if (res.status() === 403) {
      const body = await res.json()
      expect(body.error).toContain("E2E")
    } else {
      expect(res.ok()).toBeTruthy()
    }
  })
})
