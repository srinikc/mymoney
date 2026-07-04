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

// Collect all JS bundle URLs
const jsUrls = []
page.on("response", async resp => {
  const url = resp.url()
  if (url.includes("_/TakeoutUi/") && resp.request().resourceType() === "script") {
    jsUrls.push(url)
  }
})

await page.goto("https://takeout.google.com", { waitUntil: "networkidle", timeout: 30000 })
if (page.url().includes("accounts.google.com")) { console.log("AUTH_REQUIRED"); process.exit(0) }

console.log("JS bundles loaded:", jsUrls.length)

// Download and search the main JS bundles for RPC patterns
let totalSearched = 0
for (const url of jsUrls) {
  try {
    const resp = await page.request.get(url)
    const text = await resp.text()
    totalSearched += text.length

    // Search for RPC registration patterns
    // Google's batchexecute RPCs are registered as service methods
    // Look for patterns like: rpcids=["XXX"] or "rpcid":"XXX"
    const rpcMatches = text.matchAll(/["']([A-Z][a-z][A-Za-z0-9]{4,7})["'][,\]]/g)
    const rpcs = new Set()
    for (const m of rpcMatches) rpcs.add(m[1])

    // Also look for export-related RPCs
    const exportMatches = text.matchAll(/["']([A-Z][A-Za-z0-9]{5,10})["'][,\]]/g)
    for (const m of exportMatches) {
      const rpc = m[1]
      if (rpc.includes("xport") || rpc.includes("Export") || rpc.includes("Takeout") || rpc.includes("takeout")) {
        console.log("EXPORT RELATED RPC:", rpc, "in", url.slice(-60))
      }
    }

    // Look for "U5lrKc" in case it's defined somewhere
    if (text.includes("U5lrKc") || text.includes("U5lr")) {
      const idx = text.indexOf("U5lrKc")
      console.log("\nFOUND U5lrKc in JS bundle!")
      console.log("Context:", text.slice(Math.max(0, idx - 200), idx + 200))
      console.log("URL:", url.slice(-80))
    }

    if (rpcs.size > 0) {
      console.log(`Bundle ${url.slice(-50)}: ${[...rpcs].slice(0, 10).join(", ")}`)
    }
  } catch {}
}

console.log(`\nTotal JS searched: ${(totalSearched / 1024 / 1024).toFixed(1)} MB`)

// Also try to read the page's internal API
const pageApis = await page.evaluate(() => {
  // Look for RPC registration in the page scope
  const results = []
  // Check _JSS (Google's module system)
  if (typeof _JSS !== "undefined") results.push("_JSS found")
  // Check window scope for batchexecute
  const keys = Object.keys(window).filter(k => k.toLowerCase().includes("rpc") || k.toLowerCase().includes("batch") || k.toLowerCase().includes("takeout"))
  if (keys.length > 0) results.push("keys: " + keys.join(", "))
  return results
})
console.log("Page APIs:", pageApis)

await context.close()
