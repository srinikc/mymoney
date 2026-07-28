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

  // Find all elements with jsaction in the GPay row
  console.log("=== GPay row elements with jsaction ===")
  const info = await page.evaluate(() => {
    const gpay = document.querySelector('[data-id="google_pay"]')
    if (!gpay) return "no gpay"

    const result = []

    // Walk all elements with jsaction attribute
    const walker = document.createTreeWalker(gpay, NodeFilter.SHOW_ELEMENT, {
      acceptNode: (node) => node.hasAttribute("jsaction") ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP
    })
    let node
    while (node = walker.nextNode()) {
      result.push({
        tag: node.tagName,
        className: node.className.slice(0, 60),
        jsaction: node.getAttribute("jsaction"),
        jsname: node.getAttribute("jsname"),
        rect: node.getBoundingClientRect(),
        text: (node.textContent || "").trim().slice(0, 40),
      })
    }
    return result
  })
  console.log(JSON.stringify(info, null, 2))

  // Try clicking the actual label element that contains "Google Pay" text
  console.log("\n=== Try clicking label span ===")
  const clickLabel = await page.evaluate(() => {
    const gpay = document.querySelector('[data-id="google_pay"]')
    const label = gpay?.querySelector('[data-illustration="google_pay"], .VfPpkd-YQNmJ, span')
    // Find the clickable element
    const allSpans = gpay?.querySelectorAll('span, div, label')
    for (const el of allSpans || []) {
      if (el.textContent?.includes("Google Pay") && el.getBoundingClientRect().width > 0) {
        el.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }))
        return "clicked: " + el.tagName + "." + (el.className || "").slice(0, 30)
      }
    }
    return "no label found"
  })
  console.log(clickLabel)

  const afterLabel = await page.evaluate(() => {
    const gpay = document.querySelector('[data-id="google_pay"]')
    const container = gpay?.querySelector(".VfPpkd-MPu53c")
    return {
      checked: gpay?.querySelector('input')?.checked,
      hasCheckedClass: container?.classList.contains("VfPpkd-MPu53c-OWXEXe-gk6SMd"),
    }
  })
  console.log("After label click:", JSON.stringify(afterLabel))

  // Try the VfPpkd-YQNmJ element (MDC label)
  console.log("\n=== Try MDC label element (VfPpkd-YQNmJ) ===")
  await page.evaluate(() => {
    const gpay = document.querySelector('[data-id="google_pay"]')
    const label = gpay?.querySelector(".VfPpkd-YQNmJ")
    if (label) {
      label.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }))
    }
  })
  await new Promise(r => setTimeout(r, 500))
  const afterLabel2 = await page.evaluate(() => {
    const gpay = document.querySelector('[data-id="google_pay"]')
    const container = gpay?.querySelector(".VfPpkd-MPu53c")
    return {
      checked: gpay?.querySelector('input')?.checked,
      hasCheckedClass: container?.classList.contains("VfPpkd-MPu53c-OWXEXe-gk6SMd"),
    }
  })
  console.log("After MDC label click:", JSON.stringify(afterLabel2))

  // Try: programmatic click via Playwright locator on the checkbox container
  // but using keyboard to focus and space to toggle
  console.log("\n=== Try keyboard approach ===")
  await page.evaluate(() => {
    const gpay = document.querySelector('[data-id="google_pay"]')
    const input = gpay?.querySelector('input[type="checkbox"]')
    if (input) {
      input.focus()
    }
  })
  await page.keyboard.press("Space")
  await new Promise(r => setTimeout(r, 1000))

  const afterKeyboard = await page.evaluate(() => {
    const gpay = document.querySelector('[data-id="google_pay"]')
    const container = gpay?.querySelector(".VfPpkd-MPu53c")
    return {
      checked: gpay?.querySelector('input')?.checked,
      hasCheckedClass: container?.classList.contains("VfPpkd-MPu53c-OWXEXe-gk6SMd"),
    }
  })
  console.log("After keyboard space:", JSON.stringify(afterKeyboard))

  // Try: click on input using Playwright dispatcher (not force:true)
  console.log("\n=== Try Playwright click on input ===")
  try {
    await page.locator('[data-id="google_pay"] input[type="checkbox"]').click({ timeout: 5000 })
  } catch {
    console.log("Playwright click on input failed (probably invisible)")
  }
  const afterClick = await page.evaluate(() => {
    const gpay = document.querySelector('[data-id="google_pay"]')
    const container = gpay?.querySelector(".VfPpkd-MPu53c")
    return {
      checked: gpay?.querySelector('input')?.checked,
      hasCheckedClass: container?.classList.contains("VfPpkd-MPu53c-OWXEXe-gk6SMd"),
    }
  })
  console.log("After click on input:", JSON.stringify(afterClick))

  await context.close()
}
run().catch(e => { console.error(e); process.exit(1) })
