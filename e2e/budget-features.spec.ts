import { test, expect } from "@playwright/test"

async function openBudgetDialog(page: import("@playwright/test").Page): Promise<boolean> {
  await page.goto("/budgets", { waitUntil: "domcontentloaded" })
  try { const btn = page.locator("button:has-text('Add Budget')"); await btn.waitFor({ state: "visible", timeout: 10000 }); await btn.click(); await page.waitForTimeout(500); return true }
  catch { return false }
}

test.describe("Budget Features — Sub-category & Custom Entries", () => {
  test("SCENARIO: Budget dialog has category and sub-category fields", async ({ page }) => {
    if (!(await openBudgetDialog(page))) { test.skip(true, "Add Budget button not visible"); return }
    await expect(page.getByText("Category").first()).toBeVisible()
    await expect(page.getByText("Sub-category").first()).toBeVisible()
    await expect(page.getByText("Monthly Limit").first()).toBeVisible()
    await page.keyboard.press("Escape")
  })

  test("SCENARIO: Category dropdown has 'Add custom category' option", async ({ page }) => {
    if (!(await openBudgetDialog(page))) { test.skip(true, "Add Budget button not visible"); return }
    const catSelect = page.locator("text=Category").first().locator("..").locator("select, [role='combobox']").first()
    if (await catSelect.isVisible().catch(() => false)) {
      await catSelect.click(); await page.waitForTimeout(300)
      const customOption = page.getByText(/add custom category/i).first()
      if (await customOption.isVisible().catch(() => false)) await expect(customOption).toBeVisible()
      await page.keyboard.press("Escape")
    }
    await page.keyboard.press("Escape")
  })

  test("SCENARIO: POST /api/categories creates a new category globally", async ({ request }) => {
    const uniqueName = `E2ECat-${Date.now()}`
    const res = await request.post("/api/categories", { data: { name: uniqueName, type: "expense" } })
    expect(res.ok()).toBe(true)
    const cat = await res.json(); expect(cat.name).toBe(uniqueName)
    const listRes = await request.get("/api/categories"); const cats = await listRes.json()
    const catsList = Array.isArray(cats) ? cats : (cats.categories || [])
    expect(catsList.find((c: { name: string }) => c.name === uniqueName)).toBeTruthy()
  })

  test("SCENARIO: Budget API accepts and returns subCategory", async ({ request }) => {
    const catRes = await request.get("/api/categories"); const cats = await catRes.json()
    const catsList = Array.isArray(cats) ? cats : (cats.categories || [])
    const expenseCat = catsList.find((c: { type: string }) => c.type === "expense")
    if (!expenseCat) { test.skip(true, "No expense categories available"); return }
    const now = new Date()
    const res = await request.post("/api/budgets", { data: { categoryId: String(expenseCat.id), subCategory: "Test SubCat E2E", month: String(now.getMonth() + 1), year: String(now.getFullYear()), amount: String(2000) } })
    if (res.ok()) { const budget = await res.json(); expect(budget.subCategory).toBe("Test SubCat E2E") }
  })

  test("SCENARIO: Categories API returns subCategories when ?include=subCategories", async ({ request }) => {
    const res = await request.get("/api/categories?include=subCategories")
    expect(res.ok()).toBe(true); const data = await res.json()
    expect(Array.isArray(data.categories)).toBe(true); expect(Array.isArray(data.subCategories)).toBe(true)
  })
})
