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

await new Promise(r => setTimeout(r, 2000))

// Dump the entire form area HTML to find the export flow
const formHtml = await page.evaluate(() => {
  // Find the form or the main content area
  const main = document.querySelector("form, [role=form], main, [role=main], .kFwPee, [jsmodel]")
  if (!main) return "No main form found"
  
  // Find all buttons and their attributes
  const buttons = Array.from(document.querySelectorAll("button")).map(b => ({
    text: b.textContent.replace(/\s+/g, " ").trim(),
    id: b.id,
    class: b.className.slice(0, 80),
    type: b.type,
    disabled: b.disabled,
    ariaLabel: b.getAttribute("aria-label"),
    dataType: b.getAttribute("data-type"),
    visible: b.offsetParent !== null,
    rect: b.getBoundingClientRect().y < window.innerHeight ? "visible" : "below-fold",
  }))

  // Find the footer/action area
  const footers = Array.from(document.querySelectorAll('[jsaction], [jscontroller]')).filter(el => {
    const t = el.textContent.replace(/\s+/g, " ").trim()
    return t.includes("Create export") || t.includes("Next step") || t.includes("Export")
  }).map(el => ({
    tag: el.tagName,
    text: el.textContent.replace(/\s+/g, " ").trim().slice(0, 200),
    outer: el.outerHTML.slice(0, 500),
  }))

  return { buttons, footers }
})

console.log("=== All Visible Buttons ===")
for (const b of formHtml.buttons) {
  if (b.visible) {
    console.log(`  "${b.text}" disabled=${b.disabled} ariaLabel=${b.ariaLabel} ${b.rect}`)
  }
}

console.log("\n=== Elements containing 'Create export' or 'Next step' ===")
for (const f of formHtml.footers) {
  console.log(`  Tag: ${f.tag}`)
  console.log(`  Text: ${f.text}`)
  console.log(`  HTML: ${f.outer}`)
  console.log("---")
}

// Also dump the DESTINATION section
console.log("\n=== Destination Section HTML ===")
const destHtml = await page.evaluate(() => {
  const allDivs = Array.from(document.querySelectorAll("div, section"))
  for (const el of allDivs) {
    if (el.textContent.includes("Destination") || el.textContent.includes("File type")) {
      const html = el.outerHTML.slice(0, 1500)
      if (html.length > 100) return html
    }
  }
  return "not found"
})
console.log(destHtml)

// Scroll down and see what buttons become visible
console.log("\n=== After scrolling down ===")
await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
await new Promise(r => setTimeout(r, 1000))

const bottomButtons = await page.evaluate(() => {
  return Array.from(document.querySelectorAll("button")).filter(b => b.offsetParent !== null).map(b => ({
    text: b.textContent.replace(/\s+/g, " ").trim(),
    disabled: b.disabled,
    y: b.getBoundingClientRect().y,
    id: b.id,
  }))
})
console.log("Bottom buttons:")
for (const b of bottomButtons) {
  console.log(`  "${b.text}" disabled=${b.disabled} y=${b.y}`)
}

await context.close()
