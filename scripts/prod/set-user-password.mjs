// ── Set a user's password in the PRODUCTION database ───────────────────
// Prompts for the new password with hidden input (nothing is echoed and the
// password is never written to disk or logs), bcrypt-hashes it, and updates
// the User row.
//
// Usage (from the repo root):
//   node scripts/prod/set-user-password.mjs            # user id 1
//   node scripts/prod/set-user-password.mjs 3          # a specific user id
//
// Requires `.env.production.local` (gitignored) with DATABASE_URL, or an
// explicit DATABASE_URL env var. Refuses to run against localhost.

import { createRequire } from "node:module"
import { createInterface } from "node:readline"
import { readFileSync, existsSync } from "node:fs"
import { resolve } from "node:path"

const require = createRequire(import.meta.url)
const bcrypt = require("bcryptjs")
const { PrismaClient } = require("@prisma/client")

const userId = Number.parseInt(process.argv[2] ?? "1", 10)
if (!Number.isInteger(userId) || userId <= 0) {
  console.error("Usage: node scripts/prod/set-user-password.mjs [userId]")
  process.exit(1)
}

function loadDatabaseUrl() {
  // Prefer the project's production env file: the shell/process env commonly
  // holds the LOCAL dev DATABASE_URL, which must never be used here.
  const file = resolve(process.cwd(), ".env.production.local")
  if (existsSync(file)) {
    const match = readFileSync(file, "utf8").match(/^DATABASE_URL=(.+)$/m)
    if (match) {
      return { url: match[1].trim().replace(/^["']|["']$/g, ""), source: ".env.production.local" }
    }
  }
  if (process.env.DATABASE_URL) {
    return { url: process.env.DATABASE_URL, source: "process env DATABASE_URL" }
  }
  throw new Error("No DATABASE_URL found. Create .env.production.local with DATABASE_URL=...")
}

function promptHidden(query) {
  return new Promise((resolvePromise) => {
    const rl = createInterface({ input: process.stdin, output: process.stdout, terminal: true })
    // Mask typed characters; only echo the newline on submit.
    rl._writeToOutput = (s) => {
      if (s.includes("\n") || s.includes("\r")) process.stdout.write("\n")
    }
    rl.question(query, (answer) => {
      rl.close()
      resolvePromise(answer)
    })
  })
}

async function main() {
  const { url: dbUrl, source } = loadDatabaseUrl()
  if (/localhost|127\.0\.0\.1/.test(dbUrl)) {
    throw new Error(`DATABASE_URL points to localhost (source: ${source}) — refusing to run a production script.`)
  }
  let host = "?"
  try { host = new URL(dbUrl).host } catch { /* ignore */ }

  console.log(`Target: user #${userId} on ${host} (source: ${source})`)
  const pw = await promptHidden(`New password for user #${userId} (hidden): `)
  const pw2 = await promptHidden("Confirm new password (hidden): ")
  if (pw !== pw2) throw new Error("Passwords do not match.")
  if (pw.length < 8) throw new Error("Password must be at least 8 characters.")

  const hashed = await bcrypt.hash(pw, 12)
  const prisma = new PrismaClient({ datasources: { db: { url: dbUrl } } })
  try {
    const user = await prisma.user.update({
      where: { id: userId },
      data: { hashedPassword: hashed },
      select: { id: true, email: true },
    })
    console.log(`Done. Password updated for user #${user.id} (${user.email}).`)
  } finally {
    await prisma.$disconnect()
  }
}

main().catch((err) => {
  console.error("Failed: " + (err instanceof Error ? err.message : String(err)))
  process.exit(1)
})
