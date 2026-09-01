// Starts a production Next.js server for E2E tests against the dedicated TEST database.
// Playwright launches this via the `webServer` config; it is auto-stopped after the run.
const { spawn } = require("node:child_process")

process.env.DATABASE_URL =
  process.env.TEST_DATABASE_URL ||
  process.env.E2E_DATABASE_URL ||
  "postgresql://postgres:password@localhost:5432/mymoney_test?schema=public"
process.env.PORT = "3100"
process.env.AUTH_URL = "http://localhost:3100"
process.env.NEXTAUTH_URL = "http://localhost:3100"
process.env.AUTH_TRUST_HOST = "true"
if (!process.env.AUTH_SECRET) process.env.AUTH_SECRET = "test-secret"
if (!process.env.NEXTAUTH_SECRET) process.env.NEXTAUTH_SECRET = "test-secret"

console.log(`[e2e] starting Next.js production server on :3100 against TEST database: ${process.env.DATABASE_URL}`)

const nextBin = process.platform === "win32" ? "npx.cmd" : "npx"
const child = spawn(nextBin, ["next", "start", "-p", "3100"], {
  stdio: "inherit",
  shell: process.platform === "win32",
})

child.on("exit", (code, signal) => {
  console.log(`[e2e] server exited (code=${code} signal=${signal})`)
  process.exit(code ?? (signal ? 1 : 0))
})
