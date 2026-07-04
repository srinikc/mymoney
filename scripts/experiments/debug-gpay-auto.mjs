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

const reqs = []
page.on("request", req => {
  if (req.url().includes("batchexecute")) {
    reqs.push({ url: req.url(), data: req.postData() || "", ts: Date.now() })
  }
})

async function clickByText(text) {
  const strategies = [
    () => page.getByRole("button", { name: text, exact: false }).click(),
    () => page.getByRole("button", { name: text }).click(),
    () => page.locator(`button:has-text("${text}")`).first().click(),
    () => page.locator(`[role="button"]:has-text("${text}")`).first().click(),
    () => page.locator(`text="${text}"`).first().click(),
    () => page.getByText(text, { exact: false }).click(),
    () => page.evaluate((t) => {
      const all = document.querySelectorAll("button, [role=button], [role=option], [role=radio], a, label, span")
      for (const el of all) {
        const txt = el.textContent.replace(/\s+/g, " ").trim()
        if (txt === t || txt.includes(t)) { el.click(); return true }
      }
      return false
    }, text),
  ]
  for (const s of strategies) {
    try { await s(); return true } catch {}
  }
  return false
}

await page.goto("https://takeout.google.com", { waitUntil: "networkidle", timeout: 30000 })
if (page.url().includes("accounts.google.com")) { console.log("AUTH_REQUIRED"); process.exit(0) }
console.log("Page loaded, logged in!")

// Phase 1: Deselect all
console.log("\n=== PHASE 1: Deselect all ===")
const deselectOk = await clickByText("Deselect all")
console.log("Deselect all clicked:", deselectOk)
await new Promise(r => setTimeout(r, 2000))

// Phase 2: Select Google Pay
console.log("\n=== PHASE 2: Select Google Pay ===")
const gpaySel = await page.evaluate(() => {
  const el = document.querySelector('[data-id="google_pay"]')
  if (el) { el.click(); return "found by data-id" }
  return "not found"
})
console.log("Google Pay selection:", gpaySel)

if (gpaySel === "not found") {
  const gpayByText = await clickByText("Google Pay")
  console.log("Google Pay by text:", gpayByText)
}
await new Promise(r => setTimeout(r, 2000))

// Phase 3: Click Next step
console.log("\n=== PHASE 3: Next step ===")
const nextOk = await clickByText("Next step")
console.log("Next step clicked:", nextOk)
console.log("Waited for page transition...")
await new Promise(r => setTimeout(r, 5000))

// Print current page state
const pageState3 = await page.evaluate(() => {
  return {
    url: window.location.href,
    buttons: Array.from(document.querySelectorAll("button")).map(b => b.textContent.trim()).slice(0, 20),
    roles: Array.from(document.querySelectorAll('[role="option"], [role="radio"]')).map(el => ({ text: el.textContent.trim().slice(0, 50), role: el.getAttribute("role") })),
    h1: document.querySelector("h1, h2, h3")?.textContent?.slice(0, 100),
    bodyStart: document.body.innerText.slice(0, 500),
  }
})
console.log("Page state after Next:", JSON.stringify(pageState3, null, 2))

// Phase 4: Choose Add to Drive
console.log("\n=== PHASE 4: Add to Drive ===")
const driveOk = await clickByText("Add to Drive")
console.log("Add to Drive clicked:", driveOk)
await new Promise(r => setTimeout(r, 2000))

// Phase 5: Create export
console.log("\n=== PHASE 5: Create export ===")

// Listen for requests after this point
const postCreateReqs = []
page.on("request", req => {
  if (req.url().includes("batchexecute") || req.url().includes("takeout-pa")) {
    postCreateReqs.push({ url: req.url(), data: req.postData() || "", ts: Date.now() })
  }
})

const createOk = await clickByText("Create export")
console.log("Create export clicked:", createOk)
await new Promise(r => setTimeout(r, 8000))

// Print all captured RPCs
console.log("\n" + "=".repeat(80))
console.log("ALL CAPTURED RPCs")
console.log("=".repeat(80))
for (const r of reqs) {
  const url = new URL(r.url)
  console.log("\nRPC ID:", url.searchParams.get("rpcids"))
  if (r.data) {
    const decoded = decodeURIComponent(r.data.replace("f.req=", ""))
    console.log("Payload:", decoded.slice(0, 400))
  }
}

console.log("\n" + "=".repeat(80))
console.log("POST-CREATE RPCs")
console.log("=".repeat(80))
for (const r of postCreateReqs) {
  const url = new URL(r.url)
  console.log("\nRPC ID:", url.searchParams.get("rpcids"))
  if (r.data) {
    const decoded = decodeURIComponent(r.data.replace("f.req=", ""))
    console.log("Payload:", decoded.slice(0, 400))
  }
}

// Print page content
console.log("\n=== Page URL:", page.url())
const bodyText = await page.evaluate(() => document.body.innerText.slice(0, 1000))
console.log("Page text:", bodyText)

// Take screenshot
await page.screenshot({ path: join(__dirname, "..", "data", "gpay-debug.png"), fullPage: true })
console.log("\nScreenshot saved")

await context.close()
