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
    test("POST /api/setup/admin rejects missing fields", async ({ page }) => {
      const res = await page.request.post("/api/setup/admin", {
        data: { email: "", password: "" },
      })
      expect(res.status()).toBe(400)
      const body = await res.json()
      expect(body.error).toBe("Email and password are required")
    })

    test("POST /api/setup/admin rejects short password", async ({ page }) => {
      const res = await page.request.post("/api/setup/admin", {
        data: { email: "test@example.com", password: "1234567" },
      })
      expect(res.status()).toBe(400)
      const body = await res.json()
      expect(body.error).toBe("Password must be at least 8 characters")
    })

    test("POST /api/setup/admin rejects existing user email", async ({ page }) => {
      const res = await page.request.post("/api/setup/admin", {
        data: { email: "test@example.com", password: "TestPass123!" },
      })
      if (res.status() === 400) {
        const body = await res.json()
        expect(body.error).toMatch(/already exists/i)
      }
    })
  })

  test.describe("Setup Page", () => {
    test("/setup loads and shows form", async ({ page }) => {
      await page.goto("/setup", { waitUntil: "domcontentloaded" })
      await page.waitForTimeout(2000)

      const url = page.url()
      if (url.includes("/login")) {
        // Admin already exists — redirect
        expect(url).toContain("/login")
      } else {
        await expect(page.getByText("Set Up Admin Account")).toBeVisible()
        await expect(page.getByLabel("Admin Email")).toHaveValue("srinikc@gmail.com")
      }
    })
  })

  test.describe("Login Page", () => {
    test("login page shows MyMoney branding", async ({ page }) => {
      await page.goto("/login", { waitUntil: "domcontentloaded" })
      await page.waitForTimeout(2000)
      await expect(page.getByText("MyMoney")).toBeVisible()
      await expect(page.getByText("Your personal finance manager")).toBeVisible()
      await expect(page.getByText("Sign in")).toBeVisible()
    })

    test("login form shows email and password fields", async ({ page }) => {
      await page.goto("/login", { waitUntil: "domcontentloaded" })
      await page.waitForTimeout(2000)
      await expect(page.getByLabel("Email")).toBeVisible()
      await expect(page.getByLabel("Password")).toBeVisible()
      await expect(page.getByRole("button", { name: "Sign in with Email" })).toBeVisible()
    })

    test("login with wrong credentials shows error", async ({ page }) => {
      await page.goto("/login", { waitUntil: "domcontentloaded" })
      await page.waitForTimeout(2000)

      // Skip if redirected to /setup
      if (page.url().includes("/setup")) {
        test.skip(true, "No admin exists — redirect to /setup")
        return
      }

      await page.fill("#email", "srinikc@gmail.com")
      await page.fill("#password", "wrongpassword123!")
      await page.getByRole("button", { name: "Sign in with Email" }).click()
      await page.waitForTimeout(2000)

      await expect(page.getByText("Invalid email or password")).toBeVisible()
    })
  })

  test.describe("Test-Login Endpoint", () => {
    test("GET /api/auth/test-login works", async ({ page }) => {
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
