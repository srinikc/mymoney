// Standalone GPay timestamp backfill — completely outside mymoney app.
//
// Usage:
//   node scripts/backfill-times.mjs --file path/to/MyActivity.html
//   node scripts/backfill-times.mjs              (auto-download from Drive if token saved)
//   REFRESH_TOKEN=... node scripts/backfill-times.mjs   (use env var token)

import { PrismaClient } from "@prisma/client"
import { readFileSync, existsSync, writeFileSync, mkdirSync } from "node:fs"
import { join, dirname } from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, "..")
const TOKEN_FILE = join(ROOT, "data", ".gdrive-refresh-token.json")
const ENV_FILE = join(ROOT, ".env.local")

const prisma = new PrismaClient()

function log(msg) {
  const ts = new Date().toISOString().slice(11, 19)
  console.log(`[${ts}] ${msg}`)
}

function parseGpayHtml(html) {
  const results = []
  const text = html.replaceAll(/<[^>]+>/g, " ").replaceAll("&nbsp;", " ").replaceAll("&amp;", "&").replaceAll(/\s+/g, " ")
  const re = /(paid|sent|received)\s+₹([\d,]+\.?\d*)\s+(?:(?:to|from)\s+(.+?)\s+)?using\s+(bank account\s*x+\d+)\s+(.*?)(?=\s+(?:paid|sent|received)\b|\s*$)/gi
  let m
  while ((m = re.exec(text)) !== null) {
    const amount = Number.parseFloat(m[2].replaceAll(",", ""))
    const vendor = m[3] ? m[3].trim() : ""
    const rest = m[5]
    const dm = rest.match(/\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+\d{1,2},?\s+\d{4}\b/i)
    const tm = rest.match(/\b(\d{1,2}:\d{2}(?::\d{2})?\s*(?:AM|PM))\b/i)
    const date = dm ? (tm ? new Date(`${dm[0]} ${tm[1]}`) : new Date(dm[0])) : null
    if (date && !isNaN(date.getTime()) && amount > 0 && /\bcompleted\b/i.test(rest)) {
      results.push({ date, amount, vendor })
    }
  }
  return results
}

async function downloadFromDrive() {
  let tokenData = null

  // Try env var first
  if (process.env.REFRESH_TOKEN) {
    tokenData = { refreshToken: process.env.REFRESH_TOKEN }
  } else if (existsSync(TOKEN_FILE)) {
    tokenData = JSON.parse(readFileSync(TOKEN_FILE, "utf-8"))
  } else {
    log("No OAuth token found.")
    log("To auto-download from Drive, first run: node scripts/extract-token.mjs")
    log("Or pass a local file: node scripts/backfill-times.mjs --file path/to/MyActivity.html")
    return null
  }

  const env = existsSync(ENV_FILE) ? parseEnv(readFileSync(ENV_FILE, "utf-8")) : {}
  const clientId = env.AUTH_GOOGLE_ID || process.env.AUTH_GOOGLE_ID
  const clientSecret = env.AUTH_GOOGLE_SECRET || process.env.AUTH_GOOGLE_SECRET
  if (!clientId || !clientSecret) {
    log("Missing Google OAuth credentials in .env.local")
    return null
  }

  log("Refreshing OAuth token...")
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id: clientId, client_secret: clientSecret, refresh_token: tokenData.refreshToken, grant_type: "refresh_token" }),
  })
  if (!res.ok) { log("Token refresh failed: " + await res.text()); return null }
  const { access_token } = await res.json()

  log("Finding GPay file in Drive...")
  const q = "files?q=name='MyActivity.html' or name contains 'takeout'&orderBy=createdTime desc&pageSize=10&fields=files(id,name,createdTime)"
  const r = await fetch(`https://www.googleapis.com/drive/v3/${q}`, { headers: { Authorization: `Bearer ${access_token}` } })
  if (!r.ok) { log("Drive API error: " + await r.text()); return null }
  const { files } = await r.json()
  const gpayFile = files?.find(f => f.name === "MyActivity.html" || f.name.endsWith(".zip"))
  if (!gpayFile) { log("No GPay file found in Drive"); return null }

  log(`Downloading: ${gpayFile.name}`)
  const dl = await fetch(`https://www.googleapis.com/drive/v3/files/${gpayFile.id}?alt=media`, { headers: { Authorization: `Bearer ${access_token}` } })
  if (!dl.ok) { log("Download failed: " + await dl.text()); return null }
  const buffer = Buffer.from(await dl.arrayBuffer())

  // Save for future runs
  const savedir = join(ROOT, "data")
  mkdirSync(savedir, { recursive: true })
  writeFileSync(join(savedir, "gpay-download.html"), buffer)

  if (gpayFile.name.endsWith(".zip")) {
    log("ZIP downloaded — extracting HTML...")
    const str = buffer.toString("binary")
    const idx = str.search(/<html/i)
    if (idx === -1) { log("Could not find HTML in ZIP"); return null }
    const html = str.slice(idx)
    if (!/(paid|sent|received)\s+₹/i.test(html)) { log("No GPay transactions in extracted HTML"); return null }
    return html
  }
  return buffer.toString("utf-8")
}

function parseEnv(text) {
  const env = {}
  for (const line of text.split("\n")) {
    const t = line.trim()
    if (!t || t.startsWith("#")) continue
    const eq = t.indexOf("=")
    if (eq === -1) continue
    env[t.slice(0, eq).trim()] = t.slice(eq + 1).trim()
  }
  return env
}

async function main() {
  const args = process.argv.slice(2)
  const fileIdx = args.indexOf("--file")
  let htmlContent = null

  if (fileIdx !== -1) {
    const fp = args[fileIdx + 1]
    if (!fp) { console.log("Error: --file requires a path"); process.exit(1) }
    log(`Reading local file: ${fp}`)
    htmlContent = readFileSync(fp, "utf-8")
  } else {
    htmlContent = await downloadFromDrive()
    if (!htmlContent) process.exit(1)
  }

  if (htmlContent.length < 100) { log("File too short"); process.exit(1) }
  log(`HTML: ${(htmlContent.length / 1024).toFixed(1)} KB`)

  const txns = parseGpayHtml(htmlContent)
  log(`Parsed ${txns.length} GPay transactions`)
  const withTime = txns.filter(t => t.date.getHours() !== 0 || t.date.getMinutes() !== 0)
  log(`With timestamps: ${withTime.length}`)

  if (withTime.length === 0) { log("Nothing to backfill."); await prisma.$disconnect(); return }

  let updated = 0, noMatch = 0, hasTime = 0

  for (const txn of withTime) {
    const ds = new Date(txn.date.getFullYear(), txn.date.getMonth(), txn.date.getDate())
    const de = new Date(ds.getTime() + 86400000)

    let existing = null

    if (txn.vendor) {
      existing = await prisma.expense.findFirst({ where: { date: { gte: ds, lt: de }, amount: txn.amount, vendor: txn.vendor }, select: { id: true, date: true, vendor: true }, orderBy: { date: "asc" } })
    }
    if (!existing && txn.vendor) {
      existing = await prisma.expense.findFirst({ where: { date: { gte: ds, lt: de }, amount: txn.amount, vendor: { contains: txn.vendor, mode: "insensitive" } }, select: { id: true, date: true, vendor: true }, orderBy: { date: "asc" } })
    }
    if (!existing) {
      existing = await prisma.expense.findFirst({ where: { date: { gte: ds, lt: de }, amount: txn.amount }, select: { id: true, date: true, vendor: true }, orderBy: { date: "asc" } })
    }


    if (!existing) { noMatch++; continue }
    if (existing.date.getHours() !== 0 || existing.date.getMinutes() !== 0) { hasTime++; continue }

    await prisma.expense.update({ where: { id: existing.id }, data: { date: txn.date } })
    updated++
    log(`  ✓ #${existing.id} ${existing.vendor || "?"} ₹${txn.amount} → ${txn.date.toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}`)
  }

  log("")
  log("═══ RESULTS ═══")
  log(`Updated: ${updated}`)
  log(`No match: ${noMatch}`)
  log(`Already had time: ${hasTime}`)
  await prisma.$disconnect()
}

main().catch(e => { console.error("Fatal:", e); process.exit(1) })
