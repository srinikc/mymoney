import { chromium } from "playwright"
import { join, dirname } from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = dirname(fileURLToPath(import.meta.url))
const PROFILE_DIR = join(__dirname, "..", ".gpay-profile")
const DATA_DIR = join(__dirname, "..", "data")

const context = await chromium.launchPersistentContext(PROFILE_DIR, {
  headless: true,
  channel: "chrome",
  args: ["--no-sandbox", "--disable-setuid-sandbox"],
})
const page = await context.newPage()
page.setDefaultTimeout(10000)

await page.goto("https://takeout.google.com", { waitUntil: "networkidle", timeout: 30000 })
if (page.url().includes("accounts.google.com")) { console.log("AUTH_REQUIRED"); process.exit(0) }
console.log("Logged in. URL:", page.url())
await page.screenshot({ path: join(DATA_DIR, "step-0-loaded.png"), fullPage: true })
console.log("Screenshot 0 saved")

// Use evaluate for robust clicking
async function safeClick(text) {
  return page.evaluate((t) => {
    const all = document.querySelectorAll("button, [role=button], [role=option], [role=radio], a, span, div")
    for (const el of all) {
      const txt = el.textContent.replace(/\s+/g, " ").trim()  
      if (txt === t || txt.includes(t)) {
        if (el.offsetParent !== null || el.closest('[style*="display: none"], [style*="visibility: hidden"]') === null) {
          el.click()
          return `clicked: ${t}`
        }
      }
    }
    return `not found: ${t}`
  }, text)
}

// Step 1: Deselect all
console.log("\n1. Deselect all:", await safeClick("Deselect all"))
await new Promise(r => setTimeout(r, 2000))

// Step 2: Select Google Pay
console.log("2. Select Google Pay:", await page.evaluate(() => {
  const el = document.querySelector('[data-id="google_pay"]')
  if (el) { el.click(); return "found by data-id" }
  return "not found"
}))
await new Promise(r => setTimeout(r, 2000))

// Step 3: Click Next step
console.log("3. Clicking Next step...")
const result = await safeClick("Next step")
console.log("   Result:", result)
console.log("   Waiting for page transition...")
await new Promise(r => setTimeout(r, 12000))

// Check what's on the page now
const state = await page.evaluate(() => {
  return {
    url: window.location.href,
    buttons: Array.from(document.querySelectorAll("button")).map(b => b.textContent.replace(/\s+/g, " ").trim()).filter(Boolean).slice(0, 30),
    headings: Array.from(document.querySelectorAll("h1, h2, h3, h4")).map(h => h.textContent.replace(/\s+/g, " ").trim()).filter(Boolean).slice(0, 10),
    roles: Array.from(document.querySelectorAll('[role="option"], [role="radio"], [role="tab"]')).map(el => el.textContent.replace(/\s+/g, " ").trim().slice(0, 60)).filter(Boolean).slice(0, 20),
    progress: !!document.querySelector('[role="progressbar"], [aria-busy="true"]'),
  }
})
console.log("\nPage state after Next step:")
console.log(JSON.stringify(state, null, 2))

await page.screenshot({ path: join(DATA_DIR, "step-3-after-next.png"), fullPage: true })
console.log("Screenshot 3 saved")

// Try the delivery page buttons
console.log("\n4. Trying to find delivery options...")
const allOptions = await safeClick("Add to Drive")
console.log("   Add to Drive:", allOptions)
await new Promise(r => setTimeout(r, 2000))

const createBtn = await safeClick("Create export")
console.log("   Create export:", createBtn)
await new Promise(r => setTimeout(r, 3000))

await page.screenshot({ path: join(DATA_DIR, "step-4-delivery.png"), fullPage: true })
console.log("Screenshot 4 saved")

console.log("\nFinal URL:", page.url())
const finalText = await page.evaluate(() => document.body.innerText.slice(0, 1500))
console.log("Page text:", finalText)

await context.close()
