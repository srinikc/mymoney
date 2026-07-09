import { z } from "zod"

export const ExpenseCreateSchema = z.object({
  date: z.string().min(1, "Date is required"),
  amount: z.union([z.string(), z.number()]).transform((v) => typeof v === "string" ? Number.parseFloat(v) : v),
  categoryId: z.union([z.string(), z.number()]).transform((v) => typeof v === "string" ? Number.parseInt(v) : v),
  categoryName: z.string().optional(),
  vendor: z.string().max(200).optional().default(""),
  description: z.string().max(500).optional().default(""),
  paymentMode: z.string().optional().default("UPI"),
  subCategory: z.string().optional().default(""),
  person: z.string().optional().default(""),
  recurrenceType: z.string().optional().default("onetime"),
  otherType: z.string().optional().default(""),
  tags: z.string().optional().default(""),
  notes: z.string().optional().default(""),
  bankAccount: z.string().optional().default(""),
  paidThrough: z.string().optional().default(""),
})

export const ExpenseUpdateSchema = z.object({
  date: z.string().optional(),
  amount: z.union([z.string(), z.number()]).optional(),
  categoryId: z.union([z.string(), z.number()]).optional(),
  subCategory: z.string().optional(),
  person: z.string().optional(),
  vendor: z.string().optional(),
  description: z.string().optional(),
  paymentMode: z.string().optional(),
  recurrenceType: z.string().optional(),
  otherType: z.string().optional(),
  tags: z.string().optional(),
  receiptUrl: z.string().optional(),
  isShared: z.boolean().optional(),
  sharedWith: z.string().optional(),
  notes: z.string().optional(),
  bankAccount: z.string().optional(),
  paidThrough: z.string().optional(),
  saveMapping: z.boolean().optional(),
})

export const BudgetCreateSchema = z.object({
  categoryId: z.union([z.string(), z.number()]).transform(Number),
  month: z.union([z.string(), z.number()]).transform(Number),
  year: z.union([z.string(), z.number()]).transform(Number),
  amount: z.union([z.string(), z.number()]).transform(Number),
})

export const GoalCreateSchema = z.object({
  name: z.string().min(1, "Name is required"),
  targetAmount: z.union([z.string(), z.number()]),
  currentAmount: z.union([z.string(), z.number()]).optional().default("0"),
  deadline: z.string().optional(),
  category: z.string().optional().default("savings"),
  notes: z.string().optional(),
  status: z.string().optional().default("active"),
})

export const InvestmentCreateSchema = z.object({
  type: z.string().min(1, "Type is required"),
  name: z.string().min(1, "Name is required"),
  symbol: z.string().optional().nullable(),
  quantity: z.union([z.string(), z.number()]).optional().nullable(),
  buyPrice: z.union([z.string(), z.number()]).optional().nullable(),
  amount: z.union([z.string(), z.number()]),
  currentValue: z.union([z.string(), z.number()]).optional(),
  purchaseDate: z.string().min(1, "Purchase date is required"),
  returnRate: z.union([z.string(), z.number()]).optional(),
  notes: z.string().optional(),
  status: z.string().optional().default("active"),
})

export const PlanCreateSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  category: z.string().optional().default("general"),
  amountNeeded: z.union([z.string(), z.number()]),
  amountSaved: z.union([z.string(), z.number()]).optional().default("0"),
  monthlyContribution: z.union([z.string(), z.number()]).optional(),
  deadline: z.string().optional(),
  notes: z.string().optional(),
  status: z.string().optional().default("active"),
})

export const CategoryCreateSchema = z.object({
  name: z.string().min(1, "Name is required"),
  type: z.string().optional().default("expense"),
  icon: z.string().optional().default("circle"),
  color: z.string().optional().default("#6366f1"),
})

export const DealCreateSchema = z.object({
  merchant: z.string().min(1, "Merchant is required"),
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  discount: z.string().optional(),
  couponCode: z.string().optional(),
  url: z.string().optional(),
  validUntil: z.string().optional(),
  category: z.string().optional(),
  isActive: z.boolean().optional(),
})

export const ReminderCreateSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  type: z.string().optional().default("custom"),
  priority: z.string().optional().default("normal"),
  dueDate: z.string().optional(),
  amount: z.union([z.string(), z.number()]).optional(),
  categoryId: z.union([z.string(), z.number()]).optional(),
  merchantKey: z.string().optional(),
  recurring: z.string().optional().default("none"),
})

export const GoalUpdateSchema = z.object({
  id: z.union([z.string(), z.number()]),
  name: z.string().optional(),
  targetAmount: z.union([z.string(), z.number()]).optional(),
  currentAmount: z.union([z.string(), z.number()]).optional(),
  deadline: z.string().optional().nullable(),
  category: z.string().optional(),
  notes: z.string().optional().nullable(),
  status: z.string().optional(),
})

export const InvestmentUpdateSchema = z.object({
  id: z.union([z.string(), z.number()]),
  type: z.string().optional(),
  name: z.string().optional(),
  symbol: z.string().optional().nullable(),
  quantity: z.union([z.string(), z.number()]).optional().nullable(),
  buyPrice: z.union([z.string(), z.number()]).optional().nullable(),
  amount: z.union([z.string(), z.number()]).optional(),
  currentValue: z.union([z.string(), z.number()]).optional(),
  purchaseDate: z.string().optional(),
  returnRate: z.union([z.string(), z.number()]).optional().nullable(),
  notes: z.string().optional().nullable(),
  status: z.string().optional(),
})

export const PlanUpdateSchema = z.object({
  id: z.union([z.string(), z.number()]),
  name: z.string().optional(),
  description: z.string().optional().nullable(),
  category: z.string().optional(),
  amountNeeded: z.union([z.string(), z.number()]).optional(),
  amountSaved: z.union([z.string(), z.number()]).optional(),
  monthlyContribution: z.union([z.string(), z.number()]).optional().nullable(),
  deadline: z.string().optional().nullable(),
  status: z.string().optional(),
  notes: z.string().optional().nullable(),
})

export const ReminderUpdateSchema = z.object({
  id: z.union([z.string(), z.number()]),
  title: z.string().optional(),
  description: z.string().optional().nullable(),
  type: z.string().optional(),
  priority: z.string().optional(),
  dueDate: z.string().optional().nullable(),
  amount: z.union([z.string(), z.number()]).optional().nullable(),
  categoryId: z.union([z.string(), z.number()]).optional().nullable(),
  merchantKey: z.string().optional().nullable(),
  recurring: z.string().optional(),
  isCompleted: z.boolean().optional(),
})

export const MerchantBatchSchema = z.object({
  mappings: z.array(z.object({
    merchantKey: z.string().min(1),
    expenseType: z.string().optional().default(""),
    subCategory: z.string().optional().default(""),
    person: z.string().optional().default(""),
  })).min(1, "At least one mapping is required"),
})

// ── Auth & Profile Schemas ──────────────────────────────────────────

export const ProfileCreateSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  userId: z.union([z.string(), z.number()]).transform(Number),
  isDefault: z.boolean().optional().default(false),
})

export const ProfileUpdateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  isDefault: z.boolean().optional(),
})

export const UserUpdateSchema = z.object({
  name: z.string().max(100).optional(),
  image: z.string().url().optional().nullable(),
  role: z.enum(["user", "admin", "manager", "viewer"]).optional(),
  tier: z.enum(["free", "pro", "premium"]).optional(),
})

export const FeatureFlagCreateSchema = z.object({
  name: z.string().min(1).max(100),
  enabled: z.boolean().optional().default(false),
  tier: z.enum(["free", "pro", "premium"]).optional().default("free"),
})

export const FeatureFlagUpdateSchema = z.object({
  enabled: z.boolean().optional(),
  tier: z.enum(["free", "pro", "premium"]).optional(),
})

export const SubscriptionCreateSchema = z.object({
  name: z.string().min(1, "Name is required"),
  provider: z.string().min(1, "Provider is required"),
  amount: z.union([z.string(), z.number()]).transform((v) => typeof v === "string" ? Number.parseFloat(v) : v),
  billingCycle: z.string().optional().default("monthly"),
  nextDueDate: z.string().optional().nullable().transform((v) => v ? new Date(v) : null),
  category: z.string().optional().default("entertainment"),
  status: z.string().optional().default("active"),
  notes: z.string().optional().nullable(),
})

export const SubscriptionUpdateSchema = z.object({
  id: z.union([z.string(), z.number()]),
  name: z.string().optional(),
  provider: z.string().optional(),
  amount: z.union([z.string(), z.number()]).optional().transform((v) => v === undefined ? undefined : typeof v === "string" ? Number.parseFloat(v) : v),
  billingCycle: z.string().optional(),
  nextDueDate: z.string().optional().nullable().transform((v) => v ? new Date(v) : null),
  category: z.string().optional(),
  status: z.string().optional(),
  notes: z.string().optional().nullable(),
})

export const AssetCreateSchema = z.object({
  name: z.string().min(1, "Name is required"),
  type: z.string().optional().default("other"),
  currentValue: z.union([z.string(), z.number()]).transform((v) => typeof v === "string" ? Number.parseFloat(v) : v),
  purchasePrice: z.union([z.string(), z.number()]).optional().nullable().transform((v) => v === null || v === undefined ? null : typeof v === "string" ? Number.parseFloat(v) : v),
  purchaseDate: z.string().optional().nullable(),
  quantity: z.union([z.string(), z.number()]).optional().nullable().transform((v) => v === null || v === undefined ? null : typeof v === "string" ? Number.parseFloat(v) : v),
  unit: z.string().optional().nullable(),
  location: z.string().optional().nullable(),
  status: z.string().optional().default("owned"),
  notes: z.string().optional().nullable(),
})

export const AssetUpdateSchema = z.object({
  id: z.union([z.string(), z.number()]),
  name: z.string().optional(),
  type: z.string().optional(),
  currentValue: z.union([z.string(), z.number()]).optional(),
  purchasePrice: z.union([z.string(), z.number()]).optional().nullable().transform((v) => v === null || v === undefined ? null : typeof v === "string" ? Number.parseFloat(v) : v),
  purchaseDate: z.string().optional().nullable(),
  quantity: z.union([z.string(), z.number()]).optional().nullable().transform((v) => v === null || v === undefined ? null : typeof v === "string" ? Number.parseFloat(v) : v),
  unit: z.string().optional().nullable(),
  location: z.string().optional().nullable(),
  status: z.string().optional(),
  notes: z.string().optional().nullable(),
})

export const AuditLogCreateSchema = z.object({
  profileId: z.union([z.string(), z.number()]).transform(Number),
  action: z.enum(["create", "update", "delete", "view", "export", "import"]),
  entity: z.string().min(1),
  entityId: z.union([z.string(), z.number()]).optional().nullable(),
  metadata: z.string().optional().nullable(),
})
