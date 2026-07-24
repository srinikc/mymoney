import { Page } from "@playwright/test"

export async function loginAsTestUser(page: Page) {
  // Get CSRF token from NextAuth
  await page.goto("/api/auth/csrf")
  const csrfBody = await page.evaluate(() => document.body.textContent)
  const csrfToken = JSON.parse(csrfBody || "{}").csrfToken
  if (!csrfToken) throw new Error("Could not get CSRF token")

  // POST to credentials callback to set the session cookie
  await page.request.post("/api/auth/callback/credentials", {
    form: {
      csrfToken,
      email: "test@example.com",
      password: "test123",
      callbackUrl: "/",
      json: "true",
    },
  })

  await page.goto("/")
  await page.waitForLoadState("domcontentloaded")
  await page.waitForTimeout(1000)
}
