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
page.setDefaultTimeout(15000)

await page.goto("https://takeout.google.com", { waitUntil: "networkidle", timeout: 30000 })
if (page.url().includes("accounts.google.com")) { process.exit(0) }
await new Promise(r => setTimeout(r, 2000))

// First deselect all
await page.locator('button:has-text("Deselect all")').click()
await new Promise(r => setTimeout(r, 3000))

console.log("=== Deep inspection of WIZ internals on Google Pay row ===")
const wizData = await page.evaluate(() => {
  const results = {}

  const gpay = document.querySelector('[data-id="google_pay"]')
  if (!gpay) return { error: "no gpay" }

  // Inspect __wiz
  const wiz = gpay.__wiz
  if (wiz) {
    results.wizType = typeof wiz
    results.wizIsArray = Array.isArray(wiz)
    try {
      results.wizJson = JSON.stringify(wiz).slice(0, 2000)
    } catch {
      results.wizKeys = Object.keys(wiz)
      // Check deeper
      for (const key of results.wizKeys) {
        const val = wiz[key]
        results["wiz_" + key + "_type"] = typeof val
        if (val && typeof val === "object") {
          try {
            results["wiz_" + key + "_json"] = JSON.stringify(val).slice(0, 300)
          } catch {
            results["wiz_" + key + "_keys"] = Object.keys(val).slice(0, 10)
          }
        }
      }
    }
  }

  // Inspect __jscontroller - this holds the WIZ controller instance
  const jsc = gpay.__jscontroller
  if (jsc) {
    results.jscType = typeof jsc
    if (typeof jsc === "object") {
      results.jscKeys = Object.keys(jsc)
      results.jscProtoKeys = Object.getOwnPropertyNames(Object.getPrototypeOf(jsc)).slice(0, 30)
      // Look for handler methods
      const methods = []
      for (const key of results.jscProtoKeys) {
        if (typeof jsc[key] === "function") {
          methods.push(key)
        }
      }
      results.jscMethods = methods
    }
  }

  // Inspect CHECKBOX __jscontroller
  const checkbox = gpay.querySelector(".VfPpkd-MPu53c")
  if (checkbox) {
    const cbJsc = checkbox.__jscontroller
    if (cbJsc) {
      results.cbJscType = typeof cbJsc
      if (typeof cbJsc === "object") {
        results.cbJscKeys = Object.keys(cbJsc)
        results.cbJscProtoKeys = Object.getOwnPropertyNames(Object.getPrototypeOf(cbJsc)).slice(0, 30)
        const methods = []
        for (const key of results.cbJscProtoKeys) {
          if (typeof cbJsc[key] === "function") methods.push(key)
        }
        results.cbJscMethods = methods
      }
    }
  }

  // Try to find the actual JavaScript click handler
  // WIZ uses __jsaction to map events to methods
  const jsaction = gpay.__jsaction
  if (jsaction) {
    results.jsactionType = typeof jsaction
    try {
      results.jsactionJson = JSON.stringify(jsaction).slice(0, 1000)
    } catch {
      results.jsactionKeys = Object.keys(jsaction).slice(0, 10)
    }
  }

  return results
})
console.log(JSON.stringify(wizData, null, 2))

// Now try to call the controller method directly
console.log("\n=== Trying to call WIZ controller methods ===")
const callResult = await page.evaluate(() => {
  const gpay = document.querySelector('[data-id="google_pay"]')
  const jsc = gpay?.__jscontroller
  if (!jsc) return "no jsc"

  const results = []
  const proto = Object.getPrototypeOf(jsc)
  const methods = Object.getOwnPropertyNames(proto).filter(m => typeof jsc[m] === "function")

  results.push("Available methods: " + methods.join(", "))

  // Try calling methods
  for (const method of methods) {
    try {
      const r = jsc[method]()
      results.push(method + "() returned: " + JSON.stringify(r).slice(0, 100))
    } catch (e) {
      results.push(method + "() error: " + e.message)
    }
  }

  // Also try the checkbox controller
  const checkbox = gpay.querySelector(".VfPpkd-MPu53c")
  const cbJsc = checkbox?.__jscontroller
  if (cbJsc) {
    const cbProto = Object.getPrototypeOf(cbJsc)
    const cbMethods = Object.getOwnPropertyNames(cbProto).filter(m => typeof cbJsc[m] === "function")
    results.push("Checkbox methods: " + cbMethods.join(", "))
    for (const method of cbMethods) {
      try {
        const r = cbJsc[method]()
        results.push("CB " + method + "() returned: " + JSON.stringify(r).slice(0, 100))
      } catch (e) {
        results.push("CB " + method + "() error: " + e.message)
      }
    }
  }

  return results
})
for (const line of callResult) console.log(line)

// Check if GPay is now selected
const state = await page.evaluate(() => {
  const gpay = document.querySelector('[data-id="google_pay"]')
  const cb = gpay?.querySelector('input[type="checkbox"]')
  return { checked: cb?.checked }
})
console.log("\nGPay checked:", state.checked)

await context.close()
