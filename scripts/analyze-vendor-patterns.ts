import { PrismaClient } from "@prisma/client"

const p = new PrismaClient()

async function main() {
  console.log("=".repeat(80))
  console.log("EXPENSE VENDOR PATTERN ANALYSIS")
  console.log("=".repeat(80))

  const allExpenses = await p.expense.findMany({
    include: { category: true },
    orderBy: { date: "asc" },
  })

  console.log("\nTotal expenses in database: " + allExpenses.length)

  const vendorMap = new Map()
  for (const e of allExpenses) {
    const v = (e.vendor || "").trim()
    if (!vendorMap.has(v)) vendorMap.set(v, [])
    vendorMap.get(v).push(e)
  }

  const distinctVendors = [...vendorMap.entries()]
    .filter(([k]) => k.length > 0)
    .sort((a, b) => b[1].length - a[1].length)
  console.log("\nDistinct vendor names (non-empty): " + distinctVendors.length)

  const nullVendorExpenses = allExpenses.filter(e => !e.vendor || e.vendor.trim() === "")
  console.log("\n" + "=".repeat(80))
  console.log("7. EXPENSES WITH NO VENDOR NAME: " + nullVendorExpenses.length + " (" + ((nullVendorExpenses.length / allExpenses.length) * 100).toFixed(1) + "% of total)")
  console.log("=".repeat(80))

  console.log("\n8. SAMPLE OF 20 EXPENSE DESCRIPTIONS (no vendor):")
  console.log("-".repeat(80))
  const nullVendorSamples = nullVendorExpenses.slice(0, 20)
  for (const e of nullVendorSamples) {
    console.log("  [" + e.date.toISOString().split("T")[0] + "] Rs." + e.amount + " | cat=" + (e.category?.name || "NONE") + " | sub=" + (e.subCategory || "none") + " | desc=\"" + (e.description || "") + "\"")
  }

  console.log("\n9. PATTERNS IN NO-VENDOR DESCRIPTIONS:")
  console.log("-".repeat(80))

  const nvByCategory = new Map()
  for (const e of nullVendorExpenses) {
    const cat = e.category?.name || "UNCATEGORIZED"
    nvByCategory.set(cat, (nvByCategory.get(cat) || 0) + 1)
  }
  console.log("  Category distribution for no-vendor expenses:")
  const nvCatSorted = [...nvByCategory.entries()].sort((a, b) => b[1] - a[1])
  for (const [cat, count] of nvCatSorted) {
    console.log("    " + cat + ": " + count)
  }

  const descWordFreq = new Map()
  for (const e of nullVendorExpenses) {
    const desc = (e.description || "").toLowerCase()
    const words = desc.split(/[\s,.\-;:!?\/]+/).filter(w => w.length > 2)
    for (const w of words) {
      descWordFreq.set(w, (descWordFreq.get(w) || 0) + 1)
    }
  }
  console.log("\n  Top 30 keywords in no-vendor descriptions:")
  const topDescWords = [...descWordFreq.entries()].sort((a, b) => b[1] - a[1]).slice(0, 30)
  for (const [word, count] of topDescWords) {
    console.log("    \"" + word + "\": " + count)
  }

  const descCatPatterns = new Map()
  for (const e of nullVendorExpenses) {
    const desc = (e.description || "").toLowerCase().trim()
    if (!desc) continue
    const cat = e.category?.name || "UNCATEGORIZED"
    const patterns = [
      desc.includes("zomato") ? "zomato" : null,
      desc.includes("swiggy") ? "swiggy" : null,
      desc.includes("amazon") ? "amazon" : null,
      desc.includes("flipkart") ? "flipkart" : null,
      desc.includes("rent") ? "rent" : null,
      desc.includes("electricity") || desc.includes("electric") ? "electricity" : null,
      desc.includes("water") ? "water" : null,
      desc.includes("internet") || desc.includes("broadband") || desc.includes("wifi") ? "internet" : null,
      desc.includes("phone") || desc.includes("mobile") ? "phone" : null,
      desc.includes("insurance") ? "insurance" : null,
      desc.includes("emi") || desc.includes("loan") ? "emi/loan" : null,
      desc.includes("salary") || desc.includes("stipend") ? "salary" : null,
      desc.includes("transport") || desc.includes("uber") || desc.includes("ola") ? "transport" : null,
      desc.includes("grocer") || desc.includes("mart") || desc.includes("store") ? "grocery" : null,
      desc.includes("medical") || desc.includes("pharmacy") || desc.includes("medicine") ? "medical" : null,
      desc.includes("tax") ? "tax" : null,
      desc.includes("subscription") || desc.includes("netflix") || desc.includes("prime") ? "subscription" : null,
      desc.includes("fuel") || desc.includes("petrol") || desc.includes("diesel") || desc.includes("gas") ? "fuel" : null,
      desc.includes("movie") || desc.includes("cinema") ? "entertainment" : null,
      desc.includes("education") || desc.includes("school") || desc.includes("college") || desc.includes("course") ? "education" : null,
    ].filter(Boolean)
    for (const pattern of patterns) {
      if (!descCatPatterns.has(pattern)) descCatPatterns.set(pattern, new Map())
      const catMap = descCatPatterns.get(pattern)
      catMap.set(cat, (catMap.get(cat) || 0) + 1)
    }
  }
  console.log("\n  Category mapping patterns found in descriptions:")
  const sortedPatterns = [...descCatPatterns.entries()].sort((a, b) => {
    const totalA = [...a[1].values()].reduce((s, v) => s + v, 0)
    const totalB = [...b[1].values()].reduce((s, v) => s + v, 0)
    return totalB - totalA
  })
  for (const [pattern, cats] of sortedPatterns) {
    const total = [...cats.values()].reduce((s, v) => s + v, 0)
    const catList = [...cats.entries()].sort((a, b) => b[1] - a[1])
    const catStr = catList.map(([c, n]) => c + "(" + n + ")").join(", ")
    console.log("    \"" + pattern + "\" (" + total + " expenses): " + catStr)
  }

  console.log("\n" + "=".repeat(80))
  console.log("2-4. VENDOR CATEGORY ANALYSIS")
  console.log("=".repeat(80))

  const vendorStats = []

  for (const [vendor, expenses] of distinctVendors) {
    const categories = new Map()
    const subCategories = new Map()
    const persons = new Map()
    let totalAmount = 0
    for (const e of expenses) {
      const cat = e.category?.name || "UNCATEGORIZED"
      categories.set(cat, (categories.get(cat) || 0) + 1)
      const sub = e.subCategory || ""
      if (sub) subCategories.set(sub, (subCategories.get(sub) || 0) + 1)
      const per = e.person || ""
      if (per) persons.set(per, (persons.get(per) || 0) + 1)
      totalAmount += e.amount
    }
    const topCat = [...categories.entries()].sort((a, b) => b[1] - a[1])
    const topSub = [...subCategories.entries()].sort((a, b) => b[1] - a[1])
    const topPer = [...persons.entries()].sort((a, b) => b[1] - a[1])
    vendorStats.push({
      vendor,
      count: expenses.length,
      categories, subCategories, persons,
      topCategory: topCat[0]?.[0] || "NONE",
      topCategoryPct: topCat[0] ? (topCat[0][1] / expenses.length) * 100 : 0,
      topSubCategory: topSub[0]?.[0] || "",
      topPerson: topPer[0]?.[0] || "",
      avgAmount: totalAmount / expenses.length,
      totalAmount,
    })
  }
  vendorStats.sort((a, b) => b.count - a.count)

  const noCatVendors = vendorStats.filter(v => v.topCategory === "UNCATEGORIZED")
  console.log("\n" + "=".repeat(80))
  console.log("5. VENDORS WITH NO CATEGORY ASSIGNED (UNCATEGORIZED): " + noCatVendors.length)
  console.log("=".repeat(80))
  for (const v of noCatVendors.slice(0, 20)) {
    console.log("  \"" + v.vendor + "\" (" + v.count + " expenses, avg Rs." + v.avgAmount.toFixed(0) + ")")
  }
  if (noCatVendors.length > 20) console.log("  ... and " + (noCatVendors.length - 20) + " more")

  const highConfidence = vendorStats.filter(v => v.topCategoryPct > 80 && v.topCategory !== "UNCATEGORIZED")
  console.log("\n" + "=".repeat(80))
  console.log("3. HIGH-CONFIDENCE AUTO-CATEGORIZABLE VENDORS (>80% same category): " + highConfidence.length)
  console.log("=".repeat(80))
  for (const v of highConfidence) {
    console.log("  \"" + v.vendor + "\" -> " + v.topCategory + " (" + v.topCategoryPct.toFixed(1) + "% of " + v.count + " expenses, avg Rs." + v.avgAmount.toFixed(0) + ")")
    if (v.topSubCategory) console.log("    subCategory: " + v.topSubCategory)
    if (v.topPerson) console.log("    person: " + v.topPerson)
  }

  const ambiguous = vendorStats.filter(v => v.categories.size > 1 && v.topCategoryPct <= 80 && v.topCategory !== "UNCATEGORIZED")
  console.log("\n" + "=".repeat(80))
  console.log("4. AMBIGUOUS VENDORS (multiple categories, no single dominant): " + ambiguous.length)
  console.log("=".repeat(80))
  for (const v of ambiguous) {
    const catDist = [...v.categories.entries()].sort((a, b) => b[1] - a[1])
    const catStr = catDist.map(([c, n]) => c + "(" + n + ")").join(", ")
    console.log("  \"" + v.vendor + "\" (" + v.count + " expenses): " + catStr)
  }

  console.log("\n" + "=".repeat(80))
  console.log("6. TOP 50 MOST FREQUENT VENDORS WITH CATEGORY DISTRIBUTION")
  console.log("=".repeat(80))

  for (let i = 0; i < Math.min(50, vendorStats.length); i++) {
    const v = vendorStats[i]
    const catDist = [...v.categories.entries()].sort((a, b) => b[1] - a[1])
    const catStr = catDist.map(([c, n]) => c + "(" + n + ")").join(", ")
    const confLabel = v.topCategoryPct > 80 ? "[HIGH-CONF]" : v.categories.size > 1 ? "[AMBIGUOUS]" : "[SINGLE]"
    console.log("  #" + (i+1) + " \"" + v.vendor + "\" [" + v.count + " txns, Rs." + v.totalAmount.toFixed(0) + " total] " + confLabel)
    console.log("     Categories: " + catStr)
    if (v.topSubCategory) console.log("     Top subCategory: " + v.topSubCategory)
    if (v.topPerson) console.log("     Top person: " + v.topPerson)
    console.log()
  }

  console.log("\n" + "=".repeat(80))
  console.log("SUMMARY")
  console.log("=".repeat(80))
  console.log("  Total expenses: " + allExpenses.length)
  console.log("  Distinct vendors (non-empty): " + distinctVendors.length)
  console.log("  Expenses with no vendor: " + nullVendorExpenses.length + " (" + ((nullVendorExpenses.length / allExpenses.length) * 100).toFixed(1) + "%)")
  console.log("  High-confidence vendors (>80% same category): " + highConfidence.length)
  console.log("  Ambiguous vendors (multi-category): " + ambiguous.length)
  console.log("  No-category vendors: " + noCatVendors.length)
  const hcExpenses = highConfidence.reduce((s, v) => s + v.count, 0)
  console.log("  Total expenses covered by high-confidence rules: " + hcExpenses + " (" + ((hcExpenses / allExpenses.length) * 100).toFixed(1) + "%)")
  const ambExpenses = ambiguous.reduce((s, v) => s + v.count, 0)
  console.log("  Total expenses covered by ambiguous vendors: " + ambExpenses)

  const autoCatExpenses = hcExpenses + nullVendorExpenses.length
  console.log("\n  Auto-categorization potential: " + autoCatExpenses + " expenses (" + ((autoCatExpenses / allExpenses.length) * 100).toFixed(1) + "% of total)")
  console.log("    - From high-confidence vendor rules: " + hcExpenses)
  console.log("    - From description patterns (no vendor): ~" + nullVendorExpenses.length)

  await p.$disconnect()
}

main().catch(error => { console.error(error); p.$disconnect() })