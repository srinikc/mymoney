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

await page.goto("https://takeout.google.com", { waitUntil: "networkidle", timeout: 30000 })
if (page.url().includes("accounts.google.com")) { console.log("AUTH_REQUIRED"); process.exit(0) }

// Deselect all
await page.locator('button:has-text("Deselect all")').click()
await new Promise(r => setTimeout(r, 3000))

function getState() {
  return page.evaluate(() => {
    const gpay = document.querySelector('[data-id="google_pay"]')
    const cb = gpay?.querySelector('input[type="checkbox"]')
    const container = gpay?.querySelector(".VfPpkd-MPu53c")
    return {
      checked: cb?.checked,
      containerClass: container?.className.slice(0, 80),
      hasCheckedClass: container?.classList.contains("VfPpkd-MPu53c-OWXEXe-gk6SMd"),
    }
  })
}

console.log("State after deselect:", JSON.stringify(await getState()))

// Strategy: Set the checkbox checked property AND add the CSS class manually
await page.evaluate(() => {
  const gpay = document.querySelector('[data-id="google_pay"]')
  const cb = gpay?.querySelector('input[type="checkbox"]')
  const container = gpay?.querySelector(".VfPpkd-MPu53c")
  if (cb && container) {
    cb.checked = true
    container.classList.add("VfPpkd-MPu53c-OWXEXe-gk6SMd")
    // Dispatch change event to notify the framework
    cb.dispatchEvent(new Event("change", { bubbles: true }))
  }
})
await new Promise(r => setTimeout(r, 2000))
console.log("State after manual toggle:", JSON.stringify(await getState()))

// Now also try clicking the outer section DIV which has jsaction="click:Q8pxEc(Ue9tsc)"
await page.evaluate(() => {
  const gpay = document.querySelector('[data-id="google_pay"]')
  const section = gpay?.closest('[jsname="dJqi0b"]')
  // Try clicking a child that doesn't have MDC handler
  const label = gpay?.querySelector(".d4lUWb") // "Google Pay" text
  if (label) {
    label.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true, view: window }))
  }
})
await new Promise(r => setTimeout(r, 2000))
console.log("State after label click:", JSON.stringify(await getState()))

// Try Next step anyway
const nextBtn = page.locator('button:has-text("Next step")')
if (await nextBtn.isVisible()) {
  await nextBtn.click()
  await new Promise(r => setTimeout(r, 5000))
  const step2 = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('c-wiz[data-state="2"]'))
      .map(s => s.className.includes("RDPZE") ? "disabled" : "ACTIVE")
  })
  console.log("After Next step:", step2)

  if (step2.includes("ACTIVE")) {
    await page.getByRole("option", { name: /Add to Drive/i }).click()
    await new Promise(r => setTimeout(r, 2000))
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
    await new Promise(r => setTimeout(r, 1000))
    await page.locator('button:has-text("Create export")').click()
    await new Promise(r => setTimeout(r, 3000))
    console.log("Export created!")
    const result = await page.evaluate(() => document.body.innerText.slice(0, 300))
    console.log("Result:", result)
  }
}

await context.close()
