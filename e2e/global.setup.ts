import { chromium } from "@playwright/test"

export default async function globalSetup() {
  const browser = await chromium.launch()
  const page = await browser.newPage()

  // Get CSRF token from NextAuth
  await page.goto("http://localhost:3005/api/auth/csrf")
  const csrfBody = await page.evaluate(() => document.body.textContent)
  const csrfToken = JSON.parse(csrfBody || "{}").csrfToken

  if (!csrfToken) throw new Error("Could not get CSRF token")

  // POST to credentials callback directly
  await page.request.post("http://localhost:3005/api/auth/callback/credentials", {
    form: {
      csrfToken,
      email: "test@example.com",
      password: "test123",
      callbackUrl: "http://localhost:3005/",
      json: "true",
    },
  })

  // Navigate to dashboard so the cookie gets into browser context
  await page.goto("http://localhost:3005/")
  await page.waitForTimeout(3000)

  await page.context().storageState({ path: "e2e/.auth.json" })
  await browser.close()
}
