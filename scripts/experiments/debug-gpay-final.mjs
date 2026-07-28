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
page.setDefaultTimeout(15000)

// Capture ALL batchexecute requests (both directions)
const allReqs = []
page.on("request", req => {
  if (req.url().includes("batchexecute")) {
    allReqs.push({ type: "request", url: req.url(), data: req.postData() || "", ts: Date.now() })
  }
})

await page.goto("https://takeout.google.com", { waitUntil: "networkidle", timeout: 30000 })
if (page.url().includes("accounts.google.com")) { console.log("AUTH_REQUIRED"); process.exit(0) }
console.log("Logged in. Page loaded.")

// Helper: robust click by evaluate
async function clickText(text) {
  return page.evaluate((t) => {
    const all = document.querySelectorAll("button, [role=button], [role=option], [role=radio], a, span, div, label")
    const candidates = []
    for (const el of all) {
      const txt = el.textContent.replace(/\s+/g, " ").trim()
      if (txt === t || txt === ` ${t}` || txt === `${t} `) {
        candidates.push(el)
      }
    }
    // Prefer visible clickable elements
    for (const el of candidates) {
      if (el.offsetParent !== null && (el.tagName === "BUTTON" || el.getAttribute("role") === "button" || el.getAttribute("role") === "option" || el.getAttribute("role") === "radio")) {
        el.click(); return "clicked: " + t + " (via " + el.tagName + " role=" + el.getAttribute("role") + ")"
      }
    }
    // Fallback: try any visible element
    for (const el of candidates) {
      if (el.offsetParent !== null) {
        el.click(); return "clicked: " + t + " (via " + el.tagName + " fallback)"
      }
    }
    return "NOT FOUND: " + t
  }, text)
}

// Step 1: Deselect all
console.log("\n1. Deselect all:", await clickText("Deselect all"))
await new Promise(r => setTimeout(r, 2000))

// Step 2: Select Google Pay
console.log("2. Select Google Pay:", await page.evaluate(() => {
  const el = document.querySelector('[data-id="google_pay"]')
  if (el) { el.click(); return "found via data-id" }
  return "not found"
}))
await new Promise(r => setTimeout(r, 2000))

// Step 3: Click Next step and wait for transition
console.log("\n3. Clicking Next step...")
const nextResult = await clickText("Next step")
console.log("   Result:", nextResult)
console.log("   Waiting for step 2 to activate...")
await new Promise(r => setTimeout(r, 5000))

// Check if step 2 is now active
const step2State = await page.evaluate(() => {
  // Find all c-wiz elements with data-state=2 (step 2 sections)
  const step2s = Array.from(document.querySelectorAll('c-wiz[data-state="2"]'))
  return step2s.map(el => {
    const classes = el.className
    return {
      class: classes,
      disabled: classes.includes("RDPZE"),
      htmlPreview: el.outerHTML.slice(0, 300),
    }
  })
})
console.log("   Step 2 sections: " + JSON.stringify(step2State).slice(0, 300))
for (const s of step2State) {
  console.log("     class:", s.class.slice(0, 80), "disabled:", s.disabled)
}

// Step 4: Select Add to Drive
console.log("\n4. Select Add to Drive:")
const driveResult = await clickText("Add to Drive")
console.log("   Result:", driveResult)
await new Promise(r => setTimeout(r, 2000))

// Step 5: Select .zip (already default) and 2 GB size limit
// (skip - defaults should be fine)

// Step 6: Scroll to Create export and click
console.log("\n5. Looking for Create export...")
await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
await new Promise(r => setTimeout(r, 2000))

const createResult = await clickText("Create export")
console.log("   Result:", createResult)
await new Promise(r => setTimeout(r, 5000))

// Print all batchexecute RPCs captured
console.log("\n" + "=".repeat(80))
console.log("ALL BATCHEXECUTE RPCS")
console.log("=".repeat(80))
const seen = new Set()
for (const r of allReqs) {
  const url = new URL(r.url)
  const rpcids = url.searchParams.get("rpcids") || "unknown"
  const key = rpcids + (r.data ? r.data.slice(30, 100) : "")
  if (seen.has(key)) continue
  seen.add(key)
  console.log("\nRPC:", rpcids)
  console.log("rpcids param:", rpcids)
  if (r.data) {
    const decoded = decodeURIComponent(r.data.replace("f.req=", ""))
    console.log("Payload:", decoded.slice(0, 600))
  }
}

// Final page state
console.log("\n=== Final page ===")
console.log("URL:", page.url())
const finalText = await page.evaluate(() => document.body.innerText.slice(0, 2000))
console.log("Text:", finalText)

await page.screenshot({ path: join(DATA_DIR, "gpay-final.png"), fullPage: true })
console.log("\nScreenshot saved")

await context.close()
