import { chromium } from "@playwright/test"

export default async function globalSetup() {
  const browser = await chromium.launch()
  const page = await browser.newPage()
  await page.goto("http://localhost:3005/api/auth/test-login?email=test@example.com&name=Test%20User", { waitUntil: "networkidle" })
  await page.waitForTimeout(2000)
  await page.context().storageState({ path: "e2e/.auth.json" })
  await browser.close()
}
