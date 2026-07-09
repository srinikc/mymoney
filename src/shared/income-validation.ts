import { z } from "zod"

export const IncomeSourceCreateSchema = z.object({
  name: z.string().min(1, "Name is required"),
  type: z.enum(["monthly", "yearly", "onetime", "variable"]).optional().default("monthly"),
  amount: z.union([z.string(), z.number()]).transform((v) => typeof v === "string" ? Number.parseFloat(v) : v).pipe(z.number().positive("Amount must be positive")),
  categoryId: z.union([z.string(), z.number()]).transform((v) => typeof v === "string" ? Number.parseInt(String(v)) : v),

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

export const IncomeSourceUpdateSchema = z.object({
  name: z.string().min(1).optional(),
  type: z.enum(["monthly", "yearly", "onetime", "variable"]).optional(),
  amount: z.union([z.string(), z.number()]).optional().transform((v) => v === undefined ? undefined : typeof v === "string" ? Number.parseFloat(v) : v),
  categoryId: z.union([z.string(), z.number()]).optional().transform((v) => v === undefined ? undefined : typeof v === "string" ? Number.parseInt(String(v)) : v),

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
