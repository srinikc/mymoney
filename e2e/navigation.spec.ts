import { test, expect } from "@playwright/test"

test.describe("Sidebar Navigation", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/")
    await page.waitForSelector("h1", { timeout: 15000 })
  })

  const pages = [
    { href: "/", label: "Dashboard" },
    { href: "/budgets", label: "Budgets" },
    { href: "/goals", label: "Goals" },
    { href: "/investments", label: "Investments" },
    { href: "/plans", label: "Plans" },
    { href: "/insights", label: "Insights" },
    { href: "/reminders", label: "Reminders" },
    { href: "/reports", label: "Reports" },
    { href: "/deals", label: "Deals" },
    { href: "/net-worth", label: "Net Worth" },
    { href: "/settings", label: "Settings" },
    { href: "/expenses", label: "All Expenses" },
    { href: "/expenses/import", label: "Bulk Import" },
    { href: "/expenses/merchants", label: "Merchants" },
    { href: "/expenses/review-duplicates", label: "Review" },
  ]

  for (const p of pages) {
    test(`navigates to ${p.label} (${p.href})`, async ({ page }) => {
      if (p.href === "/") return

      await page.goto(p.href, { waitUntil: "load", timeout: 20000 })
      await expect(page).toHaveURL(new RegExp(p.href.slice(1).replace("/", "\\/")), { timeout: 10000 })
      await expect(page.locator("body")).not.toHaveClass(/error/)
    })
  }
})
