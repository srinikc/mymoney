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

const requestUrls = []
page.on("request", req => {
  if (req.url().includes("/_/TakeoutUi/data/batchexecute")) {
    requestUrls.push({ url: req.url().slice(0, 400), method: req.method(), postData: req.postData()?.slice(0, 500) })
  }
})

await page.goto("https://takeout.google.com", { waitUntil: "networkidle", timeout: 30000 })
if (page.url().includes("accounts.google.com")) { console.log("AUTH_REQUIRED"); await context.close(); process.exit(0) }

await new Promise(r => setTimeout(r, 3000))

const html = await page.evaluate(() => {
  const serviceItems = Array.from(document.querySelectorAll('[role="listbox"] [role="option"], [role="listbox"] [role="checkbox"], [role="group"] [role="option"], [role="group"] [role="checkbox"]'))
    .map(el => ({ text: el.textContent?.trim()?.slice(0, 80), role: el.getAttribute("role"), checked: el.getAttribute("aria-checked"), id: el.id, dataId: el.getAttribute("data-id") }))

  const buttons = Array.from(document.querySelectorAll("button, [role=button]"))
    .map(el => ({ text: el.textContent?.trim()?.slice(0, 60), tagName: el.tagName, role: el.getAttribute("role"), disabled: el.disabled || el.getAttribute("aria-disabled") }))

  const dataIds = Array.from(document.querySelectorAll("[data-id]"))
    .map(el => ({ dataId: el.getAttribute("data-id"), text: el.textContent?.trim()?.slice(0, 60) }))

  return { serviceItems: serviceItems.slice(0, 40), buttons: buttons.slice(0, 30), dataIds: dataIds.slice(0, 40) }
})

console.log("=== Service Items ===")
console.log(JSON.stringify(html.serviceItems, null, 2))
console.log("\n=== Buttons ===")
console.log(JSON.stringify(html.buttons, null, 2))
console.log("\n=== Data IDs ===")
console.log(JSON.stringify(html.dataIds, null, 2))

console.log("\n=== All batchexecute requests during navigation ===")
for (const r of requestUrls) {
  console.log("POST:", r.url.slice(0, 250))
  if (r.postData) console.log("Data:", r.postData.slice(0, 400))
  console.log("---")
}

await context.close()
