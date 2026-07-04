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

  const initial = await page.evaluate(() => document.querySelectorAll('input[type="checkbox"]:checked').length)
  console.log("Initial checked count:", initial)

  // Deselect all
  await page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll("button")).find(b => b.textContent.includes("Deselect all"))
    if (btn) btn.click()
  })
  await new Promise(r => setTimeout(r, 3000))

  const afterDeselect = await page.evaluate(() => document.querySelectorAll('input[type="checkbox"]:checked').length)
  console.log("After deselect:", afterDeselect)

  // Test 1: Set model + CSS class
  console.log("\n=== Test 1: model + CSS class ===")
  const t1 = await page.evaluate(() => {
    const gpay = document.querySelector('[data-id="google_pay"]')
    const container = gpay?.querySelector(".VfPpkd-MPu53c")
    const inst = container?.__jscontroller?.instance
    if (!inst) return "no instance"

    inst.checked = true
    inst.$wa$N2RpBe(true)
    inst.$wa$B6Vhqe(false)

    return {
      modelChecked: inst.Jb(),
      hasCheckedClass: container.classList.contains("VfPpkd-MPu53c-OWXEXe-gk6SMd"),
      hasUncheckedClass: container.classList.contains("VfPpkd-MPu53c-OWXEXe-mWPk3d"),
      allClasses: Array.from(container.classList).filter(c => c.startsWith("VfPpkd-")).join(", "),
      inputChecked: container.querySelector('input')?.checked,
    }
  })
  console.log(JSON.stringify(t1, null, 2))

  // Test 2: Also set rd property directly
  console.log("\n=== Test 2: set all model props ===")
  const t2 = await page.evaluate(() => {
    const gpay = document.querySelector('[data-id="google_pay"]')
    const container = gpay?.querySelector(".VfPpkd-MPu53c")
    const inst = container?.__jscontroller?.instance
    if (!inst) return "no instance"

    inst.checked = true
    inst.rd = "true"
    inst.$wa$N2RpBe(true)
    inst.$wa$B6Vhqe(false)
    inst.$wa$L9dL9d(false)
    inst.$wa$HvnK2b(false)

    return {
      modelChecked: inst.Jb(),
      rd: inst.rd,
      hasCheckedClass: container.classList.contains("VfPpkd-MPu53c-OWXEXe-gk6SMd"),
      hasCheckedClass2: container.classList.contains("VfPpkd-MPu53c-OWXEXe-gk6SMd"),
      inputChecked: container.querySelector('input')?.checked,
      allClasses: Array.from(container.classList).filter(c => c.startsWith("VfPpkd-")).join(", "),
    }
  })
  console.log(JSON.stringify(t2, null, 2))

  await context.close()
}
run().catch(e => { console.error(e); process.exit(1) })
