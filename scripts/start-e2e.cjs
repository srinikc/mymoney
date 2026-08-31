// Starts the Next.js dev server for E2E tests against the dedicated TEST database
// (never touches the dev/prod `mymoney` database). Playwright launches this via
// the `webServer` config; it is auto-stopped after the run.
const { spawn } = require("node:child_process")

process.env.DATABASE_URL =
  process.env.TEST_DATABASE_URL ||
  process.env.E2E_DATABASE_URL ||
  "postgresql://postgres:password@localhost:5432/mymoney_test?schema=public"
process.env.PORT = "3100"
process.env.AUTH_URL = "http://localhost:3100"
process.env.NEXTAUTH_URL = "http://localhost:3100"
process.env.AUTH_TRUST_HOST = "true"
// Separate build dir so the E2E server never shares chunks with the dev server
process.env.NEXT_DIST_DIR = process.env.NEXT_DIST_DIR || ".next-e2e"

console.log("[e2e] starting Next dev server on :3100 against TEST database")

const nextBin = process.platform === "win32" ? "npx.cmd" : "npx"
const child = spawn(nextBin, ["next", "dev", "-p", "3100"], { stdio: "inherit", shell: process.platform === "win32" })

child.on("exit", (code, signal) => {
  console.log(`[e2e] server exited (code=${code} signal=${signal})`)
  process.exit(code ?? (signal ? 1 : 0))
})