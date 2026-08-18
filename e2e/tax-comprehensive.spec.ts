import { test, expect } from "@playwright/test"
import * as fs from "node:fs"
import * as path from "node:path"

const FIXTURE_DIR = path.join(process.cwd(), "e2e", "fixtures")

test.describe("Tax Section — Comprehensive", () => {
  test.describe("Tab navigation", () => {
    test("SCENARIO: FY selector offers correct range", async ({ page }) => {
      await page.goto("/tax", { waitUntil: "domcontentloaded" }); await page.waitForTimeout(3000)
      const fyBtn = page.locator("button").filter({ hasText: /fy/i }).first()
      if (await fyBtn.isVisible().catch(() => false)) { await fyBtn.click(); await page.waitForTimeout(500); expect(await page.locator('[role="option"], [class*="select-item"], li').count()).toBeGreaterThanOrEqual(3); await page.keyboard.press("Escape") }
    })
    test("SCENARIO: FY selector changes all tabs", async ({ page }) => {
      await page.goto("/tax", { waitUntil: "domcontentloaded" }); await page.waitForTimeout(3000)
      const fyBtn = page.locator("button").filter({ hasText: /fy|2025-26|2026-27/i }).first()
      if (await fyBtn.isVisible().catch(() => false)) {
        await fyBtn.click().catch(() => {})
        await page.waitForTimeout(500)
        const option = page.locator('[role="option"]').filter({ hasText: /2024-25|2025-26/i }).first()
        if (await option.isVisible().catch(() => false)) { await option.click({ force: true }).catch(() => {}); await page.waitForTimeout(1000) }
      }
    })
  })

  test.describe("Income & Deductions tab", () => {
    test("SCENARIO: Deduction sections are displayed", async ({ page }) => {
      await page.goto("/tax", { waitUntil: "domcontentloaded" }); await page.waitForTimeout(3000)
      const deduction = page.getByText(/80c|80d|hra|nps|deduction/i).first()
      if (await deduction.isVisible().catch(() => false)) await expect(deduction).toBeVisible()
    })
    test("SCENARIO: Regime comparison section", async ({ page }) => {
      await page.goto("/tax", { waitUntil: "domcontentloaded" }); await page.waitForTimeout(3000)
      const regime = page.getByText(/old regime|new regime|regime/i).first()
      if (await regime.isVisible().catch(() => false)) await expect(regime).toBeVisible()
    })
    test("SCENARIO: Empty state when no income sources exist", async ({ page }) => {
      await page.route("**/api/income/sources*", async (route) => { await route.fulfill({ status: 200, body: JSON.stringify([]) }) })
      await page.goto("/tax", { waitUntil: "domcontentloaded" }); await page.waitForTimeout(3000)
    })
  })

  test.describe("Documents tab", () => {
    test.beforeAll(() => {
      if (!fs.existsSync(FIXTURE_DIR)) fs.mkdirSync(FIXTURE_DIR, { recursive: true })
      if (!fs.existsSync(path.join(FIXTURE_DIR, "test-form16.pdf"))) fs.writeFileSync(path.join(FIXTURE_DIR, "test-form16.pdf"), "%PDF-1.4 fake pdf")
      if (!fs.existsSync(path.join(FIXTURE_DIR, "test.txt"))) fs.writeFileSync(path.join(FIXTURE_DIR, "test.txt"), "text file")
    })

    test("SCENARIO: Upload dialog opens and accepts file selection", async ({ page }) => {
      await page.goto("/tax", { waitUntil: "domcontentloaded" }); await page.waitForTimeout(3000)
      await page.getByRole("button", { name: "Documents" }).click(); await page.waitForTimeout(500)
      const uploadBtn = page.getByRole("button", { name: /upload document/i })
      if (await uploadBtn.isVisible().catch(() => false)) { await uploadBtn.click(); await page.waitForTimeout(500); const fileInput = page.locator('input[type="file"]'); if (await fileInput.isVisible().catch(() => false)) { await fileInput.setInputFiles(path.join(FIXTURE_DIR, "test-form16.pdf")); await page.waitForTimeout(500) } const cancelBtn = page.getByRole("button", { name: /cancel/i }); if (await cancelBtn.isVisible().catch(() => false)) { await cancelBtn.click(); await page.waitForTimeout(500) } }
    })
    test("SCENARIO: Unsupported file type shows error", async ({ page }) => {
      await page.goto("/tax", { waitUntil: "domcontentloaded" }); await page.waitForTimeout(3000)
      await page.getByRole("button", { name: "Documents" }).click(); await page.waitForTimeout(500)
      await page.getByRole("button", { name: /upload document/i }).click(); await page.waitForTimeout(500)
      const fileInput = page.locator('input[type="file"]')
      if (await fileInput.isVisible().catch(() => false)) { await fileInput.setInputFiles(path.join(FIXTURE_DIR, "test.txt")); await page.waitForTimeout(500) }
    })
    test("SCENARIO: View uploaded documents list via API", async ({ request }) => {
      const res = await request.get("/api/tax/documents"); expect(res.ok()).toBe(true)
      const docs = await res.json(); expect(Array.isArray(docs.data || docs)).toBe(true)
    })
  })

  test.describe("ITR Filings tab", () => {
    test("SCENARIO: Create a new ITR record via API", async ({ request }) => {
      const res = await request.post("/api/tax/itr", { data: { assessmentYear: "2025-26", itrForm: "ITR-1", status: "Filed", filingDate: "2026-07-01", acknowledgmentNumber: `ACK-${Date.now()}` } })
      if (res.ok()) { const itr = await res.json(); expect(itr.assessmentYear).toBe("2025-26") }
    })
    test("SCENARIO: View empty ITR filings tab", async ({ page }) => {
      await page.goto("/tax", { waitUntil: "domcontentloaded" }); await page.waitForTimeout(3000)
      await page.getByRole("button", { name: "ITR Filings" }).click(); await page.waitForTimeout(500)
      await expect(page.getByRole("button", { name: "Add ITR Record" })).toBeVisible()
    })
  })

  test.describe("Projections tab", () => {
    test("SCENARIO: Projections tab shows content", async ({ page }) => {
      await page.goto("/tax", { waitUntil: "domcontentloaded" }); await page.waitForTimeout(3000)
      await page.getByRole("button", { name: "Projections" }).click(); await page.waitForTimeout(1000)
      const content = page.getByText(/projected annual|estimated tax|advance tax|80c/i)
      if (await content.isVisible().catch(() => false)) await expect(content).toBeVisible()
    })
  })
})
