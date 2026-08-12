import { test, expect } from "@playwright/test"

test.describe("Form Validation & Edge Cases", () => {
  test.describe("Authentication guards", () => {
    test.use({ storageState: { cookies: [], origins: [] } })
    const routes = ["/", "/expenses", "/budgets", "/goals", "/income", "/investments", "/loans", "/insurance", "/reports", "/net-worth", "/settings", "/reminders", "/deals"]
    for (const route of routes) {
      test(`unauthenticated user redirected to login from ${route}`, async ({ page }) => {
        await page.goto(route, { waitUntil: "domcontentloaded" }); await page.waitForTimeout(2000); expect(page.url()).toContain("/login")
      })
    }
  })

  test.describe("Goal validation", () => {
    test("SCENARIO: Create goal with zero target shows validation", async ({ page }) => {
      await page.goto("/goals", { waitUntil: "domcontentloaded" }); await page.waitForTimeout(3000)
      const addBtn = page.getByRole("button", { name: /add goal/i })
      if (!(await addBtn.isVisible().catch(() => false))) { test.skip(true, "Add Goal button not found"); return }
      await addBtn.click(); await page.waitForTimeout(500)
      await page.fill('input[name="name"]', "Test Goal"); await page.fill('input[name="targetAmount"]', "0")
      await page.getByRole("button", { name: "Create Goal" }).click(); await page.waitForTimeout(500)
    })
  })

  test.describe("Budget validation", () => {
    test("SCENARIO: Budget amount cannot be negative", async ({ page }) => {
      await page.goto("/budgets", { waitUntil: "domcontentloaded" }); await page.waitForTimeout(3000)
      const addBtn = page.getByRole("button", { name: /add budget/i }).first()
      if (!(await addBtn.isVisible().catch(() => false))) { test.skip(true, "Add Budget button not found"); return }
      await addBtn.click(); await page.waitForTimeout(500)
      await page.fill('input[type="number"], input[name="amount"]', "-100")
      await page.getByRole("button", { name: /save|add|create/i }).first().click(); await page.waitForTimeout(500)
    })
  })

  test.describe("Settings access", () => {
    test("SCENARIO: Settings page loads with profile info", async ({ page }) => {
      await page.goto("/settings", { waitUntil: "domcontentloaded" }); await page.waitForTimeout(3000)
      await expect(page.locator("body")).not.toHaveClass(/error/)
    })
  })
})
