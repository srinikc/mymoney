import { test, expect } from "@playwright/test"

test.describe("GPay Refresh", () => {
  test("API returns 202 with jobId on POST", async ({ request }) => {
    const res = await request.post("/api/refresh-gpay")
    expect(res.status()).toBe(202)
    const body = await res.json()
    expect(body).toHaveProperty("jobId")
    expect(typeof body.jobId).toBe("string")
  })

  test("status endpoint returns 404 for unknown job", async ({ request }) => {
    const res = await request.get("/api/refresh-gpay/status/nonexistent-job-id")
    expect(res.status()).toBe(404)
  })

  test("expenses page has GPay Takeout button", async ({ page }) => {
    await page.goto("/expenses", { waitUntil: "load", timeout: 20000 })
    await page.waitForTimeout(2000)
    const btn = page.locator("button:has-text('GPay Takeout')")
    await expect(btn).toBeVisible()
  })

  test("settings integrations page has GPay card", async ({ page }) => {
    await page.goto("/settings/integrations", { waitUntil: "load", timeout: 20000 })
    await expect(page.locator("h1")).toContainText("Integrations")
    await expect(page.locator("text=GPay Takeout Auto-Refresh")).toBeVisible()
    await expect(page.locator("button:has-text('Refresh GPay')")).toBeVisible()
  })
})
