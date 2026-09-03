import { describe, it, expect } from "vitest"
import { generateLocalResponse } from "../lib/local-chat"

const baseContext = {
  totalExpenses: 50000,
  monthlyAverage: 4500,
  topCategories: [
    { name: "Food", amount: 15000 },
    { name: "Transport", amount: 8000 },
  ],
  budgetStatus: [
    { name: "Food", spent: 15000, limit: 10000 },
    { name: "Transport", spent: 5000, limit: 8000 },
  ],
  goals: [
    { name: "Emergency Fund", target: 200000, saved: 80000 },
    { name: "Vacation", target: 100000, saved: 20000 },
  ],
  recentTransactions: [
    { date: "2026-01-15", description: "Grocery", amount: 1200 },
  ],
  netWorth: { assets: 500000, liabilities: 100000 },
  totalIncome: 600000,
  savingsRate: 20,
  investments: [
    { name: "NIFTY 50 Index", amount: 50000, currentValue: 55000 },
  ],
  monthlyExpense: 4500,
  monthlyIncome: 5000,
  netWorthValue: 400000,
  topCategory: { name: "Food", amount: 15000 },
  hasData: true,
}

describe("local-chat engine", () => {
  it("returns personalized spending response", () => {
    const out = generateLocalResponse("How much did I spend?", baseContext)
    expect(out).toContain("₹4,500")
    expect(out).toContain("Food")
  })

  it("returns budget over-response when categories overspent", () => {
    const out = generateLocalResponse("Am I over budget?", baseContext)
    expect(out).toContain("Food")
    expect(out).toContain("over")
  })

  it("returns goals progress", () => {
    const out = generateLocalResponse("How are my goals?", baseContext)
    expect(out).toContain("Emergency Fund")
    expect(out).toContain("Vacation")
  })

  it("returns emergency fund status with months covered", () => {
    const out = generateLocalResponse("How is my emergency fund?", baseContext)
    expect(out).toContain("Emergency fund")
    // Response has "**17.8 months** of expenses" — markdown bold between
    expect(out).toMatch(/months.*of expenses/)
    expect(out).toContain("17.8")
  })

  it("returns savings rate and provides actionable advice", () => {
    const out = generateLocalResponse("What's my savings rate?", baseContext)
    expect(out).toContain("20.0%")
    expect(out).toMatch(/target|index|invest|surplus/i)
  })

  it("returns net worth with assets and liabilities", () => {
    const out = generateLocalResponse("What's my net worth?", baseContext)
    expect(out).toContain("₹4,00,000")
    expect(out).toContain("₹5,00,000")
    expect(out).toContain("₹1,00,000")
  })

  it("returns investment portfolio summary", () => {
    const out = generateLocalResponse("How are my investments?", baseContext)
    expect(out).toContain("NIFTY 50")
    expect(out).toContain("₹55,000")
  })

  it("returns tax planning tips for India", () => {
    const out = generateLocalResponse("What about tax saving?", baseContext)
    expect(out).toContain("80C")
    expect(out).toContain("80D")
  })

  it("handles empty/no-data context gracefully", () => {
    const empty = {
      ...baseContext,
      totalExpenses: 0,
      monthlyExpense: 0,
      monthlyIncome: 0,
      totalIncome: 0,
      savingsRate: 0,
      topCategories: [],
      budgetStatus: [],
      goals: [],
      investments: [],
      recentTransactions: [],
      netWorth: { assets: 0, liabilities: 0 },
      netWorthValue: 0,
      topCategory: null,
      hasData: false,
    }
    const out = generateLocalResponse("How much did I spend?", empty)
    expect(out).toMatch(/haven't recorded|no expenses|add some/i)
  })

  it("handles advice/cut-spending questions", () => {
    const out = generateLocalResponse("Suggest ways to save money", baseContext)
    expect(out).toMatch(/save|cut|reduce|target|budget|emergency|invest/i)
  })

  it("returns actionable budget status with remaining amounts", () => {
    const out = generateLocalResponse("How much budget do I have left?", baseContext)
    expect(out).toContain("Total budget")
    expect(out).toContain("Remaining")
  })
})
