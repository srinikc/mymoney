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

// Wait for fully loaded
await new Promise(r => setTimeout(r, 2000))

// Strategy 1: Access WIZ component instances via jsname
console.log("=== Strategy 1: WIZ internal instances ===")
const wizResult = await page.evaluate(() => {
  const results = {}

  // Try the GPay row controller (jsname="E6bu2c")
  const gpayRow = document.querySelector('[jsname="E6bu2c"]')
  if (gpayRow) {
    const keys = Object.getOwnPropertyNames(gpayRow).filter(k => k.startsWith("__"))
    results.gpayRowKeys = keys
    // Try to find WIZ data
    for (const key of keys) {
      const val = gpayRow[key]
      if (val && typeof val === "object") {
        const methods = Object.getOwnPropertyNames(Object.getPrototypeOf(val)).filter(m => typeof val[m] === "function").slice(0, 5)
        results["gpayRow_" + key] = methods
      }
    }
  }

  // Try the checkbox container (jsname="PE3haf")
  const checkbox = document.querySelector('[jsname="PE3haf"]')
  if (checkbox) {
    const keys = Object.getOwnPropertyNames(checkbox).filter(k => k.startsWith("__"))
    results.checkboxKeys = keys
    for (const key of keys) {
      const val = checkbox[key]
      if (val && typeof val === "object") {
        const proto = Object.getPrototypeOf(val)
        const methods = Object.getOwnPropertyNames(proto).filter(m => typeof val[m] === "function").slice(0, 5)
        results["checkbox_" + key] = methods
        // Try to call click/toggle
        if (val.click) results.canClick = true
        if (val.toggle) results.canToggle = true
      }
    }
  }

  // Try the Next step button (jsname="Pr7Yme" - but there are multiple)
  const buttons = document.querySelectorAll('[jsname="Pr7Yme"]')
  results.nextStepButtons = buttons.length
  for (let i = 0; i < buttons.length; i++) {
    const bKeys = Object.getOwnPropertyNames(buttons[i]).filter(k => k.startsWith("__"))
    results["button" + i + "Keys"] = bKeys
  }

  // Check for global WIZ registry
  if (window._JSS_MODULES) results.hasJSSModules = Object.keys(window._JSS_MODULES).length
  if (window.___JSS_LOADED___) results.hasLoaded = Object.keys(window.___JSS_LOADED___).slice(0, 10)

  return results
})
console.log(JSON.stringify(wizResult, null, 2))

// Strategy 2: Try using document.querySelector to call internal click handlers
// WIZ components often have an "H" property that contains the component instance
console.log("\n=== Strategy 2: Try H property ===")
const hResult = await page.evaluate(() => {
  const gpay = document.querySelector('[data-id="google_pay"]')
  if (!gpay) return "no gpay"

  // Try accessing internals via WIZ properties
  // The WIZ framework stores component data in __wizdata or similar
  for (const key in gpay) {
    if (key.startsWith("__react") || key.startsWith("__vue") || key.startsWith("__wiz") || key.startsWith("jQuery")) {
      return "found: " + key
    }
  }

  // Try to find and click the actual label/input
  const checkbox = gpay.querySelector('input[type="checkbox"]')
  if (checkbox) {
    // Try clicking the parent label
    const parent = checkbox.closest("label") || checkbox.parentElement
    return {
      checkboxTag: checkbox.tagName,
      checkboxId: checkbox.id,
      parentTag: parent?.tagName,
      parentClass: parent?.className.slice(0, 80),
      // Check if there's a <label> with "for" attribute
      label: document.querySelector(`label[for="${checkbox.id}"]`)?.textContent?.slice(0, 50),
    }
  }
  return "no checkbox"
})
console.log(JSON.stringify(hResult, null, 2))

// Strategy 3: Trigger the WIZ click event directly
console.log("\n=== Strategy 3: WIZ click event ===")
// Deselect all first
await page.locator('button:has-text("Deselect all")').click()
await new Promise(r => setTimeout(r, 3000))

const clickResult = await page.evaluate(() => {
  const gpay = document.querySelector('[data-id="google_pay"]')
  if (!gpay) return "no gpay"

  // Try to find WIZ event dispatcher
  // WIZ stores the jscontroller instance which has a handleEvent method
  const allKeys = Object.getOwnPropertyNames(gpay)
  const wizKeys = allKeys.filter(k => !["id", "className", "classList", "style", "childNodes", "children", "innerHTML", "outerHTML", "textContent", "innerText", "tagName", "nodeName", "nodeType", "nodeValue", "parentElement", "parentNode", "firstChild", "lastChild", "nextSibling", "previousSibling", "attributes", "scrollTop", "scrollLeft", "scrollHeight", "scrollWidth", "clientHeight", "clientWidth", "offsetHeight", "offsetWidth", "offsetTop", "offsetLeft", "offsetParent"].includes(k))

  const results = { wizKeys, details: {} }

  // Check for WIZ internals on the MDC container
  const container = gpay.querySelector(".VfPpkd-MPu53c")
  if (container) {
    const cKeys = Object.getOwnPropertyNames(container).filter(k => k.startsWith("__"))
    results.containerKeys = cKeys
    for (const key of cKeys) {
      const val = container[key]
      if (val && typeof val.componentHandler?.click === "function") {
        results.foundClickHandler = key
        val.componentHandler.click()
        return results
      }
      if (val && typeof val.click === "function") {
        results.foundDirectClick = key
        val.click()
        return results
      }
    }
  }

  return results
})
console.log("Click result:", JSON.stringify(clickResult, null, 2))

// Check state after
const afterState = await page.evaluate(() => {
  const gpay = document.querySelector('[data-id="google_pay"]')
  const cb = gpay?.querySelector('input[type="checkbox"]')
  return { checked: cb?.checked }
})
console.log("After state:", JSON.stringify(afterState))

await context.close()
