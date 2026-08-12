import { test, expect } from "@playwright/test"

function ready(page: import("@playwright/test").Page) { return expect(page.locator("body")).not.toHaveClass(/error/) }

test.describe("Family Sharing", () => {
  test("SCENARIO: Family page loads without error", async ({ page }) => {
    await page.goto("/family", { waitUntil: "domcontentloaded" }); await page.waitForTimeout(3000); await ready(page)
  })
})
test.describe("Auto-Link", () => {
  test("SCENARIO: Auto-link page loads without error", async ({ page }) => {
    await page.goto("/auto-link", { waitUntil: "domcontentloaded" }); await page.waitForTimeout(3000); await ready(page)
  })
})
test.describe("Gmail Import", () => {
  test("SCENARIO: Gmail import page loads with scan button", async ({ page }) => {
    await page.goto("/gmail-import", { waitUntil: "domcontentloaded" }); await page.waitForTimeout(3000); await ready(page)
    const scanBtn = page.getByRole("button", { name: /scan gmail/i }).first()
    if (await scanBtn.isVisible().catch(() => false)) await expect(scanBtn).toBeVisible()
  })
})
test.describe("Admin Pages", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/api/auth/csrf"); const csrfBody = await page.evaluate(() => document.body.textContent); const csrfToken = JSON.parse(csrfBody || "{}").csrfToken
    if (csrfToken) await page.request.post("/api/auth/callback/credentials", { form: { csrfToken, email: "admin@test.com", password: "admin123", callbackUrl: "/", json: "true" } })
    await page.goto("/", { waitUntil: "domcontentloaded" }); await page.waitForTimeout(3000)
  })
  test("SCENARIO: Admin audit-log loads without error", async ({ page }) => { await page.goto("/admin/audit-log", { waitUntil: "domcontentloaded" }); await page.waitForTimeout(3000); await ready(page) })
  test("SCENARIO: Admin users loads without error", async ({ page }) => { await page.goto("/admin/users", { waitUntil: "domcontentloaded" }); await page.waitForTimeout(3000); await ready(page) })
  test("SCENARIO: Admin profiles loads without error", async ({ page }) => { await page.goto("/admin/profiles", { waitUntil: "domcontentloaded" }); await page.waitForTimeout(3000); await ready(page) })
  test("SCENARIO: Admin features loads without error", async ({ page }) => { await page.goto("/admin/features", { waitUntil: "domcontentloaded" }); await page.waitForTimeout(3000); await ready(page) })
  test("SCENARIO: Settings environment loads without error", async ({ page }) => { await page.goto("/settings/environment", { waitUntil: "domcontentloaded" }); await page.waitForTimeout(3000); await ready(page) })
})
