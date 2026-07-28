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

  const initialCount = await page.evaluate(() => document.querySelectorAll('input[type="checkbox"]:checked').length)
  console.log("Initial checked:", initialCount)

  // Deselect all
  await page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll("button")).find(b => b.textContent.includes("Deselect all"))
    if (btn) btn.click()
  })
  await new Promise(r => setTimeout(r, 3000))

  console.log("After deselect:", await page.evaluate(() => document.querySelectorAll('input[type="checkbox"]:checked').length))

  // Test 1: Call ha(clickEvent) to toggle GPay checkbox
  console.log("\n=== Test: ha(clickEvent) ===")
  const t1 = await page.evaluate(() => {
    const gpay = document.querySelector('[data-id="google_pay"]')
    const container = gpay?.querySelector(".VfPpkd-MPu53c")
    const inst = container?.__jscontroller?.instance
    if (!inst) return "no instance"

    const r = inst.ha(new MouseEvent("click", { bubbles: true, cancelable: true }))
    return {
      haResult: r,
      model: inst.Ka(),
      model2: inst.Qb(),
      hasCheckedClass: container.classList.contains("VfPpkd-MPu53c-OWXEXe-gk6SMd"),
      cssClasses: Array.from(container.classList).filter(c => c.startsWith("VfPpkd-")).join(", "),
      inputChecked: container.querySelector('input')?.checked,
    }
  })
  console.log(JSON.stringify(t1, null, 2))

  // Test 2: Call it again to toggle off
  console.log("\n=== Test: ha(clickEvent) again to toggle off ===")
  const t2 = await page.evaluate(() => {
    const gpay = document.querySelector('[data-id="google_pay"]')
    const container = gpay?.querySelector(".VfPpkd-MPu53c")
    const inst = container?.__jscontroller?.instance
    if (!inst) return "no instance"

    const r = inst.ha(new MouseEvent("click", { bubbles: true, cancelable: true }))
    return {
      haResult: r,
      model: inst.Ka(),
      cssClasses: Array.from(container.classList).filter(c => c.startsWith("VfPpkd-")).join(", "),
      inputChecked: container.querySelector('input')?.checked,
    }
  })
  console.log(JSON.stringify(t2, null, 2))

  // Test 3: Use the outer row's jsaction click handler directly
  // The row has jsaction="JIbuQc:FjfUbe(PE3haf)"
  // PE3haf is the jsname of the checkbox container
  // So FjfUbe is triggered when JIbuQc fires on the row
  console.log("\n=== Test: Trigger JIbuQc on outer row ===")
  const t3 = await page.evaluate(() => {
    const gpay = document.querySelector('[data-id="google_pay"]')
    if (!gpay) return "no gpay"

    const result = {}
    // Try dispatching the WIZ action event
    // The jsaction map uses custom events
    gpay.dispatchEvent(new CustomEvent("JIbuQc", { bubbles: true, cancelable: true, detail: {} }))
    result.afterJIbuQc = gpay.querySelector(".VfPpkd-MPu53c")?.classList.contains("VfPpkd-MPu53c-OWXEXe-gk6SMd")

    // Try the simulated layout click
    // In Google's WIZ, click triggers: mousedown → mouseup → click
    const container = gpay.querySelector(".VfPpkd-MPu53c")
    container.dispatchEvent(new MouseEvent("mousedown", { bubbles: true, cancelable: true }))
    container.dispatchEvent(new MouseEvent("mouseup", { bubbles: true, cancelable: true }))
    container.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }))
    result.afterMouseChain = container.classList.contains("VfPpkd-MPu53c-OWXEXe-gk6SMd")

    return result
  })
  console.log(JSON.stringify(t3, null, 2))

  await context.close()
}
run().catch(e => { console.error(e); process.exit(1) })
