import { chromium } from "playwright"
import { join, dirname } from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = dirname(fileURLToPath(import.meta.url))
const PROFILE_DIR = join(__dirname, "..", ".gpay-profile")

async function run() {
  const context = await chromium.launchPersistentContext(PROFILE_DIR, {
    headless: false,
    channel: "chrome",
  })
  const page = await context.newPage()
  page.setDefaultTimeout(30000)

  await page.goto("https://takeout.google.com", { waitUntil: "networkidle", timeout: 60000 })
  await new Promise(r => setTimeout(r, 3000))

  // Deselect all
  await page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll("button")).find(b => b.textContent.includes("Deselect all"))
    if (btn) btn.click()
  })
  await new Promise(r => setTimeout(r, 3000))

  // Select GPay
  await page.locator('[data-id="google_pay"] input[type="checkbox"]').click({ force: true })
  await new Promise(r => setTimeout(r, 1000))

  // Next step
  await page.locator('button:has-text("Next step")').first().click({ timeout: 10000 })
  await new Promise(r => setTimeout(r, 3000))

  // Switch to Drive
  await page.evaluate(() => {
    const combobox = document.querySelector('[role="combobox"]')
    if (combobox) { combobox.scrollIntoView(); combobox.click() }
  })
  await new Promise(r => setTimeout(r, 2000))

  await page.evaluate(() => {
    const opt = document.querySelector('[data-value="DRIVE"]')
    if (opt) { opt.scrollIntoView(); opt.click() }
  })
  await new Promise(r => setTimeout(r, 2000))

  const dest = await page.evaluate(() => document.querySelector('[role="combobox"]')?.textContent)
  console.log("Destination after change:", dest)

  // Click Create export
  console.log("Clicking Create export...")
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll("button")).filter(b => b.textContent.includes("Create export"))
    const btn = btns.find(b => b.offsetParent !== null) || btns[0]
    if (btn) btn.click()
  })
  
  await new Promise(r => setTimeout(r, 5000))
  
  const url = page.url()
  console.log("URL after create:", url)
  
  if (url.includes("signin/challenge")) {
    console.log("❌ Password challenge appeared in non-headless too")
  } else {
    console.log("✅ No password challenge in non-headless!")
  }
  
  const text = await page.evaluate(() => document.body.innerText.slice(0, 500))
  console.log("Page text:", text)

  await page.pause() // Keep window open to inspect
  await context.close()
}
run().catch(e => { console.error(e); process.exit(1) })
