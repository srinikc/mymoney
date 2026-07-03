import { test, expect } from "@playwright/test"

test.describe("Expenses Filters", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/expenses", { waitUntil: "load", timeout: 20000 })
    await page.waitForLoadState("networkidle")
  })

  test("filter bar renders above the transactions section", async ({ page }) => {
    const filterBar = page.getByTestId("filter-bar")
    await expect(filterBar).toBeVisible()

    const transactionsHeading = page.locator("h3", { hasText: "Transactions" })
    await expect(transactionsHeading).toBeVisible()

    const filterBarBox = await filterBar.boundingBox()
    const headingBox = await transactionsHeading.boundingBox()

    expect(filterBarBox).not.toBeNull()
    expect(headingBox).not.toBeNull()
    expect(filterBarBox!.y + filterBarBox!.height).toBeLessThanOrEqual(headingBox!.y)
  })

  test("category filter is interactive", async ({ page }) => {
    const categorySelect = page.getByLabel("Category")
    await expect(categorySelect).toBeVisible()
    await categorySelect.click()
    await page.keyboard.press("Escape")
  })

  test("vendor filter is interactive", async ({ page }) => {
    const vendorSelect = page.getByLabel("Vendor")
    await expect(vendorSelect).toBeVisible()
    await vendorSelect.click()
    await page.keyboard.press("Escape")
  })

  test("person filter is interactive", async ({ page }) => {
    const personSelect = page.getByLabel("Person")
    await expect(personSelect).toBeVisible()
    await personSelect.click()
    await page.keyboard.press("Escape")
  })

  test("clear all filters resets all to defaults", async ({ page }) => {
    const amountMin = page.getByLabel("Amount-min")
    await amountMin.fill("100")
    await expect(amountMin).toHaveValue("100")

    const clearButton = page.getByRole("button", { name: /clear/i })
    await expect(clearButton).toBeVisible()
    await clearButton.click()

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

  test("sub category filter is interactive", async ({ page }) => {
    const subCatSelect = page.getByLabel("Sub-Cat")
    await expect(subCatSelect).toBeVisible()
    await subCatSelect.click()
    await page.keyboard.press("Escape")
  })

  test("mode filter is interactive", async ({ page }) => {
    const modeSelect = page.getByLabel("Mode")
    await expect(modeSelect).toBeVisible()
    await modeSelect.click()
    await page.keyboard.press("Escape")
  })

  test("type filter is interactive", async ({ page }) => {
    const typeSelect = page.getByLabel("Type")
    await expect(typeSelect).toBeVisible()
    await typeSelect.click()
    await page.keyboard.press("Escape")
  })
})
