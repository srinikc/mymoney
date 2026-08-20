import fs from "node:fs"
import path from "node:path"

const CONFIG_PATH = path.join(process.cwd(), ".db-mode.json")

let cachedMode: "production" | "test" | null = null

export function getDbMode(): "production" | "test" {
  // When E2E mode is enabled AND a separate test database is configured, always
  // use the test database. This prevents e2e runs from ever injecting test data
  // into the production dev database, regardless of .db-mode.json.
  if (process.env.E2E === "true" && process.env.TEST_DATABASE_URL) {
    return "test"
  }
  if (cachedMode) return cachedMode
  try {
    const data = JSON.parse(fs.readFileSync(CONFIG_PATH, "utf-8")) as { mode: string }
    cachedMode = data.mode === "test" ? "test" : "production"
  } catch {
    cachedMode = "production"
  }
  return cachedMode
}

export function setDbMode(mode: "production" | "test") {
  fs.writeFileSync(CONFIG_PATH, JSON.stringify({ mode }, null, 2))
  cachedMode = mode
}

export function getTestDatabaseUrl(): string {
  return process.env.TEST_DATABASE_URL || process.env.DATABASE_URL || ""
}

export function resetDbModeCache() {
  cachedMode = null
}
