import { chromium } from "playwright"
import { join, dirname } from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = dirname(fileURLToPath(import.meta.url))
const PROFILE_DIR = join(__dirname, "..", ".gpay-profile")

async function run() {
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
  await page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll("button")).find(b => b.textContent.includes("Deselect all"))
    if (btn) btn.click()
  })
  await new Promise(r => setTimeout(r, 3000))

  console.log("=== Explore all prototype methods with args ===")
  const explore = await page.evaluate(() => {
    const gpay = document.querySelector('[data-id="google_pay"]')
    const container = gpay?.querySelector(".VfPpkd-MPu53c")
    const inst = container?.__jscontroller?.instance
    if (!inst) return "no instance"

    const proto = Object.getPrototypeOf(inst)
    const nonWaMethods = Object.getOwnPropertyNames(proto).filter(m => !m.startsWith("$wa$") && m !== "constructor")
    const results = {}

    for (const method of nonWaMethods) {
      try {
        const r = inst[method]()
        results[method + "()"] = JSON.stringify(r).slice(0, 80)
      } catch (e) {
        results[method + "()"] = "ERR: " + e.message.slice(0, 60)
      }
      // Try with string arg
      try {
        const r = inst[method]("rd")
        results[method + '("rd")'] = JSON.stringify(r).slice(0, 80)
      } catch (e) {
        // ignore
      }
      // Try with true
      try {
        const r = inst[method](true)
        results[method + "(true)"] = JSON.stringify(r).slice(0, 80)
      } catch (e) {
        // ignore
      }
    }
    return results
  })
  console.log(JSON.stringify(explore, null, 2))

  // Now check the "ui" and "qw" sub-objects
  console.log("\n=== Sub-objects ===")
  const subObjs = await page.evaluate(() => {
    const gpay = document.querySelector('[data-id="google_pay"]')
    const inst = gpay?.querySelector(".VfPpkd-MPu53c")?.__jscontroller?.instance
    if (!inst) return "no instance"

    const r = {}

    if (inst.qw) {
      r.qw = {}
      for (const k of Object.keys(inst.qw)) {
        const v = inst.qw[k]
        r.qw[k] = typeof v === "object" ? Object.keys(v) : String(v).slice(0, 50)
      }
    }

    if (inst.ui) {
      r.ui = {}
      for (const k of Object.keys(inst.ui)) {
        const v = inst.ui[k]
        r.ui[k] = typeof v === "function" ? "fn:" + v.name : typeof v === "object" ? Object.keys(v).slice(0,5) : String(v).slice(0, 50)
      }
    }

    if (inst.Ol) {
      r.Ol = {}
      for (const k of Object.keys(inst.Ol)) {
        const v = inst.Ol[k]
        r.Ol[k] = typeof v === "function" ? "fn:" + v.name : typeof v === "object" ? v.constructor?.name : String(v).slice(0, 50)
      }
    }

    // Try calling ha with an event
    if (typeof inst.ha === "function") {
      try {
        r.ha_result = String(inst.ha(new MouseEvent("click", { bubbles: true })))
      } catch (e) {
        r.ha_result = "ERR: " + e.message.slice(0, 80)
      }
    }

    return r
  })
  console.log(JSON.stringify(subObjs, null, 2))

  await context.close()
}
run().catch(e => { console.error(e); process.exit(1) })
