import { chromium } from "@playwright/test"
import * as fs from "fs"

export default async function globalSetup() {
  const browser = await chromium.launch()
  const page = await browser.newPage()
  await page.goto("http://localhost:3005/login", { waitUntil: "domcontentloaded" })
  await page.waitForTimeout(3000)
  await page.locator("#email").fill("test@example.com")
  await page.locator("#password").fill("test123")
  await page.getByRole("button", { name: "Sign in with Email" }).click()
  await page.waitForTimeout(3000)
  await page.context().storageState({ path: "e2e/.auth.json" })
  await browser.close()
}
