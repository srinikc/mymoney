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

// Deselect all
await page.locator('button:has-text("Deselect all")').click()
await new Promise(r => setTimeout(r, 3000))

function logState(label) {
  return page.evaluate((l) => {
    const gpay = document.querySelector('[data-id="google_pay"]')
    const cb = gpay?.querySelector('input[type="checkbox"]')
    const selected = document.querySelectorAll('input[type="checkbox"]:checked').length
    return { label: l, gpayChecked: cb?.checked, selected }
  }, label)
}

console.log(JSON.stringify(await logState("after deselect")))

// Strategy A: Fire WIZ custom event JIbuQc on the outer container
await page.evaluate(() => {
  const gpay = document.querySelector('[data-id="google_pay"]')
  if (gpay) {
    gpay.dispatchEvent(new CustomEvent("JIbuQc", { bubbles: true, cancelable: true, detail: {} }))
  }
})
await new Promise(r => setTimeout(r, 2000))
console.log(JSON.stringify(await logState("after JIbuQc event")))

// Strategy B: Try clicking the SVG (visible checkbox graphic)
await page.evaluate(() => {
  const gpay = document.querySelector('[data-id="google_pay"]')
  const svg = gpay?.querySelector("svg")
  if (svg) {
    svg.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, cancelable: true }))
    svg.dispatchEvent(new PointerEvent("pointerup", { bubbles: true, cancelable: true }))
    svg.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }))
  }
})
await new Promise(r => setTimeout(r, 2000))
console.log(JSON.stringify(await logState("after svg click")))

// Strategy C: Click the whole gpay row using Playwright
// Reset first
await page.locator('button:has-text("Deselect all")').click()
await new Promise(r => setTimeout(r, 3000))
console.log(JSON.stringify(await logState("reset for C")))

await page.locator('[data-id="google_pay"]').click()
await new Promise(r => setTimeout(r, 3000))
console.log(JSON.stringify(await logState("after row click")))

// Strategy D: Click the checkbox container using Playwright normal click
await page.locator('button:has-text("Deselect all")').click()
await new Promise(r => setTimeout(r, 3000))
console.log(JSON.stringify(await logState("reset for D")))

// Scroll to GPay first, then click
await page.locator('[data-id="google_pay"]').scrollIntoViewIfNeeded()
await new Promise(r => setTimeout(r, 1000))
await page.locator('[data-id="google_pay"] .VfPpkd-MPu53c').click()
await new Promise(r => setTimeout(r, 3000))
console.log(JSON.stringify(await logState("after MDC click")))

// Strategy E: Use page.$eval with dispatcher
await page.locator('button:has-text("Deselect all")').click()
await new Promise(r => setTimeout(r, 3000))
console.log(JSON.stringify(await logState("reset for E")))

await page.$eval('[data-id="google_pay"]', el => {
  const evt = new MouseEvent("click", { bubbles: true, cancelable: true, view: window, button: 0 })
  el.dispatchEvent(evt)
})
await new Promise(r => setTimeout(r, 3000))
console.log(JSON.stringify(await logState("after $eval click")))

await context.close()
