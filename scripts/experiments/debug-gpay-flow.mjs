import { chromium } from "playwright"
import { join, dirname } from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = dirname(fileURLToPath(import.meta.url))
const PROFILE_DIR = join(__dirname, "..", ".gpay-profile")

const context = await chromium.launchPersistentContext(PROFILE_DIR, {
  headless: false,  // visible so we can see it
  channel: "chrome",
  args: ["--no-sandbox", "--disable-setuid-sandbox"],
})
const page = await context.newPage()

const reqs = []
page.on("request", req => {
  if (req.url().includes("batchexecute")) {
    const data = req.postData() || ""
    reqs.push({
      url: req.url(),
      body: data.slice(0, 800),
      ts: Date.now(),
    })
  }
})

await page.goto("https://takeout.google.com", { waitUntil: "networkidle", timeout: 30000 })
if (page.url().includes("accounts.google.com")) { console.log("AUTH_REQUIRED"); process.exit(0) }

console.log("=== Page loaded. Press ENTER after you manually:")
console.log("1. Click 'Deselect all'")
console.log("2. Click 'Google Pay' to select it")
console.log("3. Click 'Next step'")
console.log("4. Choose 'Add to Drive' as delivery method")
console.log("5. Click 'Create export'")
console.log("Then press ENTER here...")

// Wait for user input
await new Promise(resolve => {
  process.stdin.once("data", resolve)
})

console.log("\n=== Captured batchexecute requests ===")
for (const r of reqs) {
  const url = new URL(r.url)
  console.log("RPC ID:", url.searchParams.get("rpcids"))
  console.log("Body:", decodeURIComponent(r.body.replace("f.req=", "")).slice(0, 500))
  console.log("---")
}

await context.close()
