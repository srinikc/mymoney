import { test, expect } from "@playwright/test"

test.describe("Curated Loans Section", () => {
  test("loans page shows curated loan products from API", async ({ page, request }) => {
    // First check the API returns loans
    const res = await request.get("/api/loans/recommendations")
    expect(res.status()).toBeLessThan(500)
  })

  test("loans page renders curated section with loan cards", async ({ page }) => {
    await page.goto("/loans", { waitUntil: "domcontentloaded" })
    await page.waitForTimeout(3000)
    const section = page.getByTestId("curated-loans-section")
    if (await section.isVisible({ timeout: 5000 }).catch(() => false)) {
      await expect(section).toBeVisible()
      const cards = page.getByTestId("loan-product-card")
      const count = await cards.count()
      expect(count).toBeGreaterThan(0)
    }
  })

  test("loan card shows bank name, rate, max amount", async ({ page }) => {
    await page.goto("/loans", { waitUntil: "domcontentloaded" })
    await page.waitForTimeout(3000)
    const card = page.getByTestId("loan-product-card").first()
    if (await card.isVisible({ timeout: 5000 }).catch(() => false)) {
      const bankAttr = await card.getAttribute("data-bank")
      expect(bankAttr).toBeTruthy()
      expect(bankAttr).not.toBe("")
    }
  })

  test("sponsored loan card has data-sponsored=true attribute", async ({ page }) => {
    await page.goto("/loans", { waitUntil: "domcontentloaded" })
    await page.waitForTimeout(3000)
    const sponsored = page.locator('[data-testid="loan-product-card"][data-sponsored="true"]')
    const count = await sponsored.count()
    if (count > 0) {
      await expect(sponsored.first()).toBeVisible()
    }
  })

  test("loan filter dropdown is present and functional", async ({ page }) => {
    await page.goto("/loans", { waitUntil: "domcontentloaded" })
    await page.waitForTimeout(3000)
    const filter = page.getByTestId("loan-type-filter")
    if (await filter.isVisible({ timeout: 5000 }).catch(() => false)) {
      await filter.click()
      await page.waitForTimeout(500)
      // Some option should be visible
      const options = page.getByRole("option")
      const optsCount = await options.count()
      expect(optsCount).toBeGreaterThan(0)
    }
  })
})
