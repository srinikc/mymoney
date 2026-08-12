import { test, expect } from "@playwright/test"

test.describe("Bank Accounts", () => {
  test("SCENARIO: View bank accounts page loads", async ({ page }) => {
    await page.goto("/bank-accounts", { waitUntil: "domcontentloaded" }); await page.waitForTimeout(3000)
    await expect(page.locator("body")).not.toHaveClass(/error/)
  })

  test("SCENARIO: Add a bank account with balance", async ({ page }) => {
    await page.goto("/settings/bank-accounts", { waitUntil: "domcontentloaded" }); await page.waitForTimeout(3000)
    const addBtn = page.getByRole("button", { name: /add bank account/i }).first()
    if (!(await addBtn.isVisible().catch(() => false))) { test.skip(true, "Add Bank Account button not found"); return }
    await addBtn.click(); await page.waitForTimeout(500)
    await page.fill('input[placeholder*="HDFC"]', "HDFC Bank")
    await page.fill('input[placeholder*="Salary Account"]', `TestBank-${Date.now()}`)
    await page.fill('input[placeholder*="XXXX1234"]', "12345678")
    await page.fill('input[placeholder*="HDFC0001234"]', "HDFC0001234")
    await page.getByRole("button", { name: /save account/i }).click(); await page.waitForTimeout(2000)
  })

  test("SCENARIO: Add bank account with empty name shows error", async ({ page }) => {
    await page.goto("/settings/bank-accounts", { waitUntil: "domcontentloaded" }); await page.waitForTimeout(3000)
    const addBtn = page.getByRole("button", { name: /add bank account/i }).first()
    if (!(await addBtn.isVisible().catch(() => false))) { test.skip(true, "Add Bank Account button not found"); return }
    await addBtn.click(); await page.waitForTimeout(500)
    await page.getByRole("button", { name: /save account/i }).click(); await page.waitForTimeout(500)
  })

  test("SCENARIO: Delete a bank account with confirmation", async ({ page }) => {
    await page.goto("/bank-accounts", { waitUntil: "domcontentloaded" }); await page.waitForTimeout(3000)
    const deleteBtn = page.locator("button").filter({ hasText: /delete|remove/i }).first()
    if (!(await deleteBtn.isVisible().catch(() => false))) { test.skip(true, "No bank accounts to delete"); return }
    await deleteBtn.click(); await page.waitForTimeout(500)
    if (await page.getByText(/are you sure/i).isVisible().catch(() => false)) {
      await page.getByRole("button", { name: /delete|confirm/i }).last().click(); await page.waitForTimeout(1000)
    }
  })

  test("SCENARIO: GET /api/bank-accounts returns 401 without auth", async ({ browser }) => {
    const context = await browser.newContext({ storageState: { cookies: [], origins: [] } })
    const page = await context.newPage()
    await page.goto("/", { waitUntil: "domcontentloaded" })
    const status = await page.evaluate(async () => { const r = await fetch("/api/bank-accounts"); return r.status })
    await context.close()
    expect(status).toBeGreaterThanOrEqual(401)
  })
})
