import { defineConfig, devices } from "@playwright/test"

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: "list",
  globalSetup: "./e2e/global.setup.ts",
  // E2E runs against a dedicated server backed by the TEST database
  // (scripts/start-e2e.cjs). The dev/prod `mymoney` database is never touched.
  webServer: {
    command: "npm run dev:e2e",
    url: "http://localhost:3100",
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
  use: {
    baseURL: "http://localhost:3100",
    trace: "on-first-retry",
    storageState: "e2e/.auth.json",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
})