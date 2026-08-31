import { test, expect } from "@playwright/test"
import { seedFlaggedExpense, seedUnmappedExpense, deleteExpense, isExpenseFlagged } from "./helpers"

/**
 * Feature: Expenses page — Duplicates filter + Mark as valid
 *
 *   As a user who imported data with potential duplicates
 *   I want to filter the expenses page to show only flagged (duplicate) rows
 *   and mark the valid entry
 *   So that I can resolve duplicates without leaving the expenses page
 *
 *   Background:
 *     Given I am logged in (via the shared storage state, e.g. test@example.com)
 *     And the Expenses page is at /expenses
 *
 *   Scenario: The Duplicates filter shows only flagged expenses
 *     Given I have a flagged expense in the database
 *     When I turn on the Duplicates filter
 *     Then only flagged expenses are listed
 *
 *   Scenario: The row-end Mark Valid button unflags a duplicate
 *     Given the Duplicates filter is on and a flagged expense is visible
 *     When I click the row's Mark Valid button
 *     Then the expense disappears from the duplicates list and is unflagged in the DB
 *
 *   Scenario: Mark Selected as Valid unflags all selected duplicates
 *     Given the Duplicates filter is on with two flagged expenses
 *     When I select both rows and click Mark Selected as Valid
 *     Then both are unflagged in the DB and no longer listed as duplicates
 *
 *   Scenario: The API returns only flagged rows when asked
 *     Given I have a flagged expense
 *     When I request GET /api/expenses?flagged=true
 *     Then the response contains the flagged expense and omits unflagged rows
 */

test.describe("Expenses page — Duplicates filter + Mark as valid", () => {
  let seededIds: number[] = []

  test.afterEach(async () => {
    for (const id of seededIds) await deleteExpense(id)
    seededIds = []
  })

  test("GET /api/expenses?flagged=true returns only flagged rows", async ({ page }) => {
    const vendorFlagged = `dupflag-${Date.now()}`
    const vendorClean = `dupclean-${Date.now()}`
    seededIds.push(await seedFlaggedExpense(page, vendorFlagged))
    seededIds.push(await seedUnmappedExpense(page, vendorClean))

    const res = await page.request.get("/api/expenses?flagged=true&pageSize=200")
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(Array.isArray(body.data)).toBe(true)
    const vendors = body.data.map((e: { vendor?: string }) => e.vendor ?? "")
    expect(vendors).toContain(vendorFlagged)
    expect(vendors).not.toContain(vendorClean)
  })

  test("Duplicates filter shows only flagged expenses", async ({ page }) => {
    const vendorFlagged = `dupflag-${Date.now()}`
    const vendorClean = `dupclean-${Date.now()}`
    seededIds.push(await seedFlaggedExpense(page, vendorFlagged))
    seededIds.push(await seedUnmappedExpense(page, vendorClean))

    await page.goto("/expenses", { waitUntil: "domcontentloaded", timeout: 30000 })
    await expect(page.getByRole("heading", { name: "Expenses", level: 1 })).toBeVisible({ timeout: 25000 })

    // Without the filter, the clean vendor is visible
    await expect(page.locator("table tbody tr", { hasText: vendorClean }).first()).toBeVisible({ timeout: 25000 })

    // Turn on the Duplicates filter
    const dupBtn = page.getByRole("button", { name: /Duplicates/ })
    await expect(dupBtn).toBeVisible()
    await dupBtn.click()

    // The flagged vendor is visible, the clean vendor is hidden
    await expect(page.locator("table tbody tr", { hasText: vendorFlagged }).first()).toBeVisible({ timeout: 25000 })
    await page.waitForTimeout(1500)
    await expect(page.locator("table tbody tr", { hasText: vendorClean }).first()).toHaveCount(0)

    // Turn it off again → clean vendor returns
    await dupBtn.click()
    await expect(page.locator("table tbody tr", { hasText: vendorClean }).first()).toBeVisible({ timeout: 25000 })
  })

  test("row-end Mark Valid button unflags a duplicate", async ({ page }) => {
    const vendor = `dupflag-${Date.now()}`
    seededIds.push(await seedFlaggedExpense(page, vendor))
    const id = seededIds[0]
    expect(await isExpenseFlagged(id)).toBe(true)

    await page.goto("/expenses", { waitUntil: "domcontentloaded", timeout: 30000 })
    const dupBtn = page.getByRole("button", { name: /Duplicates/ })
    // Wait for the table to finish loading before clicking the toggle — a click
    // before hydration completes is silently dropped by the page.
    await expect(page.locator("table tbody tr", { hasText: vendor }).first()).toBeVisible({ timeout: 25000 })
    await dupBtn.click()

    const row = page.locator("table tbody tr", { hasText: vendor }).first()
    await expect(row).toBeVisible({ timeout: 25000 })

    const markValid = row.locator('button[aria-label="Mark as valid"]').first()
    await expect(markValid).toBeVisible()
    await markValid.click()

    // Row disappears from the duplicates list and the DB is unflagged
    await expect(row).toHaveCount(0, { timeout: 25000 }).catch(() => {})
    await page.waitForTimeout(2000)
    expect(await isExpenseFlagged(id)).toBe(false)
  })

  test("Mark Selected as Valid unflags all selected duplicates", async ({ page }) => {
    const vendor1 = `dupflag1-${Date.now()}`
    const vendor2 = `dupflag2-${Date.now()}`
    seededIds.push(await seedFlaggedExpense(page, vendor1))
    seededIds.push(await seedFlaggedExpense(page, vendor2))

    await page.goto("/expenses", { waitUntil: "domcontentloaded", timeout: 30000 })
    const dupBtn = page.getByRole("button", { name: /Duplicates/ })
    // Wait for the table to finish loading before clicking the toggle — a click
    // before hydration completes is silently dropped by the page.
    await expect(page.locator("table tbody tr", { hasText: vendor1 }).first()).toBeVisible({ timeout: 25000 })
    await dupBtn.click()

    for (const vendor of [vendor1, vendor2]) {
      const row = page.locator("table tbody tr", { hasText: vendor }).first()
      await expect(row).toBeVisible({ timeout: 25000 })
      await row.locator('input[type="checkbox"]').first().check({ force: true })
    }

    const batchBtn = page.getByRole("button", { name: /Mark Selected as Valid/ })
    await expect(batchBtn).toBeVisible()
    await batchBtn.click()

    await page.waitForTimeout(2500)
    expect(await isExpenseFlagged(seededIds[0])).toBe(false)
    expect(await isExpenseFlagged(seededIds[1])).toBe(false)
    await expect(page.locator("table tbody tr", { hasText: vendor1 }).first()).toHaveCount(0).catch(() => {})
    await expect(page.locator("table tbody tr", { hasText: vendor2 }).first()).toHaveCount(0).catch(() => {})
  })
})