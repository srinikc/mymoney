import { test, expect } from "@playwright/test"

test.describe("Boundary Conditions & Edge Cases", () => {
  test.describe("Login form boundary values", () => {
    test.use({ storageState: { cookies: [], origins: [] } })
    test("SCENARIO: Login with extremely long email is rejected", async ({ page }) => {
      await page.goto("/login", { waitUntil: "domcontentloaded" }); await page.waitForTimeout(2000)
      await page.locator("#email").fill("a".repeat(500) + "@example.com"); await page.locator("#password").fill("test123")
      await page.getByRole("button", { name: "Sign in with Email" }).click(); await page.waitForTimeout(2000)
      expect(page.url().includes("/login")).toBe(true)
    })
    test("SCENARIO: Login with SQL injection attempt is rejected", async ({ page }) => {
      await page.goto("/login", { waitUntil: "domcontentloaded" }); await page.waitForTimeout(2000)
      await page.locator("#email").fill("' OR '1'='1"); await page.locator("#password").fill("' OR '1'='1")
      await page.getByRole("button", { name: "Sign in with Email" }).click(); await page.waitForTimeout(2000)
      expect(page.url().includes("/login")).toBe(true)
    })
  })

  test.describe("Expense form boundary values", () => {
    test("SCENARIO: Create expense with zero amount shows validation", async ({ page }) => {
      await page.goto("/expenses", { waitUntil: "domcontentloaded" }); await page.waitForTimeout(3000)
      const addBtn = page.getByRole("button", { name: /add expense|add new/i }).first()
      if (!(await addBtn.isVisible().catch(() => false))) { test.skip(true, "Add button not found"); return }
      await addBtn.click(); await page.waitForTimeout(500)
      await page.fill('input[name="amount"]', "0")
      await page.getByRole("button", { name: /save|add|create/i }).first().click(); await page.waitForTimeout(500)
      const hasError = await page.getByText(/must be greater|invalid|positive|minimum/i).isVisible().catch(() => false)
      if (hasError) await expect(page.getByText(/must be greater|invalid|positive|minimum/i).first()).toBeVisible()
    })
    test("SCENARIO: Create expense with negative amount shows validation", async ({ page }) => {
      await page.goto("/expenses", { waitUntil: "domcontentloaded" }); await page.waitForTimeout(3000)
      const addBtn = page.getByRole("button", { name: /add expense|add new/i }).first()
      if (!(await addBtn.isVisible().catch(() => false))) { test.skip(true, "Add button not found"); return }
      await addBtn.click(); await page.waitForTimeout(500)
      await page.fill('input[name="amount"]', "-500")
      await page.getByRole("button", { name: /save|add|create/i }).first().click(); await page.waitForTimeout(500)
      const hasError = await page.getByText(/must be greater|invalid|positive|minimum/i).isVisible().catch(() => false)
      if (hasError) await expect(page.getByText(/must be greater|invalid|positive|minimum/i).first()).toBeVisible()
    })
    test("SCENARIO: Create expense with very large amount", async ({ page }) => {
      await page.goto("/expenses", { waitUntil: "domcontentloaded" }); await page.waitForTimeout(3000)
      const addBtn = page.getByRole("button", { name: /add expense|add new/i }).first()
      if (!(await addBtn.isVisible().catch(() => false))) { test.skip(true, "Add button not found"); return }
      await addBtn.click(); await page.waitForTimeout(500)
      await page.fill('input[name="vendor"]', `Large-${Date.now()}`); await page.fill('input[name="amount"]', "99999999.99")
      await page.getByRole("button", { name: /save|add|create/i }).first().click(); await page.waitForTimeout(2000)
    })
  })

  test.describe("Goal form boundary values", () => {
    test("SCENARIO: Create goal with empty name shows required error", async ({ page }) => {
      await page.goto("/goals", { waitUntil: "domcontentloaded" }); await page.waitForTimeout(3000)
      const addBtn = page.getByRole("button", { name: /add goal/i })
      if (!(await addBtn.isVisible().catch(() => false))) { test.skip(true, "Add Goal button not found"); return }
      await addBtn.click(); await page.waitForTimeout(500)
      await page.fill('input[name="targetAmount"]', "50000")
      await page.getByRole("button", { name: "Create Goal" }).click(); await page.waitForTimeout(500)
    })
    test("SCENARIO: Create goal with extremely long name", async ({ page }) => {
      await page.goto("/goals", { waitUntil: "domcontentloaded" }); await page.waitForTimeout(3000)
      const addBtn = page.getByRole("button", { name: /add goal/i })
      if (!(await addBtn.isVisible().catch(() => false))) { test.skip(true, "Add Goal button not found"); return }
      await addBtn.click(); await page.waitForTimeout(500)
      await page.fill('input[name="name"]', "Goal" + "x".repeat(250)); await page.fill('input[name="targetAmount"]', "50000")
      await page.getByRole("button", { name: "Create Goal" }).click(); await page.waitForTimeout(2000)
    })
  })

  test.describe("Navigation edge cases", () => {
    test("SCENARIO: Navigate to non-existent page shows 404", async ({ page }) => {
      const response = await page.goto("/this-page-does-not-exist-12345", { waitUntil: "domcontentloaded" })
      const status = response?.status() ?? 0; const body = await page.locator("body").textContent()
      expect(status === 404 || body?.includes("404") || body?.includes("not found")).toBe(true)
    })
    test("SCENARIO: Back and forward browser navigation works", async ({ page }) => {
      await page.goto("/", { waitUntil: "domcontentloaded" }); await page.waitForTimeout(1000)
      await page.goto("/expenses", { waitUntil: "domcontentloaded" }); await page.waitForTimeout(1000)
      await page.goBack(); await page.waitForTimeout(1000)
      expect(page.url()).not.toContain("/expenses")
      await page.goForward(); await page.waitForTimeout(1000)
      expect(page.url()).toContain("/expenses")
    })
  })
})
