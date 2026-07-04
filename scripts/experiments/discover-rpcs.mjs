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

// Capture all JS responses to find RPC registrations
let jsBundles = []
page.on("response", async resp => {
  const url = resp.url()
  if (url.includes("_/TakeoutUi/") && (url.includes(".js") || url.includes("jsrenderer"))) {
    try {
      const text = await resp.text()
      jsBundles.push({ url: url.slice(0, 200), length: text.length, text: text.slice(0, 2000) })
    } catch {}
  }
})

await page.goto("https://takeout.google.com", { waitUntil: "networkidle", timeout: 30000 })
if (page.url().includes("accounts.google.com")) { console.log("AUTH_REQUIRED"); process.exit(0) }

// Search all loaded JS for RPC registrations
console.log("=== Searching JS bundles for RPC patterns ===")
const searchResults = []
for (const bundle of jsBundles) {
  const text = bundle.text
  // Look for RPC registration patterns
  const rpcMatches = text.matchAll(/["']([A-Z][a-zA-Z0-9]{5,7})["'][,)]/g)
  for (const match of rpcMatches) {
    searchResults.push({ rpc: match[1], in: bundle.url.slice(60, 120) })
  }
}

// Also search the page directly
const pageRpcs = await page.evaluate(() => {
  const results = []
  // Search inline scripts
  const scripts = document.querySelectorAll("script:not([src])")
  for (const script of scripts) {
    const text = script.textContent || ""
    const matches = text.matchAll(/["']([A-Z][a-zA-Z0-9]{5,7})["']/g)
    for (const m of matches) {
      if (!m[1].startsWith("AF") && !m[1].startsWith("AB")) {
        results.push(m[1])
      }
    }
  }
  return [...new Set(results)]
})

console.log("RPCs found in page:", pageRpcs.slice(0, 30))
if (pageRpcs.length > 0) {
  console.log("All:", pageRpcs)
}

console.log("\n=== RPCs found in bundles (unique) ===")
const uniqueRpcs = [...new Set(searchResults.map(r => r.rpc))]
console.log("Count:", uniqueRpcs.length)
console.log("Sample:", uniqueRpcs.slice(0, 50))

// Check for the specific batchexecute network calls
// Intercept and see what RPCs fire during Deselect all
console.log("\n=== Monitoring RPCs during Deselect all click ===")
const batchReqs = []
page.on("request", req => {
  if (req.url().includes("batchexecute")) {
    const url = new URL(req.url())
    batchReqs.push({
      rpcids: url.searchParams.get("rpcids"),
      data: (req.postData() || "").slice(0, 400),
    })
  }
})

await page.locator('button:has-text("Deselect all")').click()
await new Promise(r => setTimeout(r, 5000))

console.log("RPCs during Deselect all:")
for (const r of batchReqs) {
  console.log("  rpcids:", r.rpcids)
  if (r.data) {
    const decoded = decodeURIComponent(r.data.replace("f.req=", ""))
    console.log("  payload:", decoded.slice(0, 400))
  }
  console.log("  ---")
}

await context.close()
