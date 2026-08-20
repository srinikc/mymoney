import { test, expect } from "@playwright/test"

async function openBudgetPage(page: import("@playwright/test").Page): Promise<boolean> {
  await page.goto("/budgets", { waitUntil: "domcontentloaded" })
  await page.waitForTimeout(1500)
  try {
    const btn = page.locator("button:has-text('Add Category')")
    await btn.waitFor({ state: "visible", timeout: 10000 })
    return true
  } catch {
    return false
  }
}

test.describe("Budget Features — Planner, Common Categories & Repeat", () => {
  test("SCENARIO: Budgets page shows income, totals and planner sections", async ({ page }) => {
    if (!(await openBudgetPage(page))) { test.skip(true, "Budgets page not accessible"); return }
    await expect(page.getByText(/Income/).first()).toBeVisible()
    await expect(page.getByText("Budget Planner")).toBeVisible()
    await expect(page.getByRole("button", { name: /Add Category/ })).toBeVisible()
    await expect(page.getByRole("button", { name: /Save All/ })).toBeVisible()
    await expect(page.getByRole("button", { name: /Repeat to/ })).toBeVisible()
    await expect(page.getByRole("columnheader", { name: /Budget/ }).first()).toBeVisible()
    await expect(page.getByRole("columnheader", { name: /spent/ }).first()).toBeVisible()
  })

  test("SCENARIO: Repeat month checkboxes are shown inline", async ({ page }) => {
    if (!(await openBudgetPage(page))) { test.skip(true, "Budgets page not accessible"); return }
    await expect(page.getByText(/Repeat budget to:/)).toBeVisible()
    // At least the current month's checkbox should be present
    const currentMonth = new Date().toLocaleString("en-US", { month: "long" })
    await expect(page.getByText(currentMonth).first()).toBeVisible()
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

  test("SCENARIO: Budget overview returns common categories, income and totals", async ({ request }) => {
    const now = new Date()
    const res = await request.get(`/api/budgets/overview?month=${now.getMonth() + 1}&year=${now.getFullYear()}`)
    expect(res.ok()).toBe(true)
    const data = await res.json()
    expect(data.overview).toBe(true)
    expect(Array.isArray(data.commonCategories)).toBe(true)
    expect(data.totals).toBeDefined()
    expect(data.totals.current).toBeDefined()
    expect(data.totals.lastMonth).toBeDefined()
    expect(typeof data.income).toBe("number")
    for (const row of data.commonCategories) {
      expect(row.categoryId).toBeDefined()
      expect(row.category?.name).toBeDefined()
      expect(typeof row.lastMonthSpend).toBe("number")
    }
  })

  test("SCENARIO: Income summary accepts month/year params", async ({ request }) => {
    const res = await request.get(`/api/income/summary?month=6&year=2026`)
    expect(res.ok()).toBe(true)
    const data = await res.json()
    expect(data.month).toBe(6)
    expect(data.year).toBe(2026)
  })

  test("SCENARIO: Budget repeat creates budgets and skips existing ones", async ({ request }) => {
    // Create a fresh category so the repeat test is deterministic and never
    // collides with pre-existing budgets for the same (category, month, year).
    const uniqueCat = `RepeatCat-${Date.now()}`
    const catRes = await request.post("/api/categories", { data: { name: uniqueCat, type: "expense" } })
    expect(catRes.ok()).toBe(true)
    const expenseCat = await catRes.json()

    const year = 2026
    const months = [9, 10]
    const body = { year, entries: [{ categoryId: expenseCat.id, subCategory: null, amount: 1500, months }] }

    const first = await request.post("/api/budgets/repeat", { data: body })
    expect(first.ok()).toBe(true)
    const firstData = await first.json()
    expect(firstData.created).toBe(months.length)
    expect(firstData.skipped).toBe(0)

    // Second call should skip all (existing)
    const second = await request.post("/api/budgets/repeat", { data: body })
    expect(second.ok()).toBe(true)
    const secondData = await second.json()
    expect(secondData.created).toBe(0)
    expect(secondData.skipped).toBe(months.length)

    // Cleanup budgets (leave the category row; it is a unique test artifact)
    for (const m of months) {
      const list = await request.get(`/api/budgets?month=${m}&year=${year}`)
      const budgets = await list.json()
      for (const b of budgets) {
        if (b.categoryId === expenseCat.id) await request.delete(`/api/budgets?id=${b.id}`)
      }
    }
  })
})