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

  await page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll("button")).find(b => b.textContent.includes("Deselect all"))
    if (btn) btn.click()
  })
  await new Promise(r => setTimeout(r, 3000))

  // Approach 1: Focus + Space
  console.log("=== Approach 1: Focus keyboard space ===")
  const gpayInput = page.locator('[data-id="google_pay"] input[type="checkbox"]')
  await gpayInput.focus()
  await page.keyboard.press("Space")
  await new Promise(r => setTimeout(r, 1000))

  const r1 = await page.evaluate(() => {
    const gpay = document.querySelector('[data-id="google_pay"]')
    const container = gpay?.querySelector(".VfPpkd-MPu53c")
    return {
      checked: gpay?.querySelector('input')?.checked,
      hasCheckedClass: container?.classList.contains("VfPpkd-MPu53c-OWXEXe-gk6SMd"),
      selected: document.querySelectorAll('input[type="checkbox"]:checked').length,
    }
  })
  console.log("After key Space:", JSON.stringify(r1))

  // Approach 2: Click the actual input (not container)
  // Toggle off first, then try clicking
  await page.keyboard.press("Space")  // toggle off
  await new Promise(r => setTimeout(r, 500))

  console.log("\n=== Approach 2: Playwright click on input ===")
  // Deselect all first to start clean
  await page.evaluate(() => {
    const btn = document.querySelector('[aria-label="Deselect all"]')
    if (btn) btn.click()
  })
  await new Promise(r => setTimeout(r, 2000))

  const checked0 = await page.evaluate(() => document.querySelectorAll('input[type="checkbox"]:checked').length)
  console.log("After deselect:", checked0)

  // Try clicking the input directly with force:true
  await page.locator('[data-id="google_pay"] input[type="checkbox"]').click({ force: true })
  await new Promise(r => setTimeout(r, 2000))

  const r2 = await page.evaluate(() => {
    const gpay = document.querySelector('[data-id="google_pay"]')
    const container = gpay?.querySelector(".VfPpkd-MPu53c")
    return {
      checked: gpay?.querySelector('input')?.checked,
      hasCheckedClass: container?.classList.contains("VfPpkd-MPu53c-OWXEXe-gk6SMd"),
      cssClasses: Array.from(container?.classList || []).filter(c => c.startsWith("VfPpkd-")).join(", "),
      selected: document.querySelectorAll('input[type="checkbox"]:checked').length,
    }
  })
  console.log("After input click:", JSON.stringify(r2))

  // Approach 3: Click with proper event dispatch on input
  console.log("\n=== Approach 3: simulated click on input from evaluate ===")
  await page.evaluate(() => {
    const btn = document.querySelector('[aria-label="Deselect all"]')
    if (btn) btn.click()
  })
  await new Promise(r => setTimeout(r, 2000))

  const r3 = await page.evaluate(() => {
    const gpay = document.querySelector('[data-id="google_pay"]')
    const input = gpay?.querySelector('input[type="checkbox"]')
    if (!input) return "no input"
    // Chain of events that MDC expects
    input.dispatchEvent(new MouseEvent("mousedown", { bubbles: true, cancelable: true }))
    input.dispatchEvent(new MouseEvent("mouseup", { bubbles: true, cancelable: true }))
    input.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }))
    // Also dispatch focus/blur
    input.dispatchEvent(new Event("focus", { bubbles: true }))
    input.checked = true
    input.dispatchEvent(new Event("change", { bubbles: true }))
    return "done"
  })
  await new Promise(r => setTimeout(r, 1000))
  console.log("simulated result:", r3)

  const r3result = await page.evaluate(() => {
    const gpay = document.querySelector('[data-id="google_pay"]')
    const container = gpay?.querySelector(".VfPpkd-MPu53c")
    return {
      checked: gpay?.querySelector('input')?.checked,
      hasCheckedClass: container?.classList.contains("VfPpkd-MPu53c-OWXEXe-gk6SMd"),
      selected: document.querySelectorAll('input[type="checkbox"]:checked').length,
    }
  })
  console.log("After simulated click:", JSON.stringify(r3result))

  // Test: Can we click "Next step" and reach step 2?
  console.log("\n=== Can we proceed to step 2? ===")
  // First select GPay using keyboard
  await page.evaluate(() => {
    const btn = document.querySelector('[aria-label="Deselect all"]')
    if (btn) btn.click()
  })
  await new Promise(r => setTimeout(r, 2000))

  // Use keyboard space on GPay checkbox
  await page.locator('[data-id="google_pay"] input[type="checkbox"]').focus()
  await page.keyboard.press("Space")
  await new Promise(r => setTimeout(r, 1000))

  // Check current selection
  const beforeNext = await page.evaluate(() => {
    const gpay = document.querySelector('[data-id="google_pay"]')
    return {
      gpayChecked: gpay?.querySelector('input')?.checked,
      gpayHasClass: gpay?.querySelector(".VfPpkd-MPu53c")?.classList.contains("VfPpkd-MPu53c-OWXEXe-gk6SMd"),
      selectedCount: document.querySelectorAll('input[type="checkbox"]:checked').length,
    }
  })
  console.log("Before Next step:", JSON.stringify(beforeNext))

  // Click Next step
  try {
    await page.locator('button:has-text("Next step")').click({ timeout: 5000 })
    console.log("Clicked Next step")
  } catch (e) {
    console.log("Next step click failed:", e.message.slice(0, 100))
    // Try force click
    await page.locator('button:has-text("Next step")').click({ force: true, timeout: 5000 })
    console.log("Force clicked Next step")
  }
  await new Promise(r => setTimeout(r, 3000))

  // Check if we moved to step 2
  const step2 = await page.evaluate(() => {
    // Look for c-wiz data-state indicators
    const wiz = document.querySelector('c-wiz[data-state="2"]')
    const stepIndicator = Array.from(document.querySelectorAll('[role="progressbar"], [role="tab"]')).map(el => ({
      text: el.textContent?.trim(),
      selected: el.getAttribute("aria-selected"),
      state: el.getAttribute("data-state"),
    }))
    return {
      hasStep2: !!wiz,
      pageUrl: window.location.href,
      stepIndicators: stepIndicator,
      // Check if destination options are visible
      hasSendViaEmail: !!document.querySelector('input[value="SEND_VIA_EMAIL"], [data-value="SEND_VIA_EMAIL"]'),
      hasAddToDrive: !!document.querySelector('[data-value="ADD_TO_DRIVE"], input[value="ADD_TO_DRIVE"]'),
    }
  })
  console.log("Step 2 state:", JSON.stringify(step2, null, 2))

  await context.close()
}
run().catch(e => { console.error(e); process.exit(1) })
