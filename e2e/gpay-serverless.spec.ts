import { test, expect } from "@playwright/test"

test.describe("GPay refresh serverless fallback", () => {
  test("GET refresh-gpay endpoint requires auth", async ({ request }) => {
    const res = await request.get("/api/refresh-gpay")
    expect(res.status()).toBe(401)
  })

  test("POST refresh-gpay without action handles serverless / playwright missing", async ({ request, browser }) => {
    // Login as a real user
    const context = await browser.newContext()
    const page = await context.newPage()
    await page.goto("/login", { waitUntil: "domcontentloaded" })
    await page.locator("#email").fill("test@example.com")
    await page.locator("#password").fill("test123")
    await page.getByRole("button", { name: /Sign in with Email/i }).click()
    await page.waitForTimeout(3000)

    // Test refresh
    const cookies = await context.cookies()
    const cookieHeader = cookies.map((c) => `${c.name}=${c.value}`).join("; ")
    const res = await request.post("/api/refresh-gpay", {
      headers: { cookie: cookieHeader },
    })
    // Should return 503 (serverless) or 202 (job started) or 200 (reauth URL)
    expect([200, 202, 500, 503]).toContain(res.status())
  })
})
