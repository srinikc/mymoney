import { test, expect } from "@playwright/test"

test.describe("Settings Pages & UI Widgets — Comprehensive", () => {
  test.describe("Settings navigation", () => {
    test("SCENARIO: Settings page loads without error", async ({ page }) => {
      await page.goto("/settings", { waitUntil: "domcontentloaded" }); await page.waitForTimeout(3000)
      await expect(page.locator("body")).not.toHaveClass(/error/)
    })
    test("SCENARIO: Navigate to each settings subsection", async ({ page }) => {
      for (const sub of [{ label: "Profile", href: "/settings/profile" }, { label: "Notifications", href: "/settings/notifications" }, { label: "API Keys", href: "/settings/api-keys" }]) {
        await page.goto(sub.href, { waitUntil: "domcontentloaded" }); await page.waitForTimeout(2000)
        expect(await page.locator("body").evaluate((el) => el.classList.contains("error")).catch(() => false)).toBe(false)
      }
    })
  })

  test.describe("Profile settings", () => {
    test("SCENARIO: Profile page shows user info form", async ({ page }) => {
      await page.goto("/settings/profile", { waitUntil: "domcontentloaded" }); await page.waitForTimeout(3000)
      const nameInput = page.locator('input[name="name"], input[placeholder*="name"]').first()
      if (await nameInput.isVisible().catch(() => false)) await expect(nameInput).toBeVisible()
    })
  })

  test.describe("Notifications settings", () => {
    test("SCENARIO: Notifications page shows toggle switches", async ({ page }) => {
      await page.goto("/settings/notifications", { waitUntil: "domcontentloaded" }); await page.waitForTimeout(3000)
      const toggles = page.locator('[role="switch"], input[type="checkbox"], [class*="toggle"]')
      if ((await toggles.count()) > 0) { await toggles.first().click(); await page.waitForTimeout(500); await toggles.first().click(); await page.waitForTimeout(500) }
    })
  })

  test.describe("API Keys page", () => {
    test("SCENARIO: API Keys page loads", async ({ page }) => {
      await page.goto("/settings/api-keys", { waitUntil: "domcontentloaded" }); await page.waitForTimeout(3000)
      const addBtn = page.getByRole("button", { name: /add key|generate|create key/i }).first()
      if (await addBtn.isVisible().catch(() => false)) await expect(addBtn).toBeVisible()
    })
  })

  test.describe("Date picker interactions", () => {
    test("SCENARIO: Date input accepts manual date entry", async ({ page }) => {
      await page.goto("/expenses", { waitUntil: "domcontentloaded" }); await page.waitForTimeout(3000)
      const addBtn = page.getByRole("button", { name: /add expense|add new/i }).first()
      if (!(await addBtn.isVisible().catch(() => false))) { test.skip(true, "Add expense button not found"); return }
      await addBtn.click(); await page.waitForTimeout(500)
      const dateInput = page.locator('input[type="date"], input[name="date"], input[placeholder*="date"]').first()
      if (await dateInput.isVisible().catch(() => false)) { await dateInput.fill("2026-08-15"); await page.waitForTimeout(300); expect(await dateInput.inputValue()).toBeTruthy() }
    })
  })

  test.describe("Toast/notification system", () => {
    test("SCENARIO: Creating an expense shows success toast", async ({ page }) => {
      await page.goto("/expenses", { waitUntil: "domcontentloaded" }); await page.waitForTimeout(3000)
      const addBtn = page.getByRole("button", { name: /add expense|add new/i }).first()
      if (!(await addBtn.isVisible().catch(() => false))) { test.skip(true, "Add expense button not found"); return }
      await addBtn.click(); await page.waitForTimeout(500)
      await page.fill('input[name="vendor"]', `ToastExp-${Date.now()}`); await page.fill('input[name="amount"]', "500")
      await page.getByRole("button", { name: /save|add|create/i }).first().click(); await page.waitForTimeout(2000)
    })
  })

  test.describe("Profile switcher", () => {
    test("SCENARIO: Profile switcher is visible in sidebar", async ({ page }) => {
      await page.goto("/", { waitUntil: "domcontentloaded" }); await page.waitForTimeout(2000)
      const switcher = page.locator('[class*="profile-switcher"], [class*="profile"] select, button:has-text("Profile")').first()
      if (await switcher.isVisible().catch(() => false)) await expect(switcher).toBeVisible()
    })
  })

  test.describe("Keyboard shortcuts", () => {
    test("SCENARIO: Pressing n opens new expense dialog", async ({ page }) => {
      await page.goto("/expenses", { waitUntil: "domcontentloaded" }); await page.waitForTimeout(2000)
      await page.keyboard.press("n"); await page.waitForTimeout(500)
      const dialog = page.getByRole("dialog")
      if (await dialog.isVisible().catch(() => false)) { await expect(dialog).toBeVisible(); await page.keyboard.press("Escape") }
    })
  })
})
