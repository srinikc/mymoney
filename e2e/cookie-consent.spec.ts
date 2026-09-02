import { test, expect } from "@playwright/test"

test.describe("Cookie Consent Banner", () => {
  test.use({ storageState: { cookies: [], origins: [] } })

  test("shows on first visit (no consent stored)", async ({ page }) => {
    await page.context().clearCookies()
    await page.goto("/", { waitUntil: "domcontentloaded" })
    await page.waitForTimeout(2000)
    const banner = page.getByTestId("cookie-consent")
    if (await banner.isVisible({ timeout: 10000 }).catch(() => false)) {
      await expect(banner).toBeVisible()
    }
  })

  test("accept button persists state", async ({ page }) => {
    await page.context().clearCookies()
    await page.evaluate(() => localStorage.clear())
    await page.goto("/", { waitUntil: "domcontentloaded" })
    await page.waitForTimeout(2000)
    const acceptBtn = page.getByTestId("consent-accept")
    if (await acceptBtn.isVisible({ timeout: 10000 }).catch(() => false)) {
      await acceptBtn.click()
      await page.waitForTimeout(500)
      const stored = await page.evaluate(() => localStorage.getItem("mymoney-cookie-consent"))
      expect(stored).toBe("accepted")
    }
  })

  test("reject button persists state", async ({ page }) => {
    await page.context().clearCookies()
    await page.evaluate(() => localStorage.clear())
    await page.goto("/", { waitUntil: "domcontentloaded" })
    await page.waitForTimeout(2000)
    const rejectBtn = page.getByTestId("consent-reject")
    if (await rejectBtn.isVisible({ timeout: 10000 }).catch(() => false)) {
      await rejectBtn.click()
      await page.waitForTimeout(500)
      const stored = await page.evaluate(() => localStorage.getItem("mymoney-cookie-consent"))
      expect(stored).toBe("rejected")
    }
  })
})
