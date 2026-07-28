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
if (page.url().includes("accounts.google.com")) { process.exit(0) }
await new Promise(r => setTimeout(r, 2000))

// Deselect all first
await page.evaluate(() => {
  const btn = Array.from(document.querySelectorAll("button")).find(b => b.textContent.includes("Deselect all"))
  if (btn) btn.click()
})
await new Promise(r => setTimeout(r, 3000))

console.log("=== Deep instance inspect ===")
const info = await page.evaluate(() => {
  const gpay = document.querySelector('[data-id="google_pay"]')
  const container = gpay?.querySelector(".VfPpkd-MPu53c")
  const inst = container?.__jscontroller?.instance
  if (!inst) return "no instance"

  // Get all property values
  const props = {}
  for (const key of Object.keys(inst)) {
    const val = inst[key]
    if (val === null) props[key] = "null"
    else if (val === undefined) props[key] = "undefined"
    else if (typeof val === "function") props[key] = "fn:" + val.name
    else if (typeof val === "object") {
      if (val instanceof window.HTMLElement) props[key] = `<${val.tagName}${val.id ? "#"+val.id : ""}${val.className ? "."+val.className.slice(0,30) : ""}>`
      else if (Array.isArray(val)) props[key] = `array[${val.length}]`
      else try {
        const keys = Object.keys(val).slice(0,5)
        const str = JSON.stringify(keys).slice(0,50)
        props[key] = "obj:" + str
      } catch { props[key] = "obj(len=?)" }
    } else props[key] = String(val).slice(0, 60)
  }

  // Get descriptor properties
  const desc = Object.getOwnPropertyDescriptors(inst)
  const accessors = Object.keys(desc).filter(k => desc[k].get || desc[k].set).map(k => ({
    key: k,
    hasGetter: !!desc[k].get,
    hasSetter: !!desc[k].set,
  }))

  return { props, protoAccessors: accessors }
})
console.log(JSON.stringify(info, null, 2))

// Now try $wa$ methods with boolean argument
console.log("\n=== $wa$ methods with true/false args ===")
const methods = await page.evaluate(() => {
  const gpay = document.querySelector('[data-id="google_pay"]')
  const container = gpay?.querySelector(".VfPpkd-MPu53c")
  const inst = container?.__jscontroller?.instance
  if (!inst) return "no instance"

  const proto = Object.getPrototypeOf(inst)
  const waMethods = Object.getOwnPropertyNames(proto).filter(m => m.startsWith("$wa$"))
  const results = {}

  for (const method of waMethods) {
    // Try with true
    try {
      inst[method](true)
      results[method + "(true)"] = "ok"
    } catch (e) {
      results[method + "(true)"] = "err: " + e.message.slice(0, 60)
    }
    // Try with false
    try {
      inst[method](false)
      results[method + "(false)"] = "ok"
    } catch (e) {
      results[method + "(false)"] = "err: " + e.message.slice(0, 60)
    }
  }

  return {
    waMethods: waMethods,
    results: results,
    checked: inst.Jb ? inst.Jb() : "?",
    hasCheckedClass: container.classList.contains("VfPpkd-MPu53c-OWXEXe-gk6SMd"),
    cssClasses: Array.from(container.classList).filter(c => c.startsWith("VfPpkd-")).join(", "),
  }
})
console.log(JSON.stringify(methods, null, 2))

await context.close()
