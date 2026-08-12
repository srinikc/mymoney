import { chromium } from "playwright"
import { join, dirname } from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = dirname(fileURLToPath(import.meta.url))
const PROFILE_DIR = join(__dirname, "..", ".gpay-profile")

function log(msg) {
  const ts = new Date().toISOString().slice(11, 19)
  console.log(`[${ts}] ${msg}`)
}

const isSetup = process.argv.includes("--setup")

async function runExportFlow({ page, context, headless }) {
  let capturedExportId = null

  page.on("response", async resp => {
    if (!resp.url().includes("batchexecute")) return
    try {
      let text = await resp.text()
      if (text.startsWith(")]}'\n")) text = text.slice(5)
      if (text.startsWith(")]}'")) text = text.slice(4)
      function parseFrames(raw) {
        const frames = []
        let pos = 0
        while (pos < raw.length) {
          const m = raw.slice(pos).match(/^(\d+)\n/)
          if (!m) break
          const len = parseInt(m[1], 10)
          pos += m[0].length
          if (pos + len > raw.length) break
          try { frames.push(JSON.parse(raw.slice(pos, pos + len))) } catch {}
          pos += len
        }
        return frames
      }
      const frames = parseFrames(text)
      for (const frame of frames) {
        const rpcId = frame?.[0]?.[1]
        if (typeof rpcId !== "string" || !rpcId.includes("U5lrKc")) continue
        const payloadStr = frame?.[0]?.[2]
        if (typeof payloadStr !== "string") continue
        const data = JSON.parse(payloadStr)
        if (data?.[0] === "ac.t.star") {
          const ta = data[1]
          if (Array.isArray(ta) && ta[0] === "ac.t.ta" && ta[1]) {
            capturedExportId = ta[1]
          }
        }
      }
    } catch {}
  })

  log("Navigating to takeout.google.com...")
  await page.goto("https://takeout.google.com", { waitUntil: "networkidle", timeout: 30000 })
  await new Promise(r => setTimeout(r, 2000))

  // Handle login page
  const urlAtStart = page.url()
  if (urlAtStart.includes("accounts.google.com")) {
    const pageText = await page.evaluate(() => document.body.innerText || "")
    const isLoginPage = pageText.includes("Sign in") || pageText.includes("Password") || pageText.includes("Email") || pageText.length < 50
    if (isLoginPage) {
      if (!headless) {
        log("Please log into your Google account in the browser window.")
        log("Waiting up to 5 minutes for login to complete...")
        try {
          await page.waitForFunction(
            () => !window.location.href.includes("accounts.google.com"),
            { timeout: 300000, polling: 1000 }
          )
          log("Login detected, continuing...")
        } catch {
          log("Login wait timed out or browser was closed.")
          await context.close()
          return { status: "error", error: "Login did not complete within 5 minutes." }
        }
      } else {
        await context.close()
        return { status: "auth_required" }
      }
    } else {
      log("URL shows accounts.google.com but page has content — treating as authenticated")
    }
  }

  // Re-check URL after potential login
  const afterLoginUrl = page.url()

  // Check for existing export FIRST
  const bodyText = await page.evaluate(() => document.body.innerText || "")
  const existingInProgress = bodyText.includes("creating a copy of data from Google Pay")
  if (existingInProgress) {
    log("Export already in progress")
    await context.close()
    return { status: "already_in_progress" }
  }

  try {
    await page.waitForSelector('[data-id="google_pay"]', { timeout: 10000 })
  } catch {
    const debugUrl = page.url()
    const debugTitle = await page.title()
    const debugText = await page.evaluate(() => document.body.innerText.slice(0, 200))
    log(`GPay selector not found. URL: ${debugUrl}, Title: ${debugTitle}, Body: ${debugText}`)

    if (debugUrl.includes("takeout/transfer") || debugUrl.includes("takeout/export")) {
      await context.close()
      return { status: "already_in_progress" }
    }

    await context.close()
    return { status: "error", error: `GPay checkbox not found on page. URL: ${debugUrl}, Title: "${debugTitle}"` }
  }
  await new Promise(r => setTimeout(r, 1000))

  // Deselect all
  log("Deselecting all...")
  await page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll("button")).find(b => b.textContent.includes("Deselect all"))
    if (btn) btn.click()
  })
  await new Promise(r => setTimeout(r, 2000))

  // Select GPay
  log("Selecting Google Pay...")
  await page.locator('[data-id="google_pay"] input[type="checkbox"]').focus()
  await page.keyboard.press("Space")
  await new Promise(r => setTimeout(r, 1000))

  const selected = await page.evaluate(() => document.querySelector('[data-id="google_pay"] input[type="checkbox"]')?.checked)
  if (!selected) {
    await page.locator('[data-id="google_pay"] input[type="checkbox"]').click({ force: true })
    await new Promise(r => setTimeout(r, 500))
  }

  // Next step
  log("Clicking Next step...")
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll("button")).filter(b => b.textContent.includes("Next step"))
    const btn = btns.find(b => b.offsetParent !== null) || btns[0]
    if (btn) { btn.scrollIntoView(); btn.click() }
  })
  await new Promise(r => setTimeout(r, 2000))

  // Set destination to Drive
  log("Setting destination to 'Add to Drive'...")
  // Open the delivery method dropdown
  const deliveryOpened = await page.evaluate(() => {
    const selectors = ['[role="combobox"]', '[role="listbox"]', 'select', '.MuiSelect-select', '[aria-label*="delivery"]', '[aria-label*="Delivery"]']
    for (const sel of selectors) {
      const el = document.querySelector(sel)
      if (el) { el.scrollIntoView({ behavior: "instant" }); el.click(); return true }
    }
    return false
  })
  if (!deliveryOpened) {
    log("WARN: Could not find delivery method dropdown — trying to proceed anyway")
  }
  await new Promise(r => setTimeout(r, 2000))

  // Select "Add to Drive" option (try multiple selector strategies)
  const driveSelected = await page.evaluate(() => {
    // Strategy 1: data-value attribute
    const byData = document.querySelector('[data-value="DRIVE"], [data-value="drive"], [value="drive"]')
    if (byData) { byData.click(); return true }
    // Strategy 2: text content matching
    const allOptions = Array.from(document.querySelectorAll('[role="option"], option, li, [class*="option"], [class*="menu"] a, [class*="menu"] button'))
    const driveOpt = allOptions.find(el => /drive/i.test(el.textContent))
    if (driveOpt) { driveOpt.click(); return true }
    // Strategy 3: look for any element containing "Drive" near the delivery section
    const allEls = Array.from(document.querySelectorAll('*')).filter(el => {
      try { return el.offsetParent !== null && /^add to drive$/i.test(el.textContent.trim()) } catch { return false }
    })
    if (allEls.length > 0) { allEls[0].click(); return true }
    return false
  })
  if (driveSelected) {
    log("Destination set to Drive")
  } else {
    log("WARN: Could not select Drive delivery — export may default to email")
  }
  await new Promise(r => setTimeout(r, 1500))

  // Verify delivery method
  const deliveryText = await page.evaluate(() => {
    const cb = document.querySelector('[role="combobox"], select, [class*="delivery"]')
    return cb ? (cb.textContent || cb.value || "") : "not found"
  }).catch(() => "error reading")
  log(`Delivery method shown: "${deliveryText}"`)

  // Take screenshot to debug delivery selector (in headless, saves to file)
  if (process.env.DEBUG_SCREENSHOT) {
    const { writeFileSync, mkdirSync } = await import("node:fs")
    const shotDir = join(import.meta.dirname, "..", "data")
    mkdirSync(shotDir, { recursive: true })
    const shot = await page.screenshot({ fullPage: true, type: "png" })
    writeFileSync(join(shotDir, `takeout-${Date.now()}.png`), shot)
    log("Screenshot saved to data/")
  }

  // Create export
  log("Clicking Create export...")
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll("button")).filter(b => b.textContent.includes("Create export"))
    const btn = btns.find(b => b.offsetParent !== null) || btns[0]
    if (btn) { btn.scrollIntoView(); btn.click() }
  })
  await new Promise(r => setTimeout(r, 4000))

  // Check if password challenge appeared
  if (page.url().includes("signin/challenge")) {
    if (!headless) {
      log("")
      log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
      log("Google Drive requires authorization.")
      log("Enter your password in the browser window.")
      log("The script will continue automatically once")
      log("the challenge is completed.")
      log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
      log("")
      try {
        await page.waitForFunction(
          () => !window.location.href.includes("signin/challenge"),
          { timeout: 300000, polling: 1000 }
        )
        log("Drive challenge completed, continuing...")
      } catch {
        log("Drive challenge wait timed out or browser was closed.")
        await context.close()
        return { status: "error", error: "Drive authorization did not complete in time." }
      }
      await new Promise(r => setTimeout(r, 4000))
    } else {
      log("Password challenge detected")
      await context.close()
      return { status: "drive_auth_required" }
    }
  }

  await new Promise(r => setTimeout(r, 4000))

  if (capturedExportId) {
    await context.close()
    return { status: "success", exportId: capturedExportId, delivery: "drive" }
  }

  const pageText = await page.evaluate(() => document.body.innerText).catch(() => "")
  if (pageText.includes("creating a copy")) {
    await context.close()
    return { status: "success", exportId: null, delivery: "drive" }
  }

  const finalUrl = page.url()
  await context.close()
  return { status: "error", error: `export_not_confirmed — page at ${finalUrl}` }
}

async function runHeadless() {
  const context = await chromium.launchPersistentContext(PROFILE_DIR, { headless: true, channel: "chrome" })
  const page = await context.newPage()
  page.setDefaultTimeout(15000)
  try {
    return await runExportFlow({ page, context, headless: true })
  } catch (err) {
    await context.close()
    return { status: "error", error: `Playwright error: ${err.message}` }
  }
}

async function runSetup() {
  log("=== SETUP MODE ===")
  console.log("")
  console.log("A Chrome browser window will open.")
  console.log("The automation will walk through creating a GPay export.")
  console.log("If Google asks for Drive authorization, enter your password")
  console.log("and the script will continue automatically.")
  console.log("Close the browser window when done.")
  console.log("")
  const context = await chromium.launchPersistentContext(PROFILE_DIR, { headless: false, channel: "chrome" })
  const page = await context.newPage()
  page.setDefaultTimeout(15000)
  try {
    const result = await runExportFlow({ page, context, headless: false })
    if (result.status === "auth_required" || result.status === "drive_auth_required") {
      log("Session still needs authorization.")
      return { status: "error", error: result.error || "Authorization still required after setup." }
    }
    if (result.status === "error") {
      log("Setup failed: " + (result.error || "unknown error"))
      return { status: "error", error: result.error || "Setup failed." }
    }
    log("Setup completed successfully")
    return { status: "setup_complete", message: "Drive authorized and export flow verified." }
  } catch (err) {
    log("Setup error: " + err.message)
    return { status: "error", error: `Setup error: ${err.message}` }
  } finally {
    try { await context.close() } catch {}
  }
}

async function refreshGPay() {
  if (isSetup) {
    return await runSetup()
  }

  log("=== Phase 1: Headless with Drive delivery ===")
  let result = await runHeadless()

  if (result.status === "drive_auth_required") {
    log("=== Phase 2: Drive authorization required — returning to user ===")
    return { status: "auth_required", error: "Drive authorization required. Click Re-authenticate to set up." }
  }

  return result
}

const result = await refreshGPay()
console.log("RESULT:" + JSON.stringify(result))
process.exit(result.status === "success" ? 0 : 1)
