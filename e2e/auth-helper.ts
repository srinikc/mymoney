import { Page } from "@playwright/test"

export async function loginAsTestUser(page: Page) {
  await page.goto("/login", { waitUntil: "load", timeout: 30000 })
  await page.locator("#email").waitFor({ state: "visible", timeout: 20000 })
  await page.fill("#email", "test@example.com")
  await page.fill("#password", "test123")
  await page.getByRole("button", { name: "Sign in with Email" }).click()
  try {
    await page.waitForURL("/", { timeout: 20000 })
  } catch {
    // May already be on dashboard
  }
  await page.waitForLoadState("networkidle")
  await page.evaluate(() => localStorage.setItem("mymoney-tutorial-shown", "true"))
}
