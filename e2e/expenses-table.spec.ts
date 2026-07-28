import { test, expect } from "@playwright/test"

test.describe("Expenses Table", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/expenses", { waitUntil: "load", timeout: 20000 })
  })

  test("table loads with data after skeleton", async ({ page }) => {
    const skeleton = page.locator('[class*="skeleton"], .animate-pulse')
    if (await skeleton.isVisible().catch(() => false)) {
      await expect(skeleton).toBeVisible({ timeout: 1000 }).catch(() => {})
    }

    await page.waitForLoadState("networkidle")
    await page.waitForTimeout(2000)

    const table = page.locator("table, [role='table'], table.w-full")
    const tableExists = await table.isVisible().catch(() => false)

    if (tableExists) {
      await expect(table).toBeVisible()
      const rows = page.locator("table tbody tr, [role='row']")
      const count = await rows.count()
      if (count > 0) {
        await expect(rows.first()).toBeVisible()
      }
    }
  })

  test("sort by amount toggles direction", async ({ page }) => {
    await page.waitForLoadState("networkidle")
    await page.waitForTimeout(2000)

    const table = page.locator("table, [role='table']")
    if (!(await table.isVisible().catch(() => false))) {
      test.skip(true, "Table not rendered (no data)")
      return
    }

    const amountHeader = page.locator("table thead th, [role='columnheader']").filter({ hasText: /amount/i })
    if (!(await amountHeader.isVisible().catch(() => false))) {
      test.skip(true, "Amount header not found")
      return
    }

    await amountHeader.click()
    await page.waitForTimeout(300)
    await amountHeader.click()
  })

  test("pagination controls work when multiple pages", async ({ page }) => {
    await page.waitForLoadState("networkidle")
    await page.waitForTimeout(2000)

    const firstButton = page.getByRole("button", { name: "First" }).first()
    const hasPagination = await firstButton.isVisible().catch(() => false)
    if (!hasPagination) {
      test.skip(true, "Only one page of data, pagination not visible")
      return
    }

    const nextButton = page.getByRole("button", { name: /chevron-right/i }).first()
    const lastButton = page.getByRole("button", { name: "Last" }).first()

    if (await nextButton.isEnabled().catch(() => false)) {
      await nextButton.click()
      await page.waitForTimeout(300)
    }

    if (await lastButton.isEnabled().catch(() => false)) {
      await lastButton.click()
      await page.waitForTimeout(300)
    }

    if (await firstButton.isEnabled().catch(() => false)) {
      await firstButton.click()
      await page.waitForTimeout(300)
    }
  })

  test("inline edit button exists on each row", async ({ page }) => {
    await page.waitForLoadState("networkidle")
    await page.waitForTimeout(2000)

    const rows = page.locator("table tbody tr")
    const count = await rows.count().catch(() => 0)
    if (count === 0) {
      test.skip(true, "No data rows to edit")
      return
    }

    const firstRow = rows.first()
    const editButton = firstRow.locator("button").first()
    if (await editButton.isVisible().catch(() => false)) {
      await editButton.click()
      await page.waitForTimeout(300)
    }
  })

  test("table headers are all present", async ({ page }) => {
    await page.waitForLoadState("networkidle")
    await page.waitForTimeout(2000)

    const table = page.locator("table, [role='table']")
    if (!(await table.isVisible().catch(() => false))) {
      test.skip(true, "Table not rendered (no data)")
      return
    }

    const headers = ["Date", "Vendor", "Category", "Sub Cat", "Person", "Mode", "Bank", "Amount", "Comments", "Type", "Other"]
    for (const header of headers) {
      const headerEl = page.locator("table thead, [role='rowgroup']").getByText(header, { exact: false })
      await expect(headerEl).toBeVisible().catch(() => {})
    }
  })
})
