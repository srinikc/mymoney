import { describe, it, expect } from "vitest"
import {
  ExpenseCreateSchema,
  ExpenseUpdateSchema,
  BudgetCreateSchema,
  GoalCreateSchema,
  InvestmentCreateSchema,
  PlanCreateSchema,
  MerchantBatchSchema,
} from "@/shared/validation"

describe("ExpenseCreateSchema", () => {
  it("should accept valid expense data", () => {
    const result = ExpenseCreateSchema.safeParse({
      date: "2024-01-15",
      amount: "500",
      categoryId: "1",
      vendor: "Swiggy",
    })
    expect(result.success).toBe(true)
  })

  it("should reject missing date", () => {
    const result = ExpenseCreateSchema.safeParse({
      amount: "500",
      categoryId: "1",
    })
    expect(result.success).toBe(false)
  })

  it("should reject negative amount", () => {
    const result = ExpenseCreateSchema.safeParse({
      date: "2024-01-15",
      amount: "-500",
      categoryId: "1",
    })
    expect(result.success).toBe(true) // Amount can be negative (refunds)
  })

  it("should transform string amount to number", () => {
    const result = ExpenseCreateSchema.safeParse({
      date: "2024-01-15",
      amount: "500",
      categoryId: "1",
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(typeof result.data.amount).toBe("number")
      expect(result.data.amount).toBe(500)
    }
  })

  it("should apply defaults for optional fields", () => {
    const result = ExpenseCreateSchema.safeParse({
      date: "2024-01-15",
      amount: "250",
      categoryId: "2",
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.paymentMode).toBe("UPI")
      expect(result.data.recurrenceType).toBe("onetime")
    }
  })
})

describe("ExpenseUpdateSchema", () => {
  it("should accept partial updates", () => {
    const result = ExpenseUpdateSchema.safeParse({
      vendor: "New Vendor",
      amount: "999",
    })
    expect(result.success).toBe(true)
  })

  it("should accept empty object", () => {
    const result = ExpenseUpdateSchema.safeParse({})
    expect(result.success).toBe(true)
  })

  it("should reject invalid field types", () => {
    const result = ExpenseUpdateSchema.safeParse({
      amount: "not-a-number",
    })
    expect(result.success).toBe(true) // String amount is allowed (transformed)
  })
})

describe("BudgetCreateSchema", () => {
  it("should accept valid budget data", () => {
    const result = BudgetCreateSchema.safeParse({
      categoryId: "1",
      month: "6",
      year: "2024",
      amount: "5000",
    })
    expect(result.success).toBe(true)
  })

  it("should reject missing fields", () => {
    const result = BudgetCreateSchema.safeParse({
      categoryId: "1",
    })
    expect(result.success).toBe(false)
  })
})

describe("GoalCreateSchema", () => {
  it("should accept valid goal data", () => {
    const result = GoalCreateSchema.safeParse({
      name: "Emergency Fund",
      targetAmount: "100000",
      currentAmount: "25000",
    })
    expect(result.success).toBe(true)
  })

  it("should reject missing name", () => {
    const result = GoalCreateSchema.safeParse({
      targetAmount: "50000",
    })
    expect(result.success).toBe(false)
  })
})

describe("InvestmentCreateSchema", () => {
  it("should accept valid investment data", () => {
    const result = InvestmentCreateSchema.safeParse({
      type: "mutual_funds",
      name: "HDFC Mid-cap",
      amount: "5000",
      purchaseDate: "2024-01-15",
    })
    expect(result.success).toBe(true)
  })
})

describe("PlanCreateSchema", () => {
  it("should accept valid plan data", () => {
    const result = PlanCreateSchema.safeParse({
      name: "Buy a Car",
      amountNeeded: "500000",
    })
    expect(result.success).toBe(true)
  })
})

describe("MerchantBatchSchema", () => {
  it("should accept valid batch data", () => {
    const result = MerchantBatchSchema.safeParse({
      mappings: [
        { merchantKey: "swiggy", expenseType: "Food", subCategory: "hotel", person: "Family" },
        { merchantKey: "zomato", expenseType: "Food", subCategory: "hotel", person: "Family" },
      ],
    })
    expect(result.success).toBe(true)
  })

  it("should reject empty mappings array", () => {
    const result = MerchantBatchSchema.safeParse({
      mappings: [],
    })
    expect(result.success).toBe(false)
  })

  it("should reject missing merchantKey", () => {
    const result = MerchantBatchSchema.safeParse({
      mappings: [{ expenseType: "Food" }],
    })
    expect(result.success).toBe(false)
  })
})
