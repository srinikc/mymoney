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
const isPoll = process.argv.includes("--poll")

async function runHeadless(expectDriveAuth) {
  const context = await chromium.launchPersistentContext(PROFILE_DIR, { headless: true, channel: "chrome" })
  const page = await context.newPage()
  page.setDefaultTimeout(15000)

  try {
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
    if (page.url().includes("accounts.google.com")) {
      await context.close()
      return { context: null, status: "auth_required" }
    }

    await page.waitForSelector('[data-id="google_pay"]', { timeout: 10000 })
    await new Promise(r => setTimeout(r, 1000))

    // Check for existing export
    const initialCheck = await page.evaluate(() => {
      const text = document.body.innerText
      return {
        inProgress: text.includes("creating a copy of data from Google Pay"),
        existingDate: text.match(/Google Pay on ([\w\s,]+)/)?.[1] || null,
      }
    })
    if (initialCheck.inProgress) {
      await context.close()
      return { context: null, status: "already_in_progress", date: initialCheck.existingDate }
    }

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
    await page.evaluate(() => {
      const cb = document.querySelector('[role="combobox"]')
      if (cb) { cb.scrollIntoView(); cb.click() }
    })
    await new Promise(r => setTimeout(r, 1500))
    await page.evaluate(() => {
      const opt = document.querySelector('[data-value="DRIVE"]')
      if (opt) { opt.scrollIntoView(); opt.click() }
    })
    await new Promise(r => setTimeout(r, 1000))

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
      log("Password challenge detected")
      const challengeUrl = page.url()
      await context.close()
      return { context: null, status: "drive_auth_required", challengeUrl }
    }

    await new Promise(r => setTimeout(r, 4000))

    if (capturedExportId) {
      await context.close()
      return { context: null, status: "success", exportId: capturedExportId, delivery: "drive" }
    }

    const pageText = await page.evaluate(() => document.body.innerText)
    if (pageText.includes("creating a copy")) {
      await context.close()
      return { context: null, status: "success", exportId: null, delivery: "drive" }
    }

    await context.close()
    return { context: null, status: "error", error: "export_not_confirmed" }
  } catch (err) {
    await context.close()
    return { context: null, status: "error", error: err.message }
  }
}

async function handleDriveAuth(challengeUrl) {
  log("Opening visible browser for Drive authorization...")
  const context = await chromium.launchPersistentContext(PROFILE_DIR, {
    headless: false,
    channel: "chrome",
  })
  const page = await context.newPage()
  await page.goto(challengeUrl, { waitUntil: "domcontentloaded" })
  log("A browser window is open. Enter your Google password to authorize Drive delivery.")
  log("The script will continue automatically after you sign in (up to 2 min).")
  try {
    await page.waitForFunction(
      () => !window.location.href.includes("signin/challenge"),
      { timeout: 120000, polling: 1000 }
    )
    await new Promise(r => setTimeout(r, 3000))
    log("Drive authorized! Session saved for future headless runs.")
    await context.close()
    return { status: "success", note: "drive_authorized" }
  } catch {
    log("Password challenge timed out or failed.")
    await context.close()
    return { status: "error", error: "drive_auth_timeout" }
  }
}

async function refreshGPay() {
  if (isSetup) {
    log("=== SETUP MODE ===")
    const context = await chromium.launchPersistentContext(PROFILE_DIR, { headless: false, channel: "chrome" })
    const page = await context.newPage()
    await page.goto("https://takeout.google.com", { waitUntil: "networkidle" })
    await page.pause()
    await context.close()
    return { status: "setup_complete" }
  }

  if (isPoll) {
    log("Poll mode — not yet implemented")
    return { status: "success", note: "polled" }
  }

  // Phase 1: Try headless with Drive
  log("=== Phase 1: Headless with Drive delivery ===")
  let result = await runHeadless(true)

  // Phase 2: If password challenge, handle it visibly then retry
  if (result.status === "drive_auth_required") {
    log("=== Phase 2: Handle Drive authorization ===")
    const authResult = await handleDriveAuth(result.challengeUrl)
    if (authResult.status !== "success") return authResult

    log("=== Phase 3: Retry headless with authorized Drive ===")
    result = await runHeadless(true)
  }

  return result
}

const result = await refreshGPay()
console.log("RESULT:" + JSON.stringify(result))
process.exit(result.status === "success" ? 0 : 1)
