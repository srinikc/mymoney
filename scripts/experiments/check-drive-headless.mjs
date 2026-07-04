import { chromium } from "playwright"
import { join, dirname } from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = dirname(fileURLToPath(import.meta.url))
const PROFILE_DIR = join(__dirname, "..", ".gpay-profile")

async function run() {
  const context = await chromium.launchPersistentContext(PROFILE_DIR, {
    headless: true,
    channel: "chrome",
  })
  const page = await context.newPage()
  page.setDefaultTimeout(15000)

  await page.goto("https://takeout.google.com", { waitUntil: "networkidle", timeout: 30000 })
  if (page.url().includes("accounts.google.com")) { console.log("AUTH REQUIRED"); await context.close(); return }
  await new Promise(r => setTimeout(r, 2000))

  // Deselect all
  await page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll("button")).find(b => b.textContent.includes("Deselect all"))
    if (btn) btn.click()
  })
  await new Promise(r => setTimeout(r, 2000))

  // Select GPay
  await page.locator('[data-id="google_pay"] input[type="checkbox"]').click({ force: true })
  await new Promise(r => setTimeout(r, 1000))

  // Next step
  await page.locator('button:has-text("Next step")').first().click({ timeout: 5000 })
  await new Promise(r => setTimeout(r, 2000))

  // Switch destination to Drive
  await page.evaluate(() => {
    const cb = document.querySelector('[role="combobox"]')
    if (cb) { cb.scrollIntoView(); cb.click() }
  })
  await new Promise(r => setTimeout(r, 2000))

  await page.evaluate(() => {
    const opt = document.querySelector('[data-value="DRIVE"]')
    if (opt) { opt.scrollIntoView(); opt.click() }
  })
  await new Promise(r => setTimeout(r, 1500))

  const dest = await page.evaluate(() => document.querySelector('[role="combobox"]')?.textContent)
  console.log("Destination:", dest)

  // Click Create export
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll("button")).filter(b => b.textContent.includes("Create export"))
    const btn = btns.find(b => b.offsetParent !== null) || btns[0]
    if (btn) btn.click()
  })
  await new Promise(r => setTimeout(r, 3000))

  const url = page.url()
  console.log("URL after click:", url)

  if (url.includes("signin/challenge")) {
    console.log("=== PASSWORD CHALLENGE DETECTED ===")
    // Extract the continue URL
    const continueUrl = await page.evaluate(() => {
      const input = document.querySelector('input[name="continue"], [name="continue"]')
      return input?.getAttribute("value") || window.location.href
    })
    console.log("Continue URL:", continueUrl?.slice(0, 300))
    console.log("Page URL:", url.slice(0, 300))
  } else {
    console.log("✅ No password challenge!")
    const text = await page.evaluate(() => document.body.innerText.slice(0, 500))
    console.log("Page:", text)
  }

  await context.close()
}
run().catch(e => { console.error(e); process.exit(1) })
