import { chromium } from "playwright"
import { writeFileSync, mkdirSync, existsSync } from "fs"
import { join, dirname } from "path"
import { fileURLToPath } from "url"

const __dirname = dirname(fileURLToPath(import.meta.url))
const DATA_DIR = join(__dirname, "..", "data")
const PROFILE_DIR = join(__dirname, "..", ".gpay-profile")
const POLL_INTERVAL_MS = 30000
const MAX_POLL_ATTEMPTS = 40

function log(msg) {
  const ts = new Date().toISOString().slice(11, 19)
  console.log(`[${ts}] ${msg}`)
}

const isSetup = process.argv.includes("--setup")

async function refreshGPay() {
  log(`Launching browser (${isSetup ? "VISIBLE — login manually" : "headless"})...`)
  const context = await chromium.launchPersistentContext(PROFILE_DIR, {
    headless: !isSetup,
    channel: "chrome",
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-blink-features=AutomationControlled",
    ],
  })
  const browser = context.browser()

  const page = await context.newPage()
  page.setDefaultTimeout(15000)

  try {
    log("Navigating to takeout.google.com...")
    await page.goto("https://takeout.google.com", { waitUntil: "networkidle" })

    if (isSetup) {
      log("=== SETUP MODE ===")
      log("A browser window is open. Log into your Google account.")
      log("After logging in, you'll be redirected to Google Takeout.")
      log("Close the browser window when done. The session will be saved.")
      await page.pause()
      return { status: "setup_complete" }
    }

    const currentUrl = page.url()
    if (currentUrl.includes("accounts.google.com")) {
      console.error("AUTH_REQUIRED")
      log("Session expired — user must re-login")
      await page.screenshot({ path: join(DATA_DIR, "gpay-auth-required.png") })
      return { status: "auth_required" }
    }

    log("Deselecting all services...")
    const deselectBtn = page.locator('[data-tooltip="Deselect all"]')
    if (await deselectBtn.isVisible()) {
      await deselectBtn.click()
    } else {
      const deselectAll = page.locator('text=Deselect all, aria-label="Deselect all"')
      if (await deselectAll.isVisible()) {
        await deselectAll.click()
      }
    }

    log("Selecting Google Pay...")
    await page.waitForTimeout(2000)
    const gpayToggle = page.locator('[data-id="payments"]')
    if (await gpayToggle.isVisible()) {
      await gpayToggle.click()
    } else {
      await page.locator('text=Google Pay').click()
    }

    log("Proceeding to next step...")
    await page.waitForTimeout(1000)
    const nextBtn = page.locator('button:has-text("Next step")')
    if (await nextBtn.isVisible()) {
      await nextBtn.click()
    }

    log("Configuring delivery to Drive...")
    await page.waitForTimeout(2000)
    const driveOption = page.locator('text=Add to Drive')
    if (await driveOption.isVisible()) {
      await driveOption.click()
    }

    const createBtn = page.locator('button:has-text("Create export")')
    if (await createBtn.isVisible()) {
      await createBtn.click()
    }

    log("Waiting for export to complete...")
    let attempts = 0
    let done = false
    while (!done && attempts < MAX_POLL_ATTEMPTS) {
      attempts++
      log(`Polling attempt ${attempts}/${MAX_POLL_ATTEMPTS}...`)

      try {
        await page.waitForTimeout(POLL_INTERVAL_MS)
        await page.reload({ waitUntil: "networkidle" })

        const completeIndicator = page.locator('text=Your export is complete')
        if (await completeIndicator.isVisible({ timeout: 5000 })) {
          done = true
          log("Export is complete!")
        } else {
          const inProgress = page.locator('text=Export in progress')
          if (await inProgress.isVisible({ timeout: 3000 })) {
            log("Export still in progress...")
          }
        }
      } catch (err) {
        log(`Poll error: ${err.message}`)
        await page.waitForTimeout(5000)
      }
    }

    if (!done) {
      log("Export did not complete within expected time")
      await page.screenshot({ path: join(DATA_DIR, "gpay-export-timeout.png") })
      return { status: "timeout" }
    }

    log("Downloading file...")
    const [download] = await Promise.all([
      page.waitForEvent("download", { timeout: 60000 }),
      page.locator('text=Download').first().click(),
    ])

    const today = new Date().toISOString().slice(0, 10)
    const fileName = `gpay-takeout-${today}.html`
    const filePath = join(DATA_DIR, fileName)

    if (!existsSync(DATA_DIR)) {
      mkdirSync(DATA_DIR, { recursive: true })
    }

    await download.saveAs(filePath)
    log(`Download saved to ${filePath}`)

    const stats = await download.path()
    log(`File size: ${stats ? (await import("fs")).statSync(filePath).size : "unknown"} bytes`)

    return { status: "success", fileName, filePath }
  } catch (err) {
    log(`Error: ${err.message}`)
    await page.screenshot({ path: join(DATA_DIR, "gpay-error.png") })
    return { status: "error", error: err.message }
  } finally {
    await context.close()
    log("Browser closed")
  }
}

const result = await refreshGPay()
console.log("RESULT:" + JSON.stringify(result))
process.exit(result.status === "success" || result.status === "setup_complete" ? 0 : 1)
