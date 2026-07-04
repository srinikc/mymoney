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

  await page.goto("https://takeout.google.com", { waitUntil: "networkidle", timeout: 30000 })
  if (page.url().includes("accounts.google.com")) { process.exit(0) }
  await new Promise(r => setTimeout(r, 2000))

  // Deselect all, select only GPay
  await page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll("button")).find(b => b.textContent.includes("Deselect all"))
    if (btn) btn.click()
  })
  await new Promise(r => setTimeout(r, 3000))

  await page.locator('[data-id="google_pay"] input[type="checkbox"]').click({ force: true })
  await new Promise(r => setTimeout(r, 1000))

  // Click Next step
  await page.locator('button:has-text("Next step")').click({ force: true })
  await new Promise(r => setTimeout(r, 3000))

  // Analyze step 2
  console.log("=== Step 2: Destination & Delivery ===")
  const step2 = await page.evaluate(() => {
    const result = { forms: [], buttons: [] }

    // Find all form elements
    document.querySelectorAll('input, select, [role="radio"], [role="combobox"], label').forEach(el => {
      const tag = el.tagName
      const type = el.getAttribute("type")
      const name = el.getAttribute("name")
      const value = el.getAttribute("value")
      const text = (el.textContent || el.getAttribute("aria-label") || "").trim().slice(0, 40)
      const role = el.getAttribute("role")
      const classes = el.className?.slice(0, 40) || ""

      if (value || text || name || role) {
        result.forms.push({ tag, type, name, value, text, role, classes, checked: el.checked })
      }
    })

    document.querySelectorAll('button').forEach(b => {
      result.buttons.push({
        text: b.textContent.trim().slice(0, 50),
        type: b.getAttribute("type"),
        disabled: b.disabled,
      })
    })

    // Find the visible step content
    const visibleSections = Array.from(document.querySelectorAll('[class*="step"], [class*="content"], section, [role="main"]'))
      .filter(s => s.offsetHeight > 0 && s.textContent.trim().length > 10)
      .map(s => ({
        tag: s.tagName,
        text: s.textContent.trim().slice(0, 120),
        class: s.className.slice(0, 40),
      }))
    result.visibleSections = visibleSections.slice(0, 5)

    return result
  })
  console.log(JSON.stringify(step2, null, 2))

  // Try to select "Send via email" option
  console.log("\n=== Looking for destination options ===")
  const destOpts = await page.evaluate(() => {
    // Find the destination selection
    const containers = document.querySelectorAll('[data-value], [role="radio"], [jsname]')
    const results = []
    containers.forEach(el => {
      const dv = el.getAttribute("data-value")
      const role = el.getAttribute("role")
      const text = (el.textContent || "").trim().slice(0, 40)
      const jsname = el.getAttribute("jsname")
      if (dv || role === "radio") {
        results.push({ dataValue: dv, role, text, jsname, tag: el.tagName, class: el.className.slice(0, 50) })
      }
    })
    return results
  })
  console.log(JSON.stringify(destOpts, null, 2))

  await context.close()
}
run().catch(e => { console.error(e); process.exit(1) })
