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
page.setDefaultTimeout(10000)

// Capture ALL network requests (batchexecute, takeout-pa, drive)
const allReqs = []
page.on("request", req => {
  const url = req.url()
  if (url.includes("batchexecute") || url.includes("takeout-pa") || url.includes("drive")) {
    allReqs.push({
      url: url.slice(0, 300),
      method: req.method(),
      data: (req.postData() || "").slice(0, 600),
      ts: Date.now(),
    })
  }
})

await page.goto("https://takeout.google.com", { waitUntil: "networkidle", timeout: 30000 })
if (page.url().includes("accounts.google.com")) { console.log("AUTH_REQUIRED"); process.exit(0) }
console.log("Page loaded")

// DON'T deselect anything - all 65 services are selected by default
// Just scroll to the Next step button and click it
await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
await new Promise(r => setTimeout(r, 2000))

const nextBtn = page.locator('button:has-text("Next step")')
if (await nextBtn.isVisible()) {
  console.log("Clicking Next step...")
  await nextBtn.click()
  await new Promise(r => setTimeout(r, 5000))
  console.log("Done")
}

// Check step 2 state
const step2 = await page.evaluate(() => {
  return Array.from(document.querySelectorAll('c-wiz[data-state="2"]'))
    .map(s => s.className.includes("RDPZE") ? "disabled" : "ACTIVE")
})
console.log("Step 2:", step2)

if (step2.includes("ACTIVE")) {
  console.log("Step 2 is active!")
  // Select Add to Drive
  const driveOpt = page.getByRole("option", { name: /Add to Drive/i })
  const driveCount = await driveOpt.count()
  console.log("Add to Drive options:", driveCount)
  if (driveCount > 0) {
    await driveOpt.first().click()
    console.log("Clicked Add to Drive")
    await new Promise(r => setTimeout(r, 2000))
  }

  // Click Create export
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
  await new Promise(r => setTimeout(r, 1000))

  const createBtn = page.locator('button:has-text("Create export")')
  if (await createBtn.isVisible()) {
    await createBtn.click()
    console.log("Clicked Create export!")
    await new Promise(r => setTimeout(r, 8000))
  }
}

// Print all captured requests
console.log("\n=== Captured network requests ===")
for (const r of allReqs) {
  console.log("---")
  console.log(r.method, r.url.slice(0, 200))
  if (r.data) {
    try {
      const decoded = decodeURIComponent(r.data.replace("f.req=", ""))
      console.log("Data:", decoded.slice(0, 400))
    } catch {}
  }
}

// Take screenshot
await page.screenshot({ path: join(__dirname, "..", "data", "default-flow.png"), fullPage: true })
console.log("\nScreenshot saved")

const finalText = await page.evaluate(() => document.body.innerText.slice(0, 1000))
console.log("Final page:", finalText)

await context.close()
