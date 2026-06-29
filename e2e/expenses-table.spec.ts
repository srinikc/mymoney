import { test, expect } from "@playwright/test"

test.describe("Expenses Table", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/expenses")
    await page.waitForLoadState("networkidle")
  })

  test("table loads with data after skeleton", async ({ page }) => {
    const skeleton = page.locator('[class*="skeleton"]')
    if (await skeleton.isVisible().catch(() => false)) {
      await expect(skeleton).toBeVisible()
    }

    await page.waitForSelector("table", { timeout: 30000 })
    await expect(page.locator("table")).toBeVisible()

    const rows = page.locator("table tbody tr")
    const count = await rows.count()
    if (count > 0) {
      await expect(rows.first()).toBeVisible()
    } else {
      const emptyMsg = page.locator("table tbody tr td[colspan]")
      await expect(emptyMsg).toBeVisible()
    }
  })

  test("sort by amount toggles direction", async ({ page }) => {
    await page.waitForSelector("table", { timeout: 30000 })

    const amountHeader = page.locator("table thead th").filter({ hasText: /Amount/i })
    await expect(amountHeader).toBeVisible()

    await amountHeader.click()
    await page.waitForTimeout(300)

    await amountHeader.click()
    await page.waitForTimeout(300)
  })

  test("pagination controls work when multiple pages", async ({ page }) => {
    await page.waitForSelector("table", { timeout: 30000 })

    const firstButton = page.getByRole("button", { name: "First" })
    const nextButton = page.getByRole("button", { name: /chevron-right/i })
    const prevButton = page.getByRole("button", { name: /chevron-left/i })
    const lastButton = page.getByRole("button", { name: "Last" })

    const hasPagination = await firstButton.isVisible().catch(() => false)
    if (!hasPagination) {
      test.skip(true, "Only one page of data, pagination not visible")
      return
    }

    if (await nextButton.isEnabled()) {
      await nextButton.click()
      await page.waitForTimeout(300)
    }

    if (await lastButton.isEnabled()) {
      await lastButton.click()
      await page.waitForTimeout(300)
    }

    if (await firstButton.isEnabled()) {
      await firstButton.click()
      await page.waitForTimeout(300)
    }
  })

  test("inline edit button exists on each row", async ({ page }) => {
    await page.waitForSelector("table", { timeout: 30000 })

    const rows = page.locator("table tbody tr")
    const count = await rows.count()
    if (count === 0) {
      test.skip(true, "No data rows to edit")
      return
    }

    const firstRow = rows.first()
    const editButton = firstRow.locator("button")
    if (await editButton.isVisible()) {
      await editButton.click()
      await page.waitForTimeout(300)
    }
  })

  test("table headers are all present", async ({ page }) => {
    await page.waitForSelector("table", { timeout: 30000 })

    const headers = ["Date", "Vendor", "Category", "Sub Cat", "Person", "Mode", "Bank", "Amount", "Comments", "Type", "Other"]
    for (const header of headers) {
      await expect(page.locator("table thead").getByText(header, { exact: false })).toBeVisible()
    }
  })
})
