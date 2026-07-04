import { chromium } from "playwright"
import { join, dirname } from "node:path"
import { fileURLToPath } from "node:url"
import { writeFileSync, mkdirSync } from "node:fs"

const __dirname = dirname(fileURLToPath(import.meta.url))
const PROFILE_DIR = join(__dirname, "..", ".gpay-profile")
const OUT_DIR = join(__dirname, "..", "data", "js-bundles")
mkdirSync(OUT_DIR, { recursive: true })

const context = await chromium.launchPersistentContext(PROFILE_DIR, {
  headless: true,
  channel: "chrome",
  args: ["--no-sandbox", "--disable-setuid-sandbox"],
})
const page = await context.newPage()
page.setDefaultTimeout(30000)

// Collect all loaded JS URLs
const jsUrls = new Set()
page.on("response", async resp => {
  const url = resp.url()
  if (url.includes(".js") && (url.includes("TakeoutUi") || url.includes("boq") || url.includes("identity-frontend"))) {
    jsUrls.add(url)
  }
})

await page.goto("https://takeout.google.com", { waitUntil: "networkidle", timeout: 30000 })
if (page.url().includes("accounts.google.com")) { process.exit(0) }

// Wait for additional lazy-loaded JS
await new Promise(r => setTimeout(r, 3000))

console.log(`Found ${jsUrls.size} JS bundles`)

// Download bundles and search for controllers
let idx = 0
let foundU5lrKc = false
const rpcCandidates = new Set()
const controllerMethods = new Set()

for (const url of jsUrls) {
  try {
    const resp = await page.request.get(url)
    const text = await resp.text()
    idx++

    // Save bundle if under 5MB
    const filename = `bundle-${idx}.js`
    if (text.length < 5 * 1024 * 1024) {
      writeFileSync(join(OUT_DIR, filename), text, "utf-8")
    }

    // Search for U5lrKc
    if (text.includes("U5lrKc")) {
      foundU5lrKc = true
      const pos = text.indexOf("U5lrKc")
      console.log(`\n*** FOUND U5lrKc in ${filename} ***`)
      console.log("Context:", text.slice(Math.max(0, pos - 100), pos + 200))
    }

    // Search for batchexecute RPC registrations
    // Pattern: rpcids=["XXXXXX"] or "rpcId":"XXXXXX"
    const rpcMatches = text.matchAll(/["']([A-Z][a-z][A-Za-z0-9]{4,8})["']\s*(?=\.\s*function|\s*:)/g)
    for (const m of rpcMatches) {
      const name = m[1]
      if (/^[A-Z][a-z][A-Za-z0-9]{4,8}$/.test(name) && !name.includes("_")) {
        rpcCandidates.add(name)
      }
    }

    // Search for controller methods (jscontroller patterns)
    const ctrlMatches = text.matchAll(/jscontroller\s*[:=]\s*["']([A-Za-z0-9]{5,8})["']/g)
    for (const m of ctrlMatches) {
      controllerMethods.add(m[1])
    }

    if (idx % 5 === 0) console.log(`Processed ${idx}/${jsUrls.size} bundles`)
  } catch {}
}

console.log(`\n=== Results ===`)
console.log(`Found U5lrKc: ${foundU5lrKc}`)
console.log(`\nRPC candidates (${rpcCandidates.size}):`)
console.log([...rpcCandidates].sort().slice(0, 50).join(", "))
console.log(`\nController methods (${controllerMethods.size}):`)
console.log([...controllerMethods].sort().join(", "))

// Search for vE1vyb (GPay row controller)
console.log(`\n=== Searching specific controllers ===`)
for (const url of jsUrls) {
  try {
    const resp = await page.request.get(url)
    const text = await resp.text()
    const targets = ["vE1vyb", "etBPYb", "PE3haf", "cOuCgd", "FjfUbe", "OCpkoe", "mtisEf"]
    for (const t of targets) {
      if (text.includes(t)) {
        const pos = text.indexOf(t)
        console.log(`${t} found in ${url.slice(-50)} at pos ${pos}`)
        console.log("  Context:", text.slice(Math.max(0, pos - 150), pos + 150).replace(/\n/g, " ").slice(0, 300))
      }
    }
  } catch {}
}

await context.close()
