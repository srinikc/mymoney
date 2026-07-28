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
if (page.url().includes("accounts.google.com")) { console.log("AUTH_REQUIRED"); process.exit(0) }

console.log("=== Scripts on page ===")
const scriptInfo = await page.evaluate(() => {
  return Array.from(document.querySelectorAll("script")).map(s => ({
    src: s.getAttribute("src")?.slice(-80) || "inline",
    length: (s.textContent || "").length,
  }))
})
for (const s of scriptInfo) {
  console.log(`  ${s.src ? s.src : "inline"} (${(s.length / 1024).toFixed(1)} KB)`)
}

// Search inline scripts for RPC patterns
const rpcNames = await page.evaluate(() => {
  const exclude = new Set([
    "window", "document", "function", "Promise", "Object", "Array",
    "String", "Number", "Boolean", "Symbol", "Error", "TypeError",
    "null", "undefined", "false", "true", "this", "target",
    "current", "parent", "children", "length", "prototype",
    "constructor", "toString", "valueOf", "hasOwnProperty",
    "addEventListener", "removeEventListener", "querySelector",
    "querySelectorAll", "getElementById", "createElement",
    "getAttribute", "setAttribute", "classList", "style",
    "preventDefault", "stopPropagation", "stopImmediatePropagation",
    "dispatchEvent", "localStorage", "sessionStorage", "JSON",
    "Math", "Date", "RegExp", "Map", "Set", "WeakMap", "WeakSet",
    "console", "location", "navigator", "history", "fetch",
    "requestAnimationFrame", "setTimeout", "setInterval",
    "clearTimeout", "clearInterval", "atob", "btoa", "encodeURI",
    "encodeURIComponent", "decodeURI", "decodeURIComponent",
    "parseInt", "parseFloat", "isNaN", "isFinite",
  ])
  const found = []
  for (const script of document.querySelectorAll("script")) {
    const text = script.textContent || ""
    const matches = text.matchAll(/[\"']([A-Z][a-z][a-zA-Z0-9]{4,8})[\"']\s*[:(,]/g)
    for (const m of matches) {
      const rpc = m[1]
      if (!exclude.has(rpc) && /[a-z]/.test(rpc)) {
        found.push(rpc)
      }
    }
  }
  return [...new Set(found)].sort()
})
console.log("\n=== RPC candidates from inline scripts ===")
console.log(JSON.stringify(rpcNames, null, 2))

// Also look for batchexecute setup code
const batchSetup = await page.evaluate(() => {
  const results = []
  for (const script of document.querySelectorAll("script")) {
    const text = script.textContent || ""
    if (text.includes("batchexecute") || text.includes("Takeout")) {
      const lines = text.split("\n").filter(l => l.includes("batchexecute") || l.includes("Takeout"))
      results.push(...lines.slice(0, 5).map(l => l.trim().slice(0, 200)))
    }
  }
  return results.slice(0, 10)
})
console.log("\n=== batchexecute/Takeout references ===")
for (const ref of batchSetup) {
  console.log("  ", ref)
}

await context.close()
