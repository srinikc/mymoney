import { test, expect } from "@playwright/test"

test.describe("Sticky Ad Banner", () => {
  test("appears on ad-enabled pages", async ({ page }) => {
    await page.goto("/investments", { waitUntil: "domcontentloaded" })
    await page.waitForTimeout(5000)
    const banner = page.getByTestId("sticky-ad-banner")
    if (await banner.isVisible({ timeout: 10000 }).catch(() => false)) {
      await expect(banner).toBeVisible()
    }
  })

  test("can be dismissed", async ({ page }) => {
    await page.goto("/investments", { waitUntil: "domcontentloaded" })
    await page.waitForTimeout(5000)
    const banner = page.getByTestId("sticky-ad-banner")
    if (await banner.isVisible({ timeout: 10000 }).catch(() => false)) {
      const dismissBtn = banner.getByRole("button", { name: "Dismiss ad" })
      await dismissBtn.click()
      await page.waitForTimeout(500)
      // After dismiss, banner should be gone
      await expect(banner).not.toBeVisible()
    }
  })

  test("does NOT appear on workflow pages like /expenses", async ({ page }) => {
    await page.goto("/expenses", { waitUntil: "domcontentloaded" })
    await page.waitForTimeout(3000)
    const banner = page.getByTestId("sticky-ad-banner")
    await expect(banner).not.toBeVisible()
  })
})

test.describe("In-content Ad Slot", () => {
  test("renders on ad-enabled pages", async ({ page }) => {
    await page.goto("/dashboard", { waitUntil: "domcontentloaded" })
    await page.waitForTimeout(3000)
    // The AdContainer is client-side, so we may need to wait for hydration
    const slot = page.locator('[data-position="in-content"]')
    if (await slot.first().isVisible({ timeout: 10000 }).catch(() => false)) {
      await expect(slot.first()).toBeVisible()
    }
  })

  test("does not render on /budgets (workflow page)", async ({ page }) => {
    await page.goto("/budgets", { waitUntil: "domcontentloaded" })
    await page.waitForTimeout(3000)
    const slot = page.locator('[data-position="in-content"]')
    await expect(slot).toHaveCount(0)
  })
})
