import { test, expect } from "@playwright/test"

test.describe("Ad Preferences Settings Page", () => {
  test("page loads at /settings/privacy", async ({ page }) => {
    await page.goto("/settings/privacy", { waitUntil: "domcontentloaded" })
    await page.waitForTimeout(3000)
    await expect(page.getByRole("heading", { name: /Privacy.*Ad Preferences/i })).toBeVisible({ timeout: 10000 })
  })

  test("shows toggle for personalized recs", async ({ page }) => {
    await page.goto("/settings/privacy", { waitUntil: "domcontentloaded" })
    await page.waitForTimeout(3000)
    const toggle = page.getByTestId("toggle-personalized-recs")
    await expect(toggle).toBeVisible({ timeout: 10000 })
  })

  test("shows toggle for display ads", async ({ page }) => {
    await page.goto("/settings/privacy", { waitUntil: "domcontentloaded" })
    await page.waitForTimeout(3000)
    const toggle = page.getByTestId("toggle-display-ads")
    await expect(toggle).toBeVisible({ timeout: 10000 })
  })

  test("shows toggle for personalized targeting", async ({ page }) => {
    await page.goto("/settings/privacy", { waitUntil: "domcontentloaded" })
    await page.waitForTimeout(3000)
    const toggle = page.getByTestId("toggle-personalized-targeting")
    await expect(toggle).toBeVisible({ timeout: 10000 })
  })

  test("has save preferences button", async ({ page }) => {
    await page.goto("/settings/privacy", { waitUntil: "domcontentloaded" })
    await page.waitForTimeout(3000)
    const saveBtn = page.getByTestId("save-prefs")
    await expect(saveBtn).toBeVisible({ timeout: 10000 })
  })
})
