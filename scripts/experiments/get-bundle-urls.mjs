import { chromium } from "playwright"
import { join, dirname } from "node:path"
import { fileURLToPath } from "node:url"
import { writeFileSync, mkdirSync, existsSync } from "node:fs"
import { get } from "node:https"

const __dirname = dirname(fileURLToPath(import.meta.url))
const PROFILE_DIR = join(__dirname, "..", ".gpay-profile")
const OUT_DIR = join(__dirname, "..", "data", "js-bundles")
mkdirSync(OUT_DIR, { recursive: true })

function downloadUrl(url) {
  return new Promise((resolve, reject) => {
    const proto = url.startsWith("https") ? require("node:https") : require("node:http")
    proto.get(url, { headers: { "User-Agent": "Mozilla/5.0" } }, (res) => {
      let data = ""
      res.on("data", chunk => data += chunk)
      res.on("end", () => resolve(data))
    }).on("error", reject)
  })
}

const context = await chromium.launchPersistentContext(PROFILE_DIR, {
  headless: true,
  channel: "chrome",
  args: ["--no-sandbox", "--disable-setuid-sandbox"],
})
const page = await context.newPage()
page.setDefaultTimeout(30000)

await page.goto("https://takeout.google.com", { waitUntil: "networkidle", timeout: 30000 })
if (page.url().includes("accounts.google.com")) { process.exit(0) }

// Get all script URLs from the page DOM
const scriptUrls = await page.evaluate(() => {
  return Array.from(document.querySelectorAll("script[src]"))
    .map(s => s.getAttribute("src"))
    .filter(Boolean)
    .filter(src => !src.includes("google-analytics") && !src.includes("doubleclick"))
})

console.log(`Found ${scriptUrls.length} script URLs`)
for (let i = 0; i < Math.min(scriptUrls.length, 30); i++) {
  console.log(`  [${i}] ${scriptUrls[i].slice(-80)}`)
}

// Download each script and search for patterns
const targets = ["U5lrKc", "vE1vyb", "etBPYb", "FjfUbe", "cOuCgd", "OCpkoe", "mtisEf", "batchexecute"]
const results = {}
for (const t of targets) results[t] = false

let dlCount = 0
for (const src of scriptUrls) {
  const fullUrl = src.startsWith("http") ? src : `https://takeout.google.com${src}`
  if (fullUrl.includes(".css") || fullUrl.includes(".png") || fullUrl.includes(".ico")) continue

  try {
    const text = await downloadUrl(fullUrl)
    dlCount++
    const filename = `script-${dlCount}.js`

    // Save large scripts
    if (text.length < 5 * 1024 * 1024) {
      writeFileSync(join(OUT_DIR, filename), text, "utf-8")
    }

    for (const t of targets) {
      if (!results[t] && text.includes(t)) {
        results[t] = true
        const pos = text.indexOf(t)
        console.log(`\n*** FOUND '${t}' in ${filename} ***`)
        console.log(text.slice(Math.max(0, pos - 200), pos + 200).replace(/[\n\r]/g, " "))
      }
    }

    // Search for RPC registrations specifically
    if (!results["RPC_NAMES"] && (text.includes("rpcids") || text.includes("rpcId") || text.includes("rpcid"))) {
      results["RPC_NAMES"] = true
      console.log(`\n*** Found rpc references in ${filename} ***`)
      const lines = text.split("\n").filter(l => l.includes("rpc"))
      for (const line of lines.slice(0, 5)) {
        console.log("  ", line.trim().slice(0, 200))
      }
    }
  } catch {}
}

console.log(`\nDownloaded ${dlCount} scripts`)
console.log("Results:", JSON.stringify(results, null, 2))

// If we didn't find U5lrKc in external scripts, search inline scripts
if (!results["U5lrKc"]) {
  console.log("\n=== Searching inline scripts for U5lrKc ===")
  const inlineU5lr = await page.evaluate(() => {
    for (const script of document.querySelectorAll("script:not([src])")) {
      const text = script.textContent || ""
      if (text.includes("U5lrKc")) return text.slice(text.indexOf("U5lrKc") - 100, text.indexOf("U5lrKc") + 200)
    }
    return "not found"
  })
  console.log(inlineU5lr)

  // Also search for ALL inline script content related to batchexecute
  const inlineContent = await page.evaluate(() => {
    const results = []
    for (const script of document.querySelectorAll("script:not([src])")) {
      const text = script.textContent || ""
      if (text.includes("batchexecute")) {
        const lines = text.split("\n").filter(l => l.includes("batchexecute")).slice(0, 3)
        results.push(...lines.map(l => l.trim().slice(0, 300)))
      }
      if (text.includes("vE1vyb") || text.includes("etBPYb")) {
        results.push("--- Controller script found ---")
        const idx = Math.max(0, text.indexOf("vE1vyb") - 500)
        results.push(text.slice(idx, idx + 1000).replace(/[\n\r]/g, " "))
      }
    }
    return results.slice(0, 10)
  })
  console.log("\nInline batchexecute/controller references:")
  for (const line of inlineContent) {
    console.log("  ", line)
  }
}

await context.close()
