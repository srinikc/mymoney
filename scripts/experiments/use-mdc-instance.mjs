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
if (page.url().includes("accounts.google.com")) { process.exit(0) }
await new Promise(r => setTimeout(r, 2000))

// Deselect all
await page.locator('button:has-text("Deselect all")').click()
await new Promise(r => setTimeout(r, 3000))

const state0 = await page.evaluate(() => {
  const gpay = document.querySelector('[data-id="google_pay"]')
  const cb = gpay?.querySelector('input[type="checkbox"]')
  return { checked: cb?.checked }
})
console.log("Initial:", JSON.stringify(state0))

// Try using the MDC checkbox instance directly
console.log("\n=== Inspecting MDC checkbox instance ===")
const mdcInfo = await page.evaluate(() => {
  const gpay = document.querySelector('[data-id="google_pay"]')
  const container = gpay?.querySelector(".VfPpkd-MPu53c")
  const ctrl = container?.__jscontroller
  const inst = ctrl?.instance
  if (!inst) return "no instance"

  // Get all props and methods of the instance
  const proto = Object.getPrototypeOf(inst)
  const ownKeys = Object.getOwnPropertyNames(inst)
  const protoKeys = Object.getOwnPropertyNames(proto).filter(k => k !== "constructor")

  const results = {
    ownKeys: ownKeys,
    protoKeys: protoKeys,
  }

  // Get current values
  for (const key of ["checked", "indeterminate", "disabled", "value"]) {
    try { results[key] = inst[key] } catch {}
  }

  return results
})
console.log(JSON.stringify(mdcInfo, null, 2))

// Try setting checked via the MDC instance
console.log("\n=== Setting checked via MDC instance ===")
const setResult = await page.evaluate(() => {
  const gpay = document.querySelector('[data-id="google_pay"]')
  const container = gpay?.querySelector(".VfPpkd-MPu53c")
  const inst = container?.__jscontroller?.instance
  if (!inst) return "no instance"

  inst.checked = true
  return "set checked = true, value now: " + inst.checked
})
console.log(setResult)

await new Promise(r => setTimeout(r, 2000))

const state1 = await page.evaluate(() => {
  const gpay = document.querySelector('[data-id="google_pay"]')
  const cb = gpay?.querySelector('input[type="checkbox"]')
  const container = gpay?.querySelector(".VfPpkd-MPu53c")
  return {
    checked: cb?.checked,
    hasCheckedClass: container?.classList.contains("VfPpkd-MPu53c-OWXEXe-gk6SMd"),
    containerClass: container?.className.slice(0, 100),
  }
})
console.log("After set:", JSON.stringify(state1))

// Try calling the click/toggle handler on the checkbox controller
console.log("\n=== Trying checkbox controller click handler ===")
await page.locator('button:has-text("Deselect all")').click()
await new Promise(r => setTimeout(r, 3000))

const state2 = await page.evaluate(() => {
  const gpay = document.querySelector('[data-id="google_pay"]')
  const cb = gpay?.querySelector('input[type="checkbox"]')
  return { checked: cb?.checked }
})
console.log("After re-deselect:", JSON.stringify(state2))

const clickViaInstance = await page.evaluate(() => {
  const gpay = document.querySelector('[data-id="google_pay"]')
  const container = gpay?.querySelector(".VfPpkd-MPu53c")
  const inst = container?.__jscontroller?.instance

  if (!inst) return "no instance"

  // Try setting and triggering the change event
  inst.checked = true
  inst.layout?.()

  // Dispatch a change event on the hidden input
  const input = container?.querySelector('input[type="checkbox"]')
  if (input) {
    input.dispatchEvent(new Event("change", { bubbles: true }))
  }

  return "done: checked=" + inst.checked
})
console.log(clickViaInstance)
await new Promise(r => setTimeout(r, 2000))

const state3 = await page.evaluate(() => {
  const gpay = document.querySelector('[data-id="google_pay"]')
  const container = gpay?.querySelector(".VfPpkd-MPu53c")
  return {
    checked: gpay?.querySelector('input[type="checkbox"]')?.checked,
    hasCheckedClass: container?.classList.contains("VfPpkd-MPu53c-OWXEXe-gk6SMd"),
    selectedCount: document.querySelectorAll('input[type="checkbox"]:checked').length,
  }
})
console.log("Final state:", JSON.stringify(state3))

// Try clicking Next step to see if it works now
await page.locator('button:has-text("Next step")').click()
await new Promise(r => setTimeout(r, 3000))
const step2 = await page.evaluate(() => {
  return Array.from(document.querySelectorAll('c-wiz[data-state="2"]'))
    .map(s => s.className.includes("RDPZE") ? "disabled" : "ACTIVE")
})
console.log("Step 2 after Next step:", step2)

await context.close()
