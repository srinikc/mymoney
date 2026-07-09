import { test, expect } from "@playwright/test"
import { loginAsTestUser } from "./auth-helper"

test.describe("Income Sources", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsTestUser(page)
    await page.goto("/income")
    await page.waitForLoadState("networkidle")
  })

  test("income page renders heading and add button", async ({ page }) => {
    await expect(page.getByRole("heading", { name: "Income Sources" })).toBeVisible()
    await expect(page.getByText("Add Income")).toBeVisible()
  })

  test("income page shows retry button when API fails", async ({ page }) => {
    const retryBtn = page.getByRole("button", { name: /retry/i })
    await expect(retryBtn).toBeVisible({ timeout: 10000 })
  })
})
