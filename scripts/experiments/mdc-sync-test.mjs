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

// Deselect all
await page.locator('button:has-text("Deselect all")').click()
await new Promise(r => setTimeout(r, 3000))

console.log("=== Testing MDC instance methods ===")
const result = await page.evaluate(() => {
  const gpay = document.querySelector('[data-id="google_pay"]')
  const container = gpay?.querySelector(".VfPpkd-MPu53c")
  const inst = container?.__jscontroller?.instance
  if (!inst) return "no instance"

  const results = {}
  const proto = Object.getPrototypeOf(inst)

  // Try calling all $wa$ methods and other candidates
  const toTry = Object.getOwnPropertyNames(proto).filter(m => {
    if (m === "constructor") return false
    if (m.startsWith("$wa$")) return true
    if (["layout", "kc", "update", "Mb", "dg", "Vc", "Ga", "Jb", "Ab", "Xa", "Hb", "lg"].includes(m)) return true
    return false
  })

  for (const method of toTry) {
    try {
      const r = inst[method]()
      results[method] = "ok: " + JSON.stringify(r).slice(0, 50)
    } catch (e) {
      results[method] = "error: " + e.message.slice(0, 100)
    }
  }

  // Check DOM changes
  const input = gpay?.querySelector('input[type="checkbox"]')
  results.domChecked = input?.checked
  results.hasCheckedClass = container?.classList.contains("VfPpkd-MPu53c-OWXEXe-gk6SMd")
  results.selectedCount = document.querySelectorAll('input[type="checkbox"]:checked').length

  return results
})
console.log(JSON.stringify(result, null, 2))

// Method 2: Set input.checked + dispatch click on container
console.log("\n=== Method 2: Set input.checked + dispatch click ===")
await page.evaluate(() => {
  const btn = Array.from(document.querySelectorAll("button")).find(b => b.textContent.includes("Deselect all"))
  if (btn) btn.click()
})
await new Promise(r => setTimeout(r, 3000))

const method2Result = await page.evaluate(() => {
  const gpay = document.querySelector('[data-id="google_pay"]')
  const container = gpay?.querySelector(".VfPpkd-MPu53c")
  const input = container?.querySelector('input[type="checkbox"]')
  if (!container || !input) return "not found"

  input.checked = true
  // Native click on the container
  container.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true, button: 0 }))
  input.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }))

  return {
    inputChecked: input.checked,
    hasCheckedClass: container.classList.contains("VfPpkd-MPu53c-OWXEXe-gk6SMd"),
  }
})
console.log(JSON.stringify(method2Result, null, 2))

// Method 3: Try component setter methods
console.log("\n=== Method 3: Try component methods ===")
await page.evaluate(() => {
  const btn = Array.from(document.querySelectorAll("button")).find(b => b.textContent.includes("Deselect all"))
  if (btn) btn.click()
})
await new Promise(r => setTimeout(r, 3000))

const method3Result = await page.evaluate(() => {
  const gpay = document.querySelector('[data-id="google_pay"]')
  const container = gpay?.querySelector(".VfPpkd-MPu53c")
  const inst = container?.__jscontroller?.instance
  if (!inst) return "no instance"

  // Direct input manipulation inside MDC
  if (inst.input) {
    inst.input.checked = true
    inst.input.dispatchEvent(new Event("change", { bubbles: true }))
  }

  // Try calling $wa$N2RpBe (the checked class handler)
  const proto = Object.getPrototypeOf(inst)
  for (const key of Object.getOwnPropertyNames(proto)) {
    if (key.includes("N2RpBe")) {
      try { inst[key]() } catch {}
    }
  }

  return {
    inputChecked: inst.input?.checked,
    hasCheckedClass: container?.classList.contains("VfPpkd-MPu53c-OWXEXe-gk6SMd"),
  }
})
console.log(JSON.stringify(method3Result, null, 2))

// Method 4: JIbuQc custom event
console.log("\n=== Method 4: JIbuQc custom event ===")
await page.evaluate(() => {
  const btn = Array.from(document.querySelectorAll("button")).find(b => b.textContent.includes("Deselect all"))
  if (btn) btn.click()
})
await new Promise(r => setTimeout(r, 3000))

const method4Result = await page.evaluate(() => {
  const gpay = document.querySelector('[data-id="google_pay"]')
  if (!gpay) return "no gpay"
  gpay.dispatchEvent(new CustomEvent("JIbuQc", { bubbles: true, cancelable: true }))
  const container = gpay.querySelector(".VfPpkd-MPu53c")
  return {
    checked: gpay.querySelector('input[type="checkbox"]')?.checked,
    hasCheckedClass: container?.classList.contains("VfPpkd-MPu53c-OWXEXe-gk6SMd"),
  }
})
console.log(JSON.stringify(method4Result, null, 2))

await context.close()
