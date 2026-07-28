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
page.setDefaultTimeout(10000)

await page.goto("https://takeout.google.com", { waitUntil: "networkidle", timeout: 30000 })
if (page.url().includes("accounts.google.com")) { console.log("AUTH_REQUIRED"); process.exit(0) }
console.log("Page loaded")

// Deselect all
await page.locator('button:has-text("Deselect all")').click()
await new Promise(r => setTimeout(r, 2000))
let count = await page.locator('[aria-label*="selected"]').first().textContent()
console.log("After Deselect all:", count)

// Select Google Pay via checkbox aria-label
await page.locator('[aria-label="Select Google Pay"]').click()
await new Promise(r => setTimeout(r, 2000))
count = await page.locator('[aria-label*="selected"]').first().textContent()
console.log("After select GPay:", count)

// Click Next step
await page.locator('button:has-text("Next step")').click()
console.log("Clicked Next step")
await new Promise(r => setTimeout(r, 5000))

// Check if step 2 activated
const active = await page.evaluate(() => {
  const step2 = document.querySelectorAll('c-wiz[data-state="2"]')
  return Array.from(step2).map(s => s.className.includes("RDPZE") ? "disabled" : "ACTIVE")
})
console.log("Step 2 state:", active)

// Try clicking Add to Drive
const opt = page.getByRole("option", { name: /Add to Drive/i })
if (await opt.count() > 0) {
  await opt.click()
  console.log("Clicked Add to Drive by role")
} else {
  const driveLabel = await page.locator('text=Add to Drive').first()
  if (await driveLabel.count() > 0) { await driveLabel.click(); console.log("Clicked by text") }
  else { console.log("Add to Drive NOT FOUND") }
}
await new Promise(r => setTimeout(r, 2000))

// Scroll to bottom for Create export
await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
await new Promise(r => setTimeout(r, 1000))

const createBtn = page.locator('button:has-text("Create export")')
if (await createBtn.count() > 0) {
  console.log("Create export button found, clicking...")
  await createBtn.click()
  await new Promise(r => setTimeout(r, 5000))
  console.log("Clicked!")
} else {
  console.log("Create export button NOT found")
  const pageText = await page.evaluate(() => document.body.innerText.slice(-1000))
  console.log("Bottom of page:", pageText)
}

await context.close()
