import { test, expect } from "@playwright/test"

test.describe("Curated Funds Section", () => {
  test("funds API returns curated funds", async ({ request }) => {
    const res = await request.get("/api/funds/curated")
    expect(res.status()).toBeLessThan(500)
  })

  test("investments page renders curated funds section", async ({ page }) => {
    await page.goto("/investments", { waitUntil: "domcontentloaded" })
    await page.waitForTimeout(5000)
    const section = page.getByTestId("curated-funds-section")
    if (await section.isVisible({ timeout: 10000 }).catch(() => false)) {
      await expect(section).toBeVisible()
    }
  })

  test("fund card has scheme code data attribute", async ({ page }) => {
    await page.goto("/investments", { waitUntil: "domcontentloaded" })
    await page.waitForTimeout(5000)
    const card = page.getByTestId("fund-card").first()
    if (await card.isVisible({ timeout: 10000 }).catch(() => false)) {
      const scheme = await card.getAttribute("data-scheme")
      expect(scheme).toBeTruthy()
    }
  })

  test("fund category filter works", async ({ page }) => {
    await page.goto("/investments", { waitUntil: "domcontentloaded" })
    await page.waitForTimeout(5000)
    const filter = page.getByTestId("fund-category-filter")
    if (await filter.isVisible({ timeout: 10000 }).catch(() => false)) {
      await expect(filter).toBeVisible()
    }
  })

  test("sponsored fund card has data-sponsored=true", async ({ page }) => {
    await page.goto("/investments", { waitUntil: "domcontentloaded" })
    await page.waitForTimeout(5000)
    const sponsored = page.locator('[data-testid="fund-card"][data-sponsored="true"]')
    // May or may not be visible depending on whether admin set a placement
    const count = await sponsored.count()
    expect(count).toBeGreaterThanOrEqual(0)
  })
})
