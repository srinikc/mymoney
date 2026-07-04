import { chromium } from "playwright"
import { join, dirname } from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = dirname(fileURLToPath(import.meta.url))
const PROFILE_DIR = join(__dirname, "..", ".gpay-profile")

async function run() {
  const context = await chromium.launchPersistentContext(PROFILE_DIR, {
    headless: true,
    channel: "chrome",
  })
  const page = await context.newPage()
  page.setDefaultTimeout(10000)

  await page.goto("https://takeout.google.com", { waitUntil: "networkidle", timeout: 30000 })
  if (page.url().includes("accounts.google.com")) { process.exit(0) }
  await new Promise(r => setTimeout(r, 2000))

  // Deselect all, select GPay, go to step 2
  await page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll("button")).find(b => b.textContent.includes("Deselect all"))
    if (btn) btn.click()
  })
  await new Promise(r => setTimeout(r, 2000))

  await page.locator('[data-id="google_pay"] input[type="checkbox"]').click({ force: true })
  await new Promise(r => setTimeout(r, 1000))

  await page.locator('button:has-text("Next step")').first().click({ timeout: 5000 })
  await new Promise(r => setTimeout(r, 3000))

  // Deep inspect the destination combobox
  console.log("=== Destination combobox DOM ===")
  const destInfo = await page.evaluate(() => {
    // Find the text "Send download link via email" and its parent structure
    const texts = document.body.innerText
    const destSection = texts.indexOf("Destination")
    const surroundText = texts.slice(Math.max(0, destSection - 50), destSection + 500)

    // Find the combobox element
    const combobox = document.querySelector('[role="combobox"]')
    if (!combobox) return { text: surroundText, combobox: null }

    const result = {
      text: surroundText,
      combobox: {
        tag: combobox.tagName,
        class: combobox.className.slice(0, 100),
        id: combobox.id,
        ariaLabel: combobox.getAttribute("aria-label"),
        ariaExpanded: combobox.getAttribute("aria-expanded"),
        text: combobox.textContent?.trim().slice(0, 50),
        innerHTML: combobox.innerHTML.slice(0, 300),
      }
    }

    // Find the dropdown list items
    const listItems = document.querySelectorAll('[role="option"], [data-value]')
    result.options = Array.from(listItems).map(el => ({
      tag: el.tagName,
      dataValue: el.getAttribute("data-value"),
      role: el.getAttribute("role"),
      text: el.textContent?.trim().slice(0, 50),
      class: el.className.slice(0, 60),
      parentTag: el.parentElement?.tagName,
      parentClass: el.parentElement?.className?.slice(0, 60),
    }))

    return result
  })
  console.log(JSON.stringify(destInfo, null, 2))

  // Try clicking the combobox to open its dropdown
  console.log("\n=== Clicking combobox ===")
  await page.evaluate(() => {
    const combobox = document.querySelector('[role="combobox"]')
    if (combobox) {
      combobox.scrollIntoView()
      combobox.click()
    }
  })
  await new Promise(r => setTimeout(r, 2000))

  // Check if dropdown appeared
  const afterClick = await page.evaluate(() => {
    const combobox = document.querySelector('[role="combobox"]')
    const expanded = combobox?.getAttribute("aria-expanded")
    const listItems = document.querySelectorAll('[role="option"]')
    return {
      expanded,
      listItemsCount: listItems.length,
      listItems: Array.from(listItems).map(el => ({
        text: el.textContent?.trim().slice(0, 50),
        dataValue: el.getAttribute("data-value"),
        display: window.getComputedStyle(el).display,
        visibility: window.getComputedStyle(el).visibility,
        offsetParent: !!el.offsetParent,
      })),
    }
  })
  console.log(JSON.stringify(afterClick, null, 2))

  await context.close()
}
run().catch(e => { console.error(e); process.exit(1) })
