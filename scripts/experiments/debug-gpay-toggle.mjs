import { chromium } from "playwright"
import { join, dirname } from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = dirname(fileURLToPath(import.meta.url))
const PROFILE_DIR = join(__dirname, "..", ".gpay-profile")
const DATA_DIR = join(__dirname, "..", "data")

const context = await chromium.launchPersistentContext(PROFILE_DIR, {
  headless: true,
  channel: "chrome",
  args: ["--no-sandbox", "--disable-setuid-sandbox"],
})
const page = await context.newPage()
page.setDefaultTimeout(10000)

await page.goto("https://takeout.google.com", { waitUntil: "networkidle", timeout: 30000 })
if (page.url().includes("accounts.google.com")) { console.log("AUTH_REQUIRED"); process.exit(0) }

console.log("=== Investigating Google Pay toggle structure ===")

// Find the Google Pay DOM subtree
const gpayHtml = await page.evaluate(() => {
  const gpay = document.querySelector('[data-id="google_pay"]')
  if (!gpay) return "NOT FOUND"
  
  // Find all interactive elements within
  const interactive = Array.from(gpay.querySelectorAll("button, [role=checkbox], [role=switch], [role=button], input, label, a, [jsaction]"))
    .map(el => ({
      tag: el.tagName,
      role: el.getAttribute("role"),
      ariaChecked: el.getAttribute("aria-checked"),
      ariaLabel: el.getAttribute("aria-label"),
      class: el.className.slice(0, 60),
      onclick: el.getAttribute("onclick") ? "yes" : "no",
      jsaction: el.getAttribute("jsaction")?.slice(0, 60),
      text: el.textContent.replace(/\s+/g, " ").trim().slice(0, 80),
    }))
  
  // Also dump the outer HTML
  return {
    outerHTML: gpay.outerHTML.slice(0, 2000),
    interactive,
    className: gpay.className,
  }
})
console.log("\nGoogle Pay outer HTML:")
console.log(gpayHtml.outerHTML || gpayHtml)
console.log("\nInteractive elements within:")
for (const el of gpayHtml.interactive || []) {
  console.log(`  ${el.tag} role=${el.role} checked=${el.ariaChecked} label=${el.ariaLabel}`)
  console.log(`    text="${el.text}" jsaction=${el.jsaction}`)
}

// Also check if there's a nearby checkbox
console.log("\n=== All elements around Google Pay ===")
const nearby = await page.evaluate(() => {
  const gpay = document.querySelector('[data-id="google_pay"]')
  if (!gpay) return {}
  const parent = gpay.closest('[role=group], [role=listbox], section, div')
  if (!parent) return {}
  const items = Array.from(parent.querySelectorAll('[role=checkbox], [role=switch], [aria-checked], input[type=checkbox]'))
    .map(el => ({
      tag: el.tagName,
      role: el.getAttribute("role"),
      checked: el.getAttribute("aria-checked") || el.checked,
      id: el.id,
      for: el.getAttribute("for"),
      text: el.textContent.replace(/\s+/g, " ").trim().slice(0, 60),
      parentDataId: el.closest("[data-id]")?.getAttribute("data-id"),
    }))
  return { items, parentTag: parent.tagName }
})
console.log("Checkbox/switch elements:")
for (const item of nearby.items || []) {
  console.log(`  ${item.tag} role=${item.role} checked=${item.checked} data-id=${item.parentDataId} text="${item.text}"`)
}

// Try clicking various elements to select GPay
console.log("\n=== Trying to select Google Pay ===")

// First deselect all
await page.evaluate(() => {
  const deselect = Array.from(document.querySelectorAll("button")).find(b => b.textContent.includes("Deselect all"))
  if (deselect) deselect.click()
})
await new Promise(r => setTimeout(r, 2000))
console.log("After deselect all: count =", await page.evaluate(() => {
  const sel = document.querySelector('[data-state="1"]')?.querySelector('[jsname="dJqi0b"]')
  if (sel) return sel.textContent.slice(0, 100)
  const pills = document.querySelector('[aria-label*="selected"]')?.ariaLabel
  return pills || "?"
}))

// Strategy 1: Click the role=checkbox or role=switch within Google Pay
const s1 = await page.evaluate(() => {
  const gpay = document.querySelector('[data-id="google_pay"]')
  if (!gpay) return "no gpay element"
  const cb = gpay.querySelector('[role="checkbox"], [role="switch"], [aria-checked]')
  if (cb) { cb.click(); return "clicked " + cb.tagName + " role=" + cb.getAttribute("role") }
  // Try clicking the heading area
  const heading = gpay.querySelector("h3, h4, h5, .header, .title, span")
  if (heading) { heading.click(); return "clicked heading: " + heading.textContent.trim().slice(0, 30) }
  return "nothing found to click"
})
console.log("Strategy 1:", s1)
await new Promise(r => setTimeout(r, 2000))
console.log("Count after:", await page.evaluate(() => {
  const h = document.querySelector('[data-state="1"] h2, [data-state="1"] h3, [data-state="1"] h4')
  if (h) return h.textContent
  return "?"
}))

// Strategy 2: Try clicking a label/span inside Google Pay  
const s2 = await page.evaluate(() => {
  const gpay = document.querySelector('[data-id="google_pay"]')
  if (!gpay) return "no gpay"
  // Try all clickable children
  const clickables = gpay.querySelectorAll("span, div, label, a")
  for (const el of clickables) {
    const txt = el.textContent.trim()
    if (txt === "Google Pay" && el.offsetParent !== null) {
      el.click()
      return "clicked span with text: Google Pay"
    }
  }
  // Try the first visible child
  for (const el of clickables) {
    if (el.offsetParent !== null && el.textContent.trim()) {
      el.click()
      return "clicked: " + el.tagName + " text:" + el.textContent.trim().slice(0, 30)
    }
  }
  return "nothing"
})
console.log("Strategy 2:", s2)
await new Promise(r => setTimeout(r, 2000))
console.log("After strategy 2:", await page.evaluate(() => document.body.innerText.slice(0, 300)))

await context.close()
