import { z } from "zod"

export const IncomeSourceCreateSchema = z.object({
  name: z.string().min(1, "Name is required"),
  type: z.enum(["monthly", "yearly", "onetime", "variable"]).optional().default("monthly"),
  amount: z.union([z.string(), z.number()]).transform((v) => typeof v === "string" ? Number.parseFloat(v) : v).pipe(z.number().positive("Amount must be positive")),
  categoryId: z.union([z.string(), z.number()]).optional().transform((v) => v === undefined ? undefined : typeof v === "string" ? Number.parseInt(String(v)) : v),
  categoryName: z.string().optional(),

  autoDetect: z.boolean().optional().default(false),
  matchMerchant: z.string().optional().nullable(),
  matchPerson: z.string().optional().nullable(),

  paymentMode: z.string().optional().nullable(),
  bankAccount: z.string().optional().nullable(),

  businessRevenue: z.union([z.string(), z.number()]).optional().nullable().transform((v) => v === null || v === undefined ? null : typeof v === "string" ? Number.parseFloat(v) : v),
  businessExpenses: z.union([z.string(), z.number()]).optional().nullable().transform((v) => v === null || v === undefined ? null : typeof v === "string" ? Number.parseFloat(v) : v),
  businessOtherExp: z.string().optional().nullable(),
  businessOtherAmt: z.union([z.string(), z.number()]).optional().nullable().transform((v) => v === null || v === undefined ? null : typeof v === "string" ? Number.parseFloat(v) : v),
  businessInvestment: z.union([z.string(), z.number()]).optional().nullable().transform((v) => v === null || v === undefined ? null : typeof v === "string" ? Number.parseFloat(v) : v),
  isProfitPostTax: z.boolean().optional().default(false),

  startDate: z.string().optional().nullable(),
  endDate: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
})

const CategorySchema = z.object({
  id: z.number(),
  name: z.string(),
  type: z.string(),
  icon: z.string(),
  color: z.string(),
})

export const IncomeSourceResponseSchema = z.object({
  id: z.number(),
  name: z.string(),
  type: z.enum(["monthly", "yearly", "onetime", "variable"]),
  amount: z.number(),
  categoryId: z.number(),
  category: CategorySchema.nullable(),
  profileId: z.number().nullable(),
  autoDetect: z.boolean(),
  matchMerchant: z.string().nullable(),
  matchPerson: z.string().nullable(),
  paymentMode: z.string().nullable(),
  bankAccount: z.string().nullable(),
  businessRevenue: z.number().nullable(),
  businessExpenses: z.number().nullable(),
  businessOtherExp: z.string().nullable(),
  businessOtherAmt: z.number().nullable(),
  businessInvestment: z.number().nullable(),
  isProfitPostTax: z.boolean(),
  startDate: z.string().nullable(),
  endDate: z.string().nullable(),
  notes: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
})

export type IncomeSourceResponse = z.infer<typeof IncomeSourceResponseSchema>

export const IncomeSourceUpdateSchema = z.object({
  name: z.string().min(1).optional(),
  type: z.enum(["monthly", "yearly", "onetime", "variable"]).optional(),
  amount: z.union([z.string(), z.number()]).optional().transform((v) => v === undefined ? undefined : typeof v === "string" ? Number.parseFloat(v) : v),
  categoryId: z.union([z.string(), z.number()]).optional().transform((v) => v === undefined ? undefined : typeof v === "string" ? Number.parseInt(String(v)) : v),
  categoryName: z.string().optional(),

  autoDetect: z.boolean().optional(),
  matchMerchant: z.string().optional().nullable(),
  matchPerson: z.string().optional().nullable(),

  paymentMode: z.string().optional().nullable(),
  bankAccount: z.string().optional().nullable(),

  businessRevenue: z.union([z.string(), z.number()]).optional().nullable().transform((v) => v === null || v === undefined ? null : typeof v === "string" ? Number.parseFloat(v) : v),
  businessExpenses: z.union([z.string(), z.number()]).optional().nullable().transform((v) => v === null || v === undefined ? null : typeof v === "string" ? Number.parseFloat(v) : v),
  businessOtherExp: z.string().optional().nullable(),
  businessOtherAmt: z.union([z.string(), z.number()]).optional().nullable().transform((v) => v === null || v === undefined ? null : typeof v === "string" ? Number.parseFloat(v) : v),
  businessInvestment: z.union([z.string(), z.number()]).optional().nullable().transform((v) => v === null || v === undefined ? null : typeof v === "string" ? Number.parseFloat(v) : v),
  isProfitPostTax: z.boolean().optional(),

  startDate: z.string().optional().nullable(),
  endDate: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
})
