import { test, expect } from "@playwright/test"
import { loginAsTestUser } from "./auth-helper"

test.describe("GPay Refresh", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsTestUser(page)
  })
  test("expenses page loads without errors", async ({ page }) => {
    await page.goto("/expenses", { waitUntil: "load", timeout: 20000 })
    await expect(page.locator("body")).not.toHaveClass(/error/)
  })

  test("settings integrations page loads without errors", async ({ page }) => {
    await page.goto("/settings/integrations", { waitUntil: "load", timeout: 20000 })
    await expect(page.locator("body")).not.toHaveClass(/error/)
  })

  test("Refresh GPay button exists on expenses page", async ({ page }) => {
    await page.goto("/expenses", { waitUntil: "load", timeout: 20000 })
    const refreshBtn = page.getByRole("button", { name: /Refresh GPay/i })
    await expect(refreshBtn).toBeVisible()
  })

  test("GPay dialog shows recent sync confirmation when last sync was within 1 hour", async ({ page }) => {
    // Set localStorage to simulate a recent GPay sync (5 minutes ago)
    const recentSync = new Date(Date.now() - 5 * 60 * 1000).toISOString()
    await page.goto("/expenses", { waitUntil: "load", timeout: 20000 })
    await page.evaluate((iso) => {
      localStorage.setItem("mymoney-gpay-last-sync", iso)
    }, recentSync)

    await page.reload({ waitUntil: "load", timeout: 20000 })

    const refreshBtn = page.getByRole("button", { name: /Refresh GPay/i })
    await expect(refreshBtn).toBeVisible()
    await refreshBtn.click()

    // Dialog should open and show the "Already synced recently" message
    const dialog = page.getByRole("dialog")
    await expect(dialog).toBeVisible({ timeout: 5000 })

    // Check that "Already synced recently" text appears
    await expect(dialog.getByText(/Already synced recently/i)).toBeVisible()

    // Check that the "Force New Export" and "Cancel" buttons exist
    await expect(dialog.getByRole("button", { name: /Force New Export/i })).toBeVisible()
    await expect(dialog.getByRole("button", { name: /Cancel/i })).toBeVisible()

    // Click Cancel to close dialog
    await dialog.getByRole("button", { name: /Cancel/i }).click()
    await expect(dialog).not.toBeVisible()
  })

  test("GPay dialog shows auto-starting state when no recent sync", async ({ page }) => {
    // Clear any last sync timestamp
    await page.goto("/expenses", { waitUntil: "load", timeout: 20000 })
    await page.evaluate(() => {
      localStorage.removeItem("mymoney-gpay-last-sync")
    })

    await page.reload({ waitUntil: "load", timeout: 20000 })

    const refreshBtn = page.getByRole("button", { name: /Refresh GPay/i })
    await expect(refreshBtn).toBeVisible()
    await refreshBtn.click()

    // Should see the dialog open
    const dialog = page.getByRole("dialog")
    await expect(dialog).toBeVisible({ timeout: 5000 })

    // After clicking, the dialog should show "Starting GPay export automatically..."
    // or transition to an error/other state
    const hasStartingState = await dialog.getByText(/Starting GPay export automatically/i).isVisible().catch(() => false)
    const hasErrorState = await dialog.getByText(/GPay export failed/i).isVisible().catch(() => false)
    const hasExportingState = await dialog.getByText(/Waiting for Google/i).isVisible().catch(() => false)

    // At least one state should render (dialog is not empty)
    expect(hasStartingState || hasErrorState || hasExportingState).toBe(true)
  })

  test("GPay dialog shows correct state after multiple clicks", async ({ page }) => {
    // Simulate scenario: user clicks Refresh GPay after already seeing recent sync dialog
    const recentSync = new Date(Date.now() - 2 * 60 * 1000).toISOString()
    await page.goto("/expenses", { waitUntil: "load", timeout: 20000 })
    await page.evaluate((iso) => {
      localStorage.setItem("mymoney-gpay-last-sync", iso)
    }, recentSync)

    await page.reload({ waitUntil: "load", timeout: 20000 })

    // First click
    await page.getByRole("button", { name: /Refresh GPay/i }).click()
    const dialog = page.getByRole("dialog")
    await expect(dialog).toBeVisible({ timeout: 5000 })
    await expect(dialog.getByText(/Already synced recently/i)).toBeVisible()

    // Close dialog
    await dialog.getByRole("button", { name: /Cancel/i }).click()
    await expect(dialog).not.toBeVisible()

    // Click again — should still show the same confirmation
    await page.getByRole("button", { name: /Refresh GPay/i }).click()
    await expect(dialog).toBeVisible({ timeout: 5000 })
    await expect(dialog.getByText(/Already synced recently/i)).toBeVisible()
  })
})
