import { chromium } from "playwright"
import { join, dirname } from "path"
import { fileURLToPath } from "url"

const __dirname = dirname(fileURLToPath(import.meta.url))
const PROFILE_DIR = join(__dirname, "..", ".gpay-profile")

const BASE = "https://takeout-pa.googleapis.com"
const SERVICE_NAMES = [
  "pay", "gpay", "payments", "wallet", "google_pay", "google_payments",
  "paisa", "tez", "send", "payment", "googlepay", "google_payment",
  "nbu", "purchases", "spending", "transactions", "financial",
  "drive", "photos", "mail", "youtube", "calendar", "contacts",
  "keep", "tasks", "fit", "maps", "chrome", "hangouts",
  "play", "books", "voice", "location_history", "classroom",
  "blogger", "groups", "finance", "news", "shopping",
]

function log(msg) { console.log(`[${new Date().toISOString().slice(11, 19)}] ${msg}`) }

async function main() {
  log("Launching browser with .gpay-profile...")
  const context = await chromium.launchPersistentContext(PROFILE_DIR, {
    headless: true,
    channel: "chrome",
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  })

  // Intercept requests to capture Bearer token
  let capturedToken = null
  await context.route("**/takeout-pa.googleapis.com/**", (route) => {
    const headers = route.request().headers()
    const auth = headers["authorization"] || headers["Authorization"] || ""
    if (auth.startsWith("Bearer ")) {
      capturedToken = auth.slice(7)
    }
    route.continue()
  })

  const page = await context.newPage()

  try {
    log("Navigating to takeout.google.com...")
    await page.goto("https://takeout.google.com", { waitUntil: "networkidle", timeout: 30000 })

    const url = page.url()
    if (url.includes("accounts.google.com")) {
      log("Not logged in. Run: node scripts/refresh-gpay.mjs --setup")
      return
    }
    log("Logged into takeout.google.com ✓")

    // Now trigger an API call to capture the token
    // Navigate to the main takeout page which loads services via API
    await page.goto("https://takeout.google.com/?pli=1", { waitUntil: "networkidle", timeout: 30000 })
    await page.waitForTimeout(2000)

    if (capturedToken) {
      log(`Got Bearer token via request interception (${capturedToken.slice(0, 20)}...)`)
    }

    // If interception didn't work, extract from cookies/localStorage
    if (!capturedToken) {
      log("No token from interception. Extracting from page storage...")
      // Try reading from window.gapi or window.__INITIAL_STATE__
      capturedToken = await page.evaluate(() => {
        // Check for gapi auth instance
        if (typeof gapi !== 'undefined' && gapi.auth2) {
          try {
            const auth = gapi.auth2.getAuthInstance()
            if (auth?.isSignedIn?.get()) {
              return auth.currentUser.get().getAuthResponse().access_token
            }
          } catch {}
        }
        return null
      })
      if (capturedToken) log(`Got token from gapi (${capturedToken.slice(0, 20)}...)`)
    }

    if (!capturedToken) {
      // Try to extract from cookies - Google stores OAuth tokens in __Secure-3PSID or similar
      log("Trying to get token from page fetch...")
      // Navigate to a different Google domain that can provide token
      const aboutBlank = await context.newPage()
      await aboutBlank.goto("about:blank")
      
      capturedToken = await aboutBlank.evaluate(async () => {
        // Try to make a fetch to get the token
        try {
          const r = await fetch("https://www.googleapis.com/oauth2/v1/userinfo?alt=json", {
            credentials: "include",
            headers: { "X-Client-Data": "C" }
          })
          if (r.ok) {
            // We get the token from the request - but we can't read it from the response
            // Try making a request to our own app that sets a cookie
          }
        } catch {}
        return null
      })
      await aboutBlank.close()
    }

    // Use page-context fetch for API calls (already authenticated via cookies)
    log(`\nTesting ${SERVICE_NAMES.length} service names (via page-context fetch)...\n`)

    const results = []
    for (let i = 0; i < SERVICE_NAMES.length; i++) {
      const name = SERVICE_NAMES[i]
      const result = await page.evaluate(async (svc) => {
        try {
          const r = await fetch(`https://takeout-pa.googleapis.com/v2/${svc}/exports`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ service: svc, archiveFormat: "ZIP", items: [], locale: "en-US" }),
          })
          const text = await r.text()
          let parsed = null
          try { parsed = JSON.parse(text) } catch {}
          return {
            status: r.status,
            ok: r.ok,
            hasExportId: !!parsed?.exportJob?.id,
            exportId: parsed?.exportJob?.id || null,
            response: text.slice(0, 200),
          }
        } catch (e) {
          return { status: 0, ok: false, hasExportId: false, exportId: null, response: e.message }
        }
      }, name)
      const r = { serviceName: name, ...result }
      results.push(r)
      const icon = r.hasExportId ? "✅" : r.ok ? "⚠️" : "❌"
      console.log(`${icon} ${name.padEnd(22)} HTTP ${String(r.status).padEnd(3)} ${r.ok ? (r.hasExportId ? `→ exportId: ${r.exportId}` : "OK (no exportId)") : r.response.slice(0, 80)}`)
    }

    // If page-context failed (all 401), try with Bearer token if we have it
    const allUnauthenticated = results.every(r => r.status === 401)
    if (allUnauthenticated && capturedToken) {
      log("\nPage-context fetch returned 401. Retrying with Bearer token...\n")
      const retryResults = []
      for (const name of SERVICE_NAMES) {
        try {
          const body = JSON.stringify({ service: name, archiveFormat: "ZIP", items: [], locale: "en-US" })
          const res = await fetch(`${BASE}/v2/${name}/exports`, {
            method: "POST",
            headers: { Authorization: `Bearer ${capturedToken}`, "Content-Type": "application/json" },
            body,
          })
          const text = await res.text()
          let parsed = null
          try { parsed = JSON.parse(text) } catch {}
          const r = {
            serviceName: name, status: res.status, ok: res.ok,
            hasExportId: !!parsed?.exportJob?.id,
            exportId: parsed?.exportJob?.id || null,
            response: text.slice(0, 200),
          }
          retryResults.push(r)
          const icon = r.hasExportId ? "✅" : r.ok ? "⚠️" : "❌"
          console.log(`${icon} ${name.padEnd(22)} HTTP ${String(r.status).padEnd(3)} ${r.ok ? (r.hasExportId ? `→ exportId: ${r.exportId}` : "OK (no exportId)") : r.response.slice(0, 80)}`)
        } catch (err) {
          console.log(`❌ ${name.padEnd(22)} ERROR ${err.message}`)
        }
      }
      printSummary(retryResults)
    } else {
      printSummary(results)
    }
  } catch (err) {
    log(`Error: ${err.message}`)
  } finally {
    await context.close()
    log("Done")
  }
}

function printSummary(results) {
  const working = results.filter((r) => r.ok)
  const exportCreated = results.filter((r) => r.hasExportId)
  console.log(`\n═══════════════════════════════════════`)
  console.log(`  Total tested:    ${results.length}`)
  console.log(`  HTTP 2xx:        ${working.length}`)
  console.log(`  Export created:  ${exportCreated.length}`)
  if (exportCreated.length > 0) {
    console.log(`\n  ✅ WORKING:`)
    exportCreated.forEach((r) => console.log(`     ${r.serviceName} → ${r.exportId}`))
  } else if (working.length > 0) {
    console.log(`\n  ⚠️  HTTP 2xx but no export ID:`)
    working.forEach((r) => console.log(`     ${r.serviceName} (HTTP ${r.status})`))
  } else {
    console.log(`\n  ❌ No working service name found.`)
  }
  console.log(`═══════════════════════════════════════\n`)
}

main()
