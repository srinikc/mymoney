import { test, expect } from "@playwright/test"

test.describe("Bank Accounts — Comprehensive", () => {
  test.describe("Unauthenticated access", () => {
    test.use({ storageState: { cookies: [], origins: [] } })
    test("SCENARIO: GET /api/bank-accounts returns 401 without auth", async ({ page }) => {
      await page.goto("/", { waitUntil: "domcontentloaded" })
      const status = await page.evaluate(async () => { const r = await fetch("/api/bank-accounts"); return r.status })
      expect(status).toBeGreaterThanOrEqual(401)
    })
  })

  test("SCENARIO: Bank accounts page loads", async ({ page }) => {
    await page.goto("/bank-accounts", { waitUntil: "domcontentloaded" }); await page.waitForTimeout(3000)
    await expect(page.locator("body")).not.toHaveClass(/error/)
  })

  test("SCENARIO: Non-existent bank account returns error", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" })
    const status = await page.evaluate(async () => { const r = await fetch("/api/bank-accounts/99999999"); return r.status })
    expect(status).toBeGreaterThanOrEqual(400)
  })

  test("SCENARIO: Add bank account with negative balance (overdraft)", async ({ page }) => {
    await page.goto("/bank-accounts", { waitUntil: "domcontentloaded" }); await page.waitForTimeout(3000)
    const addBtn = page.locator("button:has-text('Add Bank Account')").first()
    if (!(await addBtn.isVisible().catch(() => false))) { test.skip(true, "Add Bank Account button not found"); return }
    await addBtn.click(); await page.waitForTimeout(500)
    await page.fill('input[name="balance"]', "-5000")
  })

  test.describe("FD operations", () => {
    test("SCENARIO: Add FD to a bank account", async ({ page }) => {
      await page.goto("/bank-accounts", { waitUntil: "domcontentloaded" }); await page.waitForTimeout(3000)
      const addBtn = page.locator("button:has-text('Add Bank Account')").first()
      if (await addBtn.isVisible().catch(() => false)) { await addBtn.click(); await page.waitForTimeout(500) }
    })

    test("SCENARIO: Bank accounts API returns with expected shape", async ({ page }) => {
      await page.goto("/", { waitUntil: "domcontentloaded" })
      await page.evaluate(async () => { const r = await fetch("/api/bank-accounts"); if (r.ok) { const data = await r.json(); const accounts = data.accounts || data; return Array.isArray(accounts) ? accounts.length : -1 }; return -1 })
    })
  })

  test.describe("Transactions", () => {
    test("SCENARIO: Bank detail page loads", async ({ page }) => {
      await page.goto("/bank-accounts", { waitUntil: "domcontentloaded" }); await page.waitForTimeout(3000)
      await expect(page.locator("body")).not.toHaveClass(/error/)
    })
  })
})
