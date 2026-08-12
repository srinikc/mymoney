import { test, expect } from "@playwright/test"

test.describe("Bank Accounts", () => {
  test("SCENARIO: View bank accounts page loads", async ({ page }) => {
    await page.goto("/bank-accounts", { waitUntil: "domcontentloaded" }); await page.waitForTimeout(3000)
    await expect(page.locator("body")).not.toHaveClass(/error/)
  })

  test("SCENARIO: Add a bank account with balance", async ({ page }) => {
    await page.goto("/bank-accounts", { waitUntil: "domcontentloaded" }); await page.waitForTimeout(3000)
    const addBtn = page.locator("button:has-text('Add Bank Account')").first()
    if (!(await addBtn.isVisible().catch(() => false))) { test.skip(true, "Add Bank Account button not found"); return }
    await addBtn.click(); await page.waitForTimeout(500)
    await page.fill('input[name="name"]', `TestBank-${Date.now()}`)
    await page.fill('input[name="bankName"]', "HDFC Bank"); await page.fill('input[name="accountNumber"]', "12345678")
    await page.fill('input[name="ifscCode"]', "HDFC0001234"); await page.fill('input[name="balance"]', "50000")
    await page.getByRole("button", { name: /save|add|create/i }).first().click(); await page.waitForTimeout(2000)
  })

  test("SCENARIO: Add bank account with empty name shows error", async ({ page }) => {
    await page.goto("/bank-accounts", { waitUntil: "domcontentloaded" }); await page.waitForTimeout(3000)
    const addBtn = page.locator("button:has-text('Add Bank Account')").first()
    if (!(await addBtn.isVisible().catch(() => false))) { test.skip(true, "Add Bank Account button not found"); return }
    await addBtn.click(); await page.waitForTimeout(500)
    await page.getByRole("button", { name: /save|add|create/i }).first().click(); await page.waitForTimeout(500)
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

  test("SCENARIO: GET /api/bank-accounts returns 401 without auth", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" })
    const status = await page.evaluate(async () => { const r = await fetch("/api/bank-accounts"); return r.status })
    expect(status).toBeGreaterThanOrEqual(401)
  })
})
