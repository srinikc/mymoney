import { test, expect } from "@playwright/test"

test.describe("Admin Ads Dashboard", () => {
  test("metrics API requires admin auth", async ({ request }) => {
    const res = await request.get("/api/admin/ads/metrics")
    expect(res.status()).toBe(401)
  })

  test("killswitch API requires admin auth", async ({ request }) => {
    const res = await request.get("/api/admin/ads/killswitch")
    expect(res.status()).toBe(401)
  })

  test("loans admin API requires admin auth", async ({ request }) => {
    const res = await request.get("/api/admin/loans")
    expect(res.status()).toBe(401)
  })

  test("funds admin API requires admin auth", async ({ request }) => {
    const res = await request.get("/api/admin/funds")
    expect(res.status()).toBe(401)
  })

  test("analyze funds API requires admin auth", async ({ request }) => {
    const res = await request.post("/api/admin/funds/analyze")
    expect(res.status()).toBe(401)
  })

  test("admin/ads page requires admin", async ({ page }) => {
    await page.goto("/admin/ads", { waitUntil: "domcontentloaded" })
    await page.waitForTimeout(2000)
    // Non-admin should be redirected to / or /login
    const url = page.url()
    expect(url).not.toContain("/admin/ads")
  })

  test("admin/loans page requires admin", async ({ page }) => {
    await page.goto("/admin/loans", { waitUntil: "domcontentloaded" })
    await page.waitForTimeout(2000)
    const url = page.url()
    expect(url).not.toContain("/admin/loans")
  })

  test("admin/funds page requires admin", async ({ page }) => {
    await page.goto("/admin/funds", { waitUntil: "domcontentloaded" })
    await page.waitForTimeout(2000)
    const url = page.url()
    expect(url).not.toContain("/admin/funds")
  })
})
