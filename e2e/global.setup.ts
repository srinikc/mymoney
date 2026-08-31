import { chromium } from "@playwright/test"
import { execSync } from "node:child_process"

const TEST_DB_URL =
  process.env.TEST_DATABASE_URL ||
  process.env.E2E_DATABASE_URL ||
  "postgresql://postgres:password@localhost:5432/mymoney_test?schema=public"
const BASE_URL = process.env.E2E_BASE_URL || "http://localhost:3100"

export default async function globalSetup() {
  // Reset + seed the dedicated TEST database so every run starts from a known
  // state. The dev/prod `mymoney` database is never touched.
  console.log("[e2e] resetting & seeding TEST database...")
  execSync("npx prisma db push --skip-generate", {
    env: { ...process.env, DATABASE_URL: TEST_DB_URL },
    stdio: "inherit",
  })
  execSync("npx tsx prisma/seed-test.ts", {
    env: { ...process.env, DATABASE_URL: TEST_DB_URL },
    stdio: "inherit",
  })

  const browser = await chromium.launch()
  const page = await browser.newPage()
  page.setDefaultTimeout(120_000)

  // Get CSRF token from NextAuth
  await page.goto(`${BASE_URL}/api/auth/csrf`)
  const csrfBody = await page.evaluate(() => document.body.textContent)
  const csrfToken = JSON.parse(csrfBody || "{}").csrfToken

  if (!csrfToken) throw new Error("Could not get CSRF token")

  // POST to credentials callback directly. maxRedirects:0 returns at the 302
  // (which sets the session cookie) without following the redirect to the
  // dashboard — the first compile of the freshly started server is slow.
  await page.request.post(`${BASE_URL}/api/auth/callback/credentials`, {
    form: {
      csrfToken,
      email: "test@example.com",
      password: "test123",
      callbackUrl: `${BASE_URL}/`,
      json: "true",
    },
    maxRedirects: 0,
  })

  // Navigate to dashboard so the cookie gets into browser context
  await page.goto(`${BASE_URL}/`, { waitUntil: "domcontentloaded" })
  await page.waitForTimeout(3000)

  await page.context().storageState({ path: "e2e/.auth.json" })
  await browser.close()
}