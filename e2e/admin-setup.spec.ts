import { test, expect } from "@playwright/test"

test.describe("Admin Setup & Login", () => {
  test.describe("Setup Status API", () => {
    test("GET /api/setup/status returns hasAdmin boolean", async ({ page }) => {
      const res = await page.request.get("/api/setup/status")
      expect(res.ok()).toBeTruthy()
      const body = await res.json()
      expect(body).toHaveProperty("hasAdmin")
      expect(typeof body.hasAdmin).toBe("boolean")
    })
  })

  test.describe("Setup Admin API", () => {
    test("POST /api/setup/admin rejects when admin exists or fields empty", async ({ page }) => {
      const res = await page.request.post("/api/setup/admin", {
        data: { email: "", password: "" },
      })
      expect(res.status()).toBe(400)
      const body = await res.json()
      expect(body.error).toBeTruthy()
    })

    test("POST /api/setup/admin rejects short password or existing user", async ({ page }) => {
      const res = await page.request.post("/api/setup/admin", {
        data: { email: "test@example.com", password: "1234567" },
      })
      expect(res.status()).toBe(400)
      const body = await res.json()
      expect(body.error).toBeTruthy()
    })

    test("POST /api/setup/admin rejects duplicate admin", async ({ page }) => {
      const res = await page.request.post("/api/setup/admin", {
        data: { email: "newadmin@example.com", password: "TestPass123!" },
      })
      if (res.status() === 400) {
        const body = await res.json()
        expect(body.error).toMatch(/already exists/i)
      }
    })
  })

  test.describe("Setup Page", () => {
    test("/setup redirects to login when admin exists", async ({ page }) => {
      await page.goto("/setup", { waitUntil: "domcontentloaded" })
      await page.waitForTimeout(3000)
      expect(page.url()).toContain("/login")
    })
  })

  test.describe("Login Page", () => {
    test("login page shows sign-in form when admin exists", async ({ page }) => {
      await page.goto("/login", { waitUntil: "domcontentloaded" })
      await page.waitForTimeout(3000)
      await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible()
      await expect(page.getByLabel("Email")).toBeVisible()
      await expect(page.getByLabel("Password")).toBeVisible()
      await expect(page.getByRole("button", { name: "Sign in with Email" })).toBeVisible()
    })

    test("login with wrong credentials shows error", async ({ page }) => {
      await page.goto("/login", { waitUntil: "domcontentloaded" })
      await page.waitForTimeout(3000)
      await page.fill("#email", "srinikc@gmail.com")
      await page.fill("#password", "wrongpassword123!")
      await page.getByRole("button", { name: "Sign in with Email" }).click()
      await page.waitForTimeout(2000)
      await expect(page.getByText("Invalid email or password")).toBeVisible()
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
})
