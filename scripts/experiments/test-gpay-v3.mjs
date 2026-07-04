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

const consoleErrs = []
page.on("console", msg => { if (msg.type() === "error") consoleErrs.push(msg.text()) })

await page.goto("https://takeout.google.com", { waitUntil: "networkidle", timeout: 30000 })
if (page.url().includes("accounts.google.com")) { console.log("AUTH_REQUIRED"); process.exit(0) }

// Deselect all - wait for RPC to process
await page.locator('button:has-text("Deselect all")').click()
await new Promise(r => setTimeout(r, 5000))

// Check initial state
let state = await page.evaluate(() => {
  const gpay = document.querySelector('[data-id="google_pay"]')
  const cb = gpay?.querySelector('input[type="checkbox"]')
  return { gpayChecked: cb?.checked }
})
console.log("After deselect:", JSON.stringify(state))

// Use dispatchEvent to trigger MDC controller properly
await page.evaluate(() => {
  const gpay = document.querySelector('[data-id="google_pay"]')
  const container = gpay?.querySelector(".VfPpkd-MPu53c")
  if (container) {
    // MDC checkbox listens for 'click' on the container element
    container.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, cancelable: true }))
    container.dispatchEvent(new PointerEvent("pointerup", { bubbles: true, cancelable: true }))
    container.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true, view: window }))
  }
})
await new Promise(r => setTimeout(r, 3000))

state = await page.evaluate(() => {
  const gpay = document.querySelector('[data-id="google_pay"]')
  const cb = gpay?.querySelector('input[type="checkbox"]')
  const selected = document.querySelectorAll('input[type="checkbox"]:checked').length
  const total = document.querySelectorAll('input[type="checkbox"]').length
  const step2 = Array.from(document.querySelectorAll('c-wiz[data-state="2"]'))
  return {
    gpayChecked: cb?.checked,
    selectedCount: selected + "/" + total,
    step2Disabled: step2.map(s => s.className.includes("RDPZE")),
  }
})
console.log("State:", JSON.stringify(state, null, 2))
console.log("Console errors:", consoleErrs.slice(0, 5))

// Try Next step
await page.locator('button:has-text("Next step")').click()
await new Promise(r => setTimeout(r, 3000))

const afterNext = await page.evaluate(() => {
  const step2 = Array.from(document.querySelectorAll('c-wiz[data-state="2"]'))
  return step2.map(s => s.className.includes("RDPZE") ? "disabled" : "ACTIVE")
})
console.log("After Next step:", afterNext)

// If step 2 is active, complete the flow
if (afterNext.includes("ACTIVE")) {
  await page.getByRole("option", { name: /Add to Drive/i }).click()
  await new Promise(r => setTimeout(r, 2000))
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
  await new Promise(r => setTimeout(r, 1000))
  await page.locator('button:has-text("Create export")').click()
  await new Promise(r => setTimeout(r, 5000))
  console.log("Export created!")
}

await context.close()
