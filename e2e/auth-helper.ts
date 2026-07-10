import { Page } from "@playwright/test"

export async function loginAsTestUser(page: Page) {
  await page.goto("/api/auth/test-login")
  await page.waitForLoadState("domcontentloaded")
  await page.waitForTimeout(500)
}
