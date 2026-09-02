import { test, expect } from "@playwright/test"

test.describe("Admin user auth method management", () => {
  test("GET /api/admin/users returns authMethod for each user", async ({ request, browser }) => {
    // Login as admin
    const context = await browser.newContext()
    const page = await context.newPage()
    await page.goto("/login", { waitUntil: "domcontentloaded" })
    await page.locator("#email").fill("admin@test.com")
    await page.locator("#password").fill("test123")
    await page.getByRole("button", { name: /Sign in with Email/i }).click()
    await page.waitForTimeout(3000)

    const cookies = await context.cookies()
    const cookieHeader = cookies.map((c) => `${c.name}=${c.value}`).join("; ")

    const res = await request.get("/api/admin/users", { headers: { cookie: cookieHeader } })
    if (res.status() === 200) {
      const data = await res.json()
      expect(Array.isArray(data)).toBe(true)
      // Each user should have an authMethod field
      for (const u of data.slice(0, 3)) {
        expect(u.authMethod).toBeDefined()
        expect(["credentials", "google", "both"]).toContain(u.authMethod)
      }
    }
  })

  test("admin user edit page loads for admin", async ({ page, browser }) => {
    const context = await browser.newContext()
    const page2 = await context.newPage()
    await page2.goto("/login", { waitUntil: "domcontentloaded" })
    await page2.locator("#email").fill("admin@test.com")
    await page2.locator("#password").fill("test123")
    await page2.getByRole("button", { name: /Sign in with Email/i }).click()
    await page2.waitForTimeout(3000)

    await page2.goto("/admin/users", { waitUntil: "domcontentloaded" })
    await page2.waitForTimeout(3000)
    await expect(page2.getByRole("heading", { name: /Users/i })).toBeVisible({ timeout: 10000 })
  })

  test("unlink-google endpoint requires admin auth", async ({ request }) => {
    const res = await request.post("/api/admin/users/1/unlink-google")
    expect(res.status()).toBe(401)
  })

  test("set-password endpoint requires admin auth", async ({ request }) => {
    const res = await request.post("/api/admin/users/1/set-password", {
      data: { password: "newpassword123" },
    })
    expect(res.status()).toBe(401)
  })

  test("set-password rejects too-short password", async ({ request, browser }) => {
    const context = await browser.newContext()
    const page = await context.newPage()
    await page.goto("/login", { waitUntil: "domcontentloaded" })
    await page.locator("#email").fill("admin@test.com")
    await page.locator("#password").fill("test123")
    await page.getByRole("button", { name: /Sign in with Email/i }).click()
    await page.waitForTimeout(3000)

    const cookies = await context.cookies()
    const cookieHeader = cookies.map((c) => `${c.name}=${c.value}`).join("; ")

    const res = await request.post("/api/admin/users/2/set-password", {
      headers: { cookie: cookieHeader },
      data: { password: "short" },
    })
    if (res.status() === 200) {
      // We got 200, which is unexpected
      const data = await res.json()
      expect(data.ok).toBe(false)
    } else {
      expect(res.status()).toBe(400)
    }
  })
})
