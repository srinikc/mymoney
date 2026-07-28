import { chromium } from "playwright"
import { join, dirname } from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = dirname(fileURLToPath(import.meta.url))
const PROFILE_DIR = join(__dirname, "..", ".gpay-profile")

async function run() {
  const context = await chromium.launchPersistentContext(PROFILE_DIR, {
    headless: true,
    channel: "chrome",
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  })
  const page = await context.newPage()
  page.setDefaultTimeout(15000)

  await page.goto("https://takeout.google.com", { waitUntil: "networkidle", timeout: 30000 })
  if (page.url().includes("accounts.google.com")) { process.exit(0) }
  await new Promise(r => setTimeout(r, 2000))

  // Deselect all, select only GPay
  await page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll("button")).find(b => b.textContent.includes("Deselect all"))
    if (btn) btn.click()
  })
  await new Promise(r => setTimeout(r, 3000))

  await page.locator('[data-id="google_pay"] input[type="checkbox"]').click({ force: true })
  await new Promise(r => setTimeout(r, 1000))

  // Step 1 → Step 2 via "Next step"
  console.log("=== Clicking Next step ===")
  await page.locator('button:has-text("Next step")').first().click({ timeout: 5000 })
  await new Promise(r => setTimeout(r, 3000))

  // Now "Create export" should be visible
  console.log("=== Clicking Create export ===")
  await page.locator('button:has-text("Create export")').click({ timeout: 10000 })
  await new Promise(r => setTimeout(r, 8000))

  const afterCreate = await page.evaluate(() => {
    const text = document.body.innerText.slice(0, 2000)
    const url = window.location.href
    const title = document.title
    // Check for export in progress indicators
    const progressEls = Array.from(document.querySelectorAll('[role="progressbar"], [aria-valuenow], [class*="progress"], c-wiz'))
      .map(el => ({ tag: el.tagName, text: el.textContent?.trim().slice(0, 60), class: el.className.slice(0, 40) }))
    return { url, title, text: text.slice(0, 1500), progressEls: progressEls.slice(0, 10) }
  })
  console.log(JSON.stringify(afterCreate, null, 2))

  // Check for any export ID in the page
  const exportId = await page.evaluate(() => {
    const text = document.body.innerText
    const match = text.match(/export[_\s]?id[:\s]+([a-zA-Z0-9_\-]+)/i)
    return match ? match[1] : null
  })
  console.log("Export ID found:", exportId)

  // Check URL params
  console.log("URL:", page.url())

  // Wait a bit more and check for updates (export may take time)
  await new Promise(r => setTimeout(r, 5000))
  const updated = await page.evaluate(() => {
    return { text: document.body.innerText.slice(0, 1000) }
  })
  console.log("5s later:", JSON.stringify(updated, null, 2))

  await context.close()
}
run().catch(e => { console.error(e); process.exit(1) })
