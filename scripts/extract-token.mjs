// One-time helper: extracts the gdrive_token cookie from the local browser
// and saves it so the standalone backfill script can use it.
// Usage: node scripts/extract-token.mjs
//
// Requires Chrome with an active session on http://localhost:3005

import { chromium } from "playwright"
import { writeFileSync, mkdirSync } from "node:fs"
import { join, dirname } from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, "..")

async function main() {
  console.log("Launching Chrome to extract gdrive_token cookie...")
  console.log("(Using your existing Chrome installation)")
  
  const browser = await chromium.launch({ channel: "chrome", headless: false })
  const context = browser.newContext()
  const page = await (await context).newPage()
  
  try {
    await page.goto("http://localhost:3005", { waitUntil: "networkidle", timeout: 15000 })
    
    const cookies = await context.cookies("http://localhost:3005")
    const gdriveCookie = cookies.find(c => c.name === "gdrive_token")
    
    if (!gdriveCookie) {
      console.log("No gdrive_token cookie found. Make sure you're logged into the mymoney app.")
      await browser.close()
      process.exit(1)
    }
    
    const token = JSON.parse(decodeURIComponent(gdriveCookie.value))
    const dir = join(ROOT, "data")
    mkdirSync(dir, { recursive: true })
    writeFileSync(join(dir, ".gdrive-refresh-token.json"), JSON.stringify(token, null, 2))
    console.log("Token saved to data/.gdrive-refresh-token.json")
    console.log("Email:", token.email || "unknown")
    
    await browser.close()
  } catch (err) {
    console.error("Error:", err.message)
    await browser.close().catch(() => {})
    process.exit(1)
  }
}

main()
