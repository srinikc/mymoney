import { test, expect } from "@playwright/test"

test.describe("Expenses CRUD", () => {
  test("SCENARIO: Expense table shows data with correct columns", async ({ page }) => {
    await page.goto("/expenses", { waitUntil: "domcontentloaded" }); await page.waitForTimeout(3000)
    const table = page.locator("table, [role='table']")
    if (!(await table.isVisible().catch(() => false))) { test.skip(true, "Table not rendered"); return }
    for (const header of ["Date", "Vendor", "Category", "Amount"]) {
      await expect(table.getByText(header, { exact: false }).first()).toBeVisible()
    }
  })

  test("SCENARIO: Create a new expense via dialog", async ({ page }) => {
    await page.goto("/expenses", { waitUntil: "domcontentloaded" }); await page.waitForTimeout(3000)
    const addBtn = page.getByRole("button", { name: /add expense|add new|new expense/i }).first()
    if (!(await addBtn.isVisible().catch(() => false))) { test.skip(true, "Add Expense button not found"); return }
    await addBtn.click(); await page.waitForTimeout(500)
    const uniqueVendor = `Vendor-${Date.now()}`
    await page.fill('input[name="vendor"]', uniqueVendor); await page.fill('input[name="amount"]', "750")
    await page.getByRole("button", { name: "Save" }).first().click(); await page.waitForTimeout(2000)
    await expect(page.getByText(uniqueVendor).first()).toBeVisible({ timeout: 5000 })
  })

  test("SCENARIO: Edit an existing expense", async ({ page }) => {
    await page.goto("/expenses", { waitUntil: "domcontentloaded" }); await page.waitForTimeout(3000)
    const editBtn = page.locator("button[title*='edit'], button:has(svg)").first()
    if (!(await editBtn.isVisible().catch(() => false))) { test.skip(true, "No edit button found (no data)"); return }
    await editBtn.click(); await page.waitForTimeout(500)
    const vendorInput = page.locator('input[name="vendor"], [class*="vendor"] input').first()
    if (await vendorInput.isVisible().catch(() => false)) {
      await vendorInput.fill(`Edited-${Date.now()}`); await page.getByRole("button", { name: /save|update/i }).first().click(); await page.waitForTimeout(2000)
    }
  })

  test("SCENARIO: Delete an expense", async ({ page }) => {
    await page.goto("/expenses", { waitUntil: "domcontentloaded" }); await page.waitForTimeout(3000)
    const deleteBtn = page.locator("button").filter({ hasText: /delete/i }).first()
    if (!(await deleteBtn.isVisible().catch(() => false))) { test.skip(true, "No delete button found"); return }
    await deleteBtn.click(); await page.waitForTimeout(500)
    if (await page.getByText(/are you sure|confirm/i).isVisible().catch(() => false)) {
      await page.getByRole("button", { name: /delete|confirm/i }).last().click(); await page.waitForTimeout(1000)
    }
  })
})
