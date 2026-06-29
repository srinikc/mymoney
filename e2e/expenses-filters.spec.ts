import { test, expect } from "@playwright/test"

test.describe("Expenses Filters", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/expenses")
    await page.waitForLoadState("networkidle")
  })

  test("filter bar renders above the table, not inside table header", async ({ page }) => {
    const filterBar = page.getByTestId("filter-bar")
    await expect(filterBar).toBeVisible()

    const table = page.locator("table")
    await expect(table).toBeVisible()

    const filterBarBox = await filterBar.boundingBox()
    const tableBox = await table.boundingBox()

    expect(filterBarBox).not.toBeNull()
    expect(tableBox).not.toBeNull()
    expect(filterBarBox!.y + filterBarBox!.height).toBeLessThanOrEqual(tableBox!.y)
  })

  test("category filter is interactive", async ({ page }) => {
    const categorySelect = page.getByLabel("Category")
    await expect(categorySelect).toBeVisible()
    await categorySelect.click()
    await expect(categorySelect).toBeVisible()
    await page.keyboard.press("Escape")
  })

  test("vendor filter input is interactive", async ({ page }) => {
    const vendorInput = page.getByLabel("Vendor")
    await expect(vendorInput).toBeVisible()
    await vendorInput.fill("test-vendor")
    await expect(vendorInput).toHaveValue("test-vendor")
    await vendorInput.clear()
    await expect(vendorInput).toHaveValue("")
  })

  test("person filter is interactive", async ({ page }) => {
    const personSelect = page.getByLabel("Person")
    await expect(personSelect).toBeVisible()
    await personSelect.click()
    await expect(personSelect).toBeVisible()
    await page.keyboard.press("Escape")
  })

  test("clear all filters resets all to defaults", async ({ page }) => {
    const vendorInput = page.getByLabel("Vendor")
    await vendorInput.fill("some-vendor")
    await expect(vendorInput).toHaveValue("some-vendor")

    const amountMin = page.getByLabel("Amount-min")
    await amountMin.fill("100")
    await expect(amountMin).toHaveValue("100")

    const clearButton = page.getByRole("button", { name: /Clear/i })
    await expect(clearButton).toBeVisible()
    await clearButton.click()

    await expect(vendorInput).toHaveValue("")
    await expect(amountMin).toHaveValue("")
  })

  test("amount range filter is interactive", async ({ page }) => {
    const amountMin = page.getByLabel("Amount-min")
    const amountMax = page.getByLabel("Amount-max")

    await expect(amountMin).toBeVisible()
    await expect(amountMax).toBeVisible()

    await amountMin.fill("50")
    await amountMax.fill("500")

    await expect(amountMin).toHaveValue("50")
    await expect(amountMax).toHaveValue("500")
  })

  test("sub category filter input is interactive", async ({ page }) => {
    const subCatInput = page.getByLabel("Sub Cat")
    await expect(subCatInput).toBeVisible()
    await subCatInput.fill("test-sub")
    await expect(subCatInput).toHaveValue("test-sub")
    await subCatInput.clear()
    await expect(subCatInput).toHaveValue("")
  })

  test("mode filter is interactive", async ({ page }) => {
    const modeSelect = page.getByLabel("Mode")
    await expect(modeSelect).toBeVisible()
    await modeSelect.click()
    await expect(modeSelect).toBeVisible()
    await page.keyboard.press("Escape")
  })

  test("type filter is interactive", async ({ page }) => {
    const typeSelect = page.getByLabel("Type")
    await expect(typeSelect).toBeVisible()
    await typeSelect.click()
    await expect(typeSelect).toBeVisible()
    await page.keyboard.press("Escape")
  })
})
