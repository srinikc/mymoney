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

await page.goto("https://takeout.google.com", { waitUntil: "networkidle", timeout: 30000 })
if (page.url().includes("accounts.google.com")) { process.exit(0) }

// Extract inline script contents and save them
const inlineScripts = await page.evaluate(() => {
  return Array.from(document.querySelectorAll("script:not([src])"))
    .map(s => (s.textContent || "").length > 1000 ? (s.textContent || "").slice(0, 200000) : "")
    .filter(Boolean)
})

console.log(`Found ${inlineScripts.length} inline scripts with content`)

// Save each inline script
for (let i = 0; i < inlineScripts.length; i++) {
  const filename = `inline-${i + 1}.js`
  writeFileSync(join(OUT_DIR, filename), inlineScripts[i], "utf-8")
  console.log(`Saved ${filename} (${(inlineScripts[i].length / 1024).toFixed(1)} KB)`)
}

// Now search through them in Node.js (not in page context)
console.log("\n=== Searching for U5lrKc ===")
for (let i = 0; i < inlineScripts.length; i++) {
  const text = inlineScripts[i]
  if (text.includes("U5lrKc")) {
    const pos = text.indexOf("U5lrKc")
    console.log(`Found in inline-${i + 1}.js`)
    console.log("Context:", text.slice(Math.max(0, pos - 200), pos + 300).replace(/[\n\r]/g, " "))
  }
}

console.log("\n=== Searching for vE1vyb ===")
for (let i = 0; i < inlineScripts.length; i++) {
  const text = inlineScripts[i]
  if (text.includes("vE1vyb")) {
    const pos = text.indexOf("vE1vyb")
    console.log(`Found in inline-${i + 1}.js`)
    console.log("Context:", text.slice(Math.max(0, pos - 200), pos + 500).replace(/[\n\r]/g, " "))
  }
}

console.log("\n=== Searching for etBPYb ===")
for (let i = 0; i < inlineScripts.length; i++) {
  const text = inlineScripts[i]
  if (text.includes("etBPYb")) {
    const pos = text.indexOf("etBPYb")
    console.log(`Found in inline-${i + 1}.js`)
    console.log("Context:", text.slice(Math.max(0, pos - 200), pos + 500).replace(/[\n\r]/g, " "))
  }
}

console.log("\n=== Searching for OCpkoe (Next step jsname) ===")
for (let i = 0; i < inlineScripts.length; i++) {
  const text = inlineScripts[i]
  if (text.includes("OCpkoe") || text.includes("Next step")) {
    const pos = text.indexOf("OCpkoe") >= 0 ? text.indexOf("OCpkoe") : text.indexOf("Next step")
    console.log(`Found in inline-${i + 1}.js`)
    console.log("Context:", text.slice(Math.max(0, pos - 200), pos + 500).replace(/[\n\r]/g, " "))
  }
}

// Search for batchexecute RPC registration patterns
console.log("\n=== Searching for batchexecute RPC patterns ===")
for (let i = 0; i < inlineScripts.length; i++) {
  const text = inlineScripts[i]
  // Look for patterns like: methodName:function or "RPC_NAME":
  const matches = text.matchAll(/["']([A-Z][a-z][A-Za-z0-9]{4,8})["']\s*[:(]/g)
  const rpcs = new Set()
  for (const m of matches) {
    const rpc = m[1]
    if (/^[A-Z][a-z][A-Za-z0-9]{4,8}$/.test(rpc) && !["Window", "Document", "Function", "Promise", "Object", "Array", "String", "Number", "Boolean", "Symbol", "Error", "Default", "Remove", "Visitor", "Android", "Chromium", "Safari", "Firefox", "Webkit", "Windows"].includes(rpc)) {
      rpcs.add(rpc)
    }
  }
  if (rpcs.size > 0) {
    console.log(`\ninline-${i + 1}.js RPCs:`, [...rpcs].slice(0, 30).join(", "))
  }
}

// NEW: Search for mtisEf (Create export jsname)
console.log("\n=== Searching for mtisEf (Create export) ===")
for (let i = 0; i < inlineScripts.length; i++) {
  const text = inlineScripts[i]
  if (text.includes("mtisEf")) {
    const pos = text.indexOf("mtisEf")
    console.log(`Found in inline-${i + 1}.js`)
    console.log("Context:", text.slice(Math.max(0, pos - 200), pos + 500).replace(/[\n\r]/g, " "))
  }
}

await context.close()
