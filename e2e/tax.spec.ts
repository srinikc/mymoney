import { test, expect } from "@playwright/test"

test.describe("P5 — Tax Section", () => {

  test("SCENARIO: View empty income tab", async ({ page }) => {
    await page.goto("/tax", { waitUntil: "domcontentloaded" })
    await page.waitForTimeout(3000)
    await expect(page.locator("h1")).toContainText("Tax")
  })

  test("SCENARIO: Four tabs are displayed", async ({ page }) => {
    await page.goto("/tax", { waitUntil: "domcontentloaded" })
    await page.waitForTimeout(3000)
    await expect(page.getByRole("button", { name: "Income & Deductions" })).toBeVisible()
    await expect(page.getByRole("button", { name: "Documents" })).toBeVisible()
    await expect(page.getByRole("button", { name: "ITR Filings" })).toBeVisible()
    await expect(page.getByRole("button", { name: "Projections" })).toBeVisible()
  })

  test("SCENARIO: FY selector changes tabs", async ({ page }) => {
    await page.goto("/tax", { waitUntil: "domcontentloaded" })
    await page.waitForTimeout(3000)
    const select = page.locator("button").filter({ hasText: /FY/ }).first()
    await select.click()
    await page.waitForTimeout(500)
    await page.getByLabel("FY 2024-25").click()
    await page.waitForTimeout(500)
  })

  test("SCENARIO: Upload dialog opens and cancels", async ({ page }) => {
    await page.goto("/tax", { waitUntil: "domcontentloaded" })
    await page.waitForTimeout(3000)
    await page.getByRole("button", { name: "Documents" }).click()
    await page.waitForTimeout(500)
    await page.getByRole("button", { name: "Upload Document" }).click()
    await page.waitForTimeout(500)
    await page.getByRole("button", { name: "Cancel" }).click()
    await page.waitForTimeout(500)
    await expect(page.getByRole("button", { name: "Upload Document" })).toBeVisible()
  })

  test("SCENARIO: View empty ITR filings tab", async ({ page }) => {
    await page.goto("/tax", { waitUntil: "domcontentloaded" })
    await page.waitForTimeout(3000)
    await page.getByRole("button", { name: "ITR Filings" }).click()
    await page.waitForTimeout(500)
    await expect(page.getByRole("button", { name: "Add ITR Record" })).toBeVisible()
  })

  test("SCENARIO: Create an ITR record dialog opens and can be cancelled", async ({ page }) => {
    await page.goto("/tax", { waitUntil: "domcontentloaded" })
    await page.waitForTimeout(3000)
    await page.getByRole("button", { name: "ITR Filings" }).click()
    await page.waitForTimeout(500)
    await page.getByRole("button", { name: "Add ITR Record" }).click()
    await page.waitForTimeout(500)
    await expect(page.getByText("Add ITR Record").first()).toBeVisible()
    await page.locator("button").filter({ hasText: "Cancel" }).click()
    await page.waitForTimeout(500)
    await expect(page.getByRole("button", { name: "Add ITR Record" })).toBeVisible()
  })

  test("SCENARIO: View projections tab", async ({ page }) => {
    await page.goto("/tax", { waitUntil: "domcontentloaded" })
    await page.waitForTimeout(3000)
    await page.getByRole("button", { name: "Projections" }).click()
    await page.waitForTimeout(1000)
    await expect(page.getByText(/Add income sources|projected annual/i).first()).toBeVisible()
  })

  test("SCENARIO: Delete an ITR record with confirmation", async ({ page }) => {
    await page.goto("/tax", { waitUntil: "domcontentloaded" })
    await page.waitForTimeout(3000)
    await page.getByRole("button", { name: "ITR Filings" }).click()
    await page.waitForTimeout(1000)
    const deleteButtons = page.locator("button.text-red-500")
    const count = await deleteButtons.count()
    if (count === 0) {
      test.skip(true, "No ITR records to delete — create one first")
      return
    }
    await deleteButtons.first().click()
    await page.waitForTimeout(500)
    await page.getByRole("button", { name: "Delete" }).last().click()
    await page.waitForTimeout(1000)
  })
})
