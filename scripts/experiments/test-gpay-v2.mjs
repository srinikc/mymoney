import { chromium } from "playwright"
import { join, dirname } from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = dirname(fileURLToPath(import.meta.url))
const PROFILE_DIR = join(__dirname, "..", ".gpay-profile")

const context = await chromium.launchPersistentContext(PROFILE_DIR, {
  headless: true,
  channel: "chrome",
  args: ["--no-sandbox", "--disable-setuid-sandbox"],
})
const page = await context.newPage()
page.setDefaultTimeout(5000)

await page.goto("https://takeout.google.com", { waitUntil: "networkidle", timeout: 30000 })
if (page.url().includes("accounts.google.com")) { console.log("AUTH_REQUIRED"); process.exit(0) }
console.log("Page loaded")

// Initial state - check GPay checkbox
let gpayChecked = await page.evaluate(() => {
  const gpay = document.querySelector('[data-id="google_pay"]')
  const cb = gpay?.querySelector('input[type="checkbox"]')
  return cb?.checked
})
console.log("GPay initial checked:", gpayChecked)

// Find and click the DESELECT ALL button
await page.locator('button:has-text("Deselect all")').click()
await new Promise(r => setTimeout(r, 2000))
gpayChecked = await page.evaluate(() => {
  const gpay = document.querySelector('[data-id="google_pay"]')
  const cb = gpay?.querySelector('input[type="checkbox"]')
  return cb?.checked
})
console.log("GPay after deselect:", gpayChecked)

// Select GPay by clicking the MDC checkbox container via Playwright (force bypass visibility)
await page.locator('[data-id="google_pay"] .VfPpkd-MPu53c').click({ force: true })
await new Promise(r => setTimeout(r, 2000))
gpayChecked = await page.evaluate(() => {
  const gpay = document.querySelector('[data-id="google_pay"]')
  const cb = gpay?.querySelector('input[type="checkbox"]')
  return cb?.checked
})
console.log("GPay after container click:", gpayChecked)

// Also check the overall count
const countText = await page.evaluate(() => {
  const els = document.querySelectorAll('[aria-label*="selected"], [aria-label*="of"]')
  for (const el of els) {
    const t = el.textContent.trim()
    if (t.includes("of")) return t
  }
  return "not found"
})
console.log("Selection count:", countText)

// Try clicking Next step if GPay is now selected
if (gpayChecked) {
  await page.locator('button:has-text("Next step")').click()
  await new Promise(r => setTimeout(r, 5000))
  const active = await page.evaluate(() => {
    const step2 = document.querySelectorAll('c-wiz[data-state="2"]')
    return Array.from(step2).map(s => s.className.includes("RDPZE") ? "disabled" : "ACTIVE")
  })
  console.log("Step 2 state:", active)

  if (active.includes("ACTIVE")) {
    // Select Add to Drive
    await page.getByRole("option", { name: /Add to Drive/i }).click()
    await new Promise(r => setTimeout(r, 2000))

    // Click Create export
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
    await new Promise(r => setTimeout(r, 1000))
    await page.locator('button:has-text("Create export")').click()
    await new Promise(r => setTimeout(r, 3000))
    console.log("Create export clicked!")

    // Wait and check result
    const pageText = await page.evaluate(() => document.body.innerText.slice(0, 500))
    console.log("Page after create:", pageText)
  }
} else {
  console.log("Could not select Google Pay!")
}

await context.close()
