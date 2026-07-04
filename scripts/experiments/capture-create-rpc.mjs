import { chromium } from "playwright"
import { join, dirname } from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = dirname(fileURLToPath(import.meta.url))
const PROFILE_DIR = join(__dirname, "..", ".gpay-profile")

async function run() {
  const context = await chromium.launchPersistentContext(PROFILE_DIR, {
    headless: true,
    channel: "chrome",
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  })
  const page = await context.newPage()
  page.setDefaultTimeout(10000)

  // Capture batchexecute responses
  const capturedResps = []
  page.on("response", async resp => {
    if (resp.url().includes("batchexecute") || resp.url().includes("/_/TakeoutUi/")) {
      try {
        const text = await resp.text()
        capturedResps.push({
          url: resp.url().slice(0, 300),
          status: resp.status(),
          body: text.slice(0, 3000),
        })
      } catch {}
    }
  })

  await page.goto("https://takeout.google.com", { waitUntil: "networkidle", timeout: 30000 })
  if (page.url().includes("accounts.google.com")) { process.exit(0) }
  await new Promise(r => setTimeout(r, 3000))

  console.log(`Initial batchexecute responses: ${capturedResps.length}`)

  // Deselect all, select only GPay
  await page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll("button")).find(b => b.textContent.includes("Deselect all"))
    if (btn) btn.click()
  })
  await new Promise(r => setTimeout(r, 3000))

  await page.locator('[data-id="google_pay"] input[type="checkbox"]').click({ force: true })
  await new Promise(r => setTimeout(r, 1000))

  const beforeStep2 = capturedResps.length
  await page.locator('button:has-text("Next step")').first().click({ timeout: 5000 })
  await new Promise(r => setTimeout(r, 3000))
  console.log(`Responses after Next step: ${capturedResps.length - beforeStep2}`)

  const beforeCreate = capturedResps.length
  await page.locator('button:has-text("Create export")').click({ timeout: 10000 })
  await new Promise(r => setTimeout(r, 5000))
  console.log(`Responses after Create export: ${capturedResps.length - beforeCreate}`)

  // Print all unique responses
  console.log("\n=== All batchexecute responses ===")
  for (let i = 0; i < capturedResps.length; i++) {
    const resp = capturedResps[i]
    console.log(`--- Response ${i} ---`)
    console.log(`URL: ${resp.url}`)
    console.log(`Status: ${resp.status}`)
    // Try to parse and extract RPC name + data
    let text = resp.body
    if (text.startsWith(")]}'\n")) text = text.slice(5)
    try {
      const parsed = JSON.parse(text)
      if (Array.isArray(parsed) && parsed.length > 0) {
        const first = Array.isArray(parsed[0]) ? parsed[0][0] : parsed[0]
        console.log(`RPC: ${JSON.stringify(first).slice(0, 200)}`)
      } else {
        console.log(`Data: ${JSON.stringify(parsed).slice(0, 300)}`)
      }
    } catch {
      console.log(`Raw (first 500): ${text.slice(0, 500)}`)
    }
  }

  await context.close()
}
run().catch(e => { console.error(e); process.exit(1) })
