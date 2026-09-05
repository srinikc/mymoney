import { z } from "zod"

export const EXPENSE_PURPOSES = [
  "groceries",
  "dining",
  "transport",
  "rent",
  "utilities",
  "medical",
  "education",
  "wedding",
  "festival",
  "religious",
  "gifting",
  "travel",
  "home-repair",
  "vehicle-maintenance",
  "appliance",
  "electronics",
  "apparel",
  "personal-care",
  "entertainment",
  "subscription",
  "insurance-premium",
  "emi-payment",
  "investment",
  "tax-payment",
  "charity",
  "childcare",
  "pet-care",
  "other",
] as const

export type ExpensePurpose = (typeof EXPENSE_PURPOSES)[number]

export const UNUSUAL_THRESHOLD = 5000

export const REGULAR_CATEGORIES_NO_PURPOSE = new Set([
  "rent-housing",
  "utility-bills",
  "telecom",
  "debt-repayment",
  "protection-premiums",
  "tax-govt",
  "card-fees",
  "office-supplies",
  "wealth-building",
  "equity",
])

export function shouldRequirePurpose(categoryName: string | null | undefined, amount: number): boolean {
  if (amount <= UNUSUAL_THRESHOLD) return false
  if (categoryName && REGULAR_CATEGORIES_NO_PURPOSE.has(categoryName)) return false
  return true
}

export function isUnusualByDefault(categoryName: string | null | undefined, amount: number): boolean {
  if (amount <= UNUSUAL_THRESHOLD) return false
  if (categoryName && REGULAR_CATEGORIES_NO_PURPOSE.has(categoryName)) return false
  return true
}

export const ExpenseCreateSchema = z.object({
  date: z.string().min(1, "Date is required"),
  amount: z.union([z.string(), z.number()]).transform((v) => typeof v === "string" ? Number.parseFloat(v) : v),
  categoryId: z.union([z.string(), z.number()]).optional().transform((v) => typeof v === "string" ? Number.parseInt(v) : v),
  purpose: z.enum(EXPENSE_PURPOSES).optional(),
  isUnusual: z.boolean().optional(),
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
  repeat: z.object({
    day: z.union([z.string(), z.number()]).optional().transform((v) => (v === undefined || v === "") ? undefined : Number(v)),
    direction: z.enum(["forward", "backward"]).optional().default("forward"),
    count: z.union([z.string(), z.number()]).optional().transform((v) => (v === undefined || v === "") ? undefined : Number(v)),
  }).optional(),
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
  purpose: z.enum(EXPENSE_PURPOSES).nullable().optional(),
  isUnusual: z.boolean().optional(),
})

export const BudgetCreateSchema = z.object({
  categoryId: z.union([z.string(), z.number()]).transform(Number),
  subCategory: z.string().nullable().optional(),
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
  term: z.string().optional().default("medium"),
  priority: z.string().optional().default("P1"),
  type: z.string().optional().default("Functions"),
  description: z.string().optional(),
  monthlyContribution: z.union([z.string(), z.number()]).optional(),
  notes: z.string().optional(),
  status: z.string().optional().default("active"),
  targetUnit: z.string().optional().default("₹"),
  goldQuantity: z.union([z.string(), z.number()]).optional().nullable(),
  employeeContribution: z.union([z.string(), z.number()]).optional().nullable(),
  employerContribution: z.union([z.string(), z.number()]).optional().nullable(),
  passbookUrl: z.string().optional().nullable(),
  projectionYears: z.union([z.string(), z.number()]).optional().nullable(),
  fdNumber: z.string().optional().nullable(),
  bankName: z.string().optional().nullable(),
  maturityDate: z.string().optional().nullable(),
  paymentMode: z.string().optional().nullable(),
  monthlyContributionAmt: z.union([z.string(), z.number()]).optional().nullable(),
  totalMonths: z.union([z.string(), z.number()]).optional().nullable(),
  completedMonths: z.union([z.string(), z.number()]).optional().nullable(),
  purpose: z.string().optional().nullable(),
  // ── Hierarchy & Retirement fields ──────────────────────────────────
  parentGoalId: z.union([z.string(), z.number()]).optional().nullable(),
  isRetirementParent: z.boolean().optional(),
  retirementAge: z.union([z.string(), z.number()]).optional().nullable(),
  lifeExpectancy: z.union([z.string(), z.number()]).optional().nullable(),
  currentMonthlyExpense: z.union([z.string(), z.number()]).optional().nullable(),
  medicalInflation: z.union([z.string(), z.number()]).optional().nullable(),
  preRetirementReturn: z.union([z.string(), z.number()]).optional().nullable(),
  postRetirementReturn: z.union([z.string(), z.number()]).optional().nullable(),
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
  purpose: z.string().optional(),
  linkedGoalId: z.union([z.string(), z.number()]).optional().nullable(),
  notes: z.string().optional(),
  status: z.string().optional().default("active"),
  employeeContribution: z.union([z.string(), z.number()]).optional().nullable(),
  employerContribution: z.union([z.string(), z.number()]).optional().nullable(),
  passbookUrl: z.string().optional().nullable(),
  projectionYears: z.union([z.string(), z.number()]).optional().nullable(),
  fdNumber: z.string().optional().nullable(),
  bankName: z.string().optional().nullable(),
  maturityDate: z.string().optional().nullable(),
  paymentMode: z.string().optional().nullable(),
  monthlyContribution: z.union([z.string(), z.number()]).optional().nullable(),
  totalMonths: z.union([z.string(), z.number()]).optional().nullable(),
  completedMonths: z.union([z.string(), z.number()]).optional().nullable(),
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
  term: z.string().optional(),
  priority: z.string().optional(),
  type: z.string().optional(),
  description: z.string().optional().nullable(),
  monthlyContribution: z.union([z.string(), z.number()]).optional().nullable(),
  notes: z.string().optional().nullable(),
  status: z.string().optional(),
  targetUnit: z.string().optional().nullable(),
  goldQuantity: z.union([z.string(), z.number()]).optional().nullable(),
  // ── Hierarchy & Retirement fields ──────────────────────────────────
  parentGoalId: z.union([z.string(), z.number()]).optional().nullable(),
  isRetirementParent: z.boolean().optional(),
  retirementAge: z.union([z.string(), z.number()]).optional().nullable(),
  lifeExpectancy: z.union([z.string(), z.number()]).optional().nullable(),
  currentMonthlyExpense: z.union([z.string(), z.number()]).optional().nullable(),
  medicalInflation: z.union([z.string(), z.number()]).optional().nullable(),
  preRetirementReturn: z.union([z.string(), z.number()]).optional().nullable(),
  postRetirementReturn: z.union([z.string(), z.number()]).optional().nullable(),
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
  purpose: z.string().optional().nullable(),
  linkedGoalId: z.union([z.string(), z.number()]).optional().nullable(),
  notes: z.string().optional().nullable(),
  status: z.string().optional(),
  employeeContribution: z.union([z.string(), z.number()]).optional().nullable(),
  employerContribution: z.union([z.string(), z.number()]).optional().nullable(),
  passbookUrl: z.string().optional().nullable(),
  projectionYears: z.union([z.string(), z.number()]).optional().nullable(),
  fdNumber: z.string().optional().nullable(),
  bankName: z.string().optional().nullable(),
  maturityDate: z.string().optional().nullable(),
  paymentMode: z.string().optional().nullable(),
  monthlyContribution: z.union([z.string(), z.number()]).optional().nullable(),
  totalMonths: z.union([z.string(), z.number()]).optional().nullable(),
  completedMonths: z.union([z.string(), z.number()]).optional().nullable(),
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
  purpose: z.string().optional().nullable(),
  // ── Vehicle fields ─────────────────────────────────────────────────
  vehicleType: z.string().optional().nullable(),
  makeModel: z.string().optional().nullable(),
  vehicleYear: z.union([z.string(), z.number()]).optional().nullable(),
  // ── Rental fields ──────────────────────────────────────────────────
  monthlyRentalIncome: z.union([z.string(), z.number()]).optional().nullable(),
  rentalGrowthRate: z.union([z.string(), z.number()]).optional().nullable(),
  isRentedOut: z.boolean().optional(),
  // ── Retirement integration ─────────────────────────────────────────
  isRetirementAsset: z.boolean().optional(),
  plannedSaleAge: z.union([z.string(), z.number()]).optional().nullable(),
  plannedSalePurpose: z.string().optional().nullable(),
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
  purpose: z.string().optional().nullable(),
  // ── Vehicle fields ─────────────────────────────────────────────────
  vehicleType: z.string().optional().nullable(),
  makeModel: z.string().optional().nullable(),
  vehicleYear: z.union([z.string(), z.number()]).optional().nullable(),
  // ── Rental fields ──────────────────────────────────────────────────
  monthlyRentalIncome: z.union([z.string(), z.number()]).optional().nullable(),
  rentalGrowthRate: z.union([z.string(), z.number()]).optional().nullable(),
  isRentedOut: z.boolean().optional(),
  // ── Retirement integration ─────────────────────────────────────────
  isRetirementAsset: z.boolean().optional(),
  plannedSaleAge: z.union([z.string(), z.number()]).optional().nullable(),
  plannedSalePurpose: z.string().optional().nullable(),
})

export const AuditLogCreateSchema = z.object({
  profileId: z.union([z.string(), z.number()]).transform(Number),
  action: z.enum(["create", "update", "delete", "view", "export", "import"]),
  entity: z.string().min(1),
  entityId: z.union([z.string(), z.number()]).optional().nullable(),
  metadata: z.string().optional().nullable(),
})

export const LoanCreateSchema = z.object({
  name: z.string().min(1, "Name is required"),
  type: z.string().min(1, "Type is required"),
  principal: z.union([z.string(), z.number()]),
  interestRate: z.union([z.string(), z.number()]),
  tenureMonths: z.union([z.string(), z.number()]),
  emiAmount: z.union([z.string(), z.number()]).optional(),
  lender: z.string().optional().nullable(),
  startDate: z.string().min(1, "Start date is required"),
  notes: z.string().optional().nullable(),
  linkedGoalId: z.union([z.string(), z.number()]).optional().nullable(),
  emiActive: z.boolean().optional().default(false),
  emiStartDate: z.string().optional().nullable(),
  emiFrequency: z.string().optional().nullable(),
  remainingAmount: z.union([z.string(), z.number()]).optional().nullable(),
  status: z.string().optional().default("active"),
  closedDate: z.string().optional().nullable(),
})

export const LoanUpdateSchema = z.object({
  id: z.union([z.string(), z.number()]),
  name: z.string().optional(),
  type: z.string().optional(),
  principal: z.union([z.string(), z.number()]).optional(),
  interestRate: z.union([z.string(), z.number()]).optional(),
  tenureMonths: z.union([z.string(), z.number()]).optional(),
  emiAmount: z.union([z.string(), z.number()]).optional(),
  lender: z.string().optional().nullable(),
  startDate: z.string().optional(),
  notes: z.string().optional().nullable(),
  linkedGoalId: z.union([z.string(), z.number()]).optional().nullable(),
  emiActive: z.boolean().optional(),
  emiStartDate: z.string().optional().nullable(),
  emiFrequency: z.string().optional().nullable(),
  remainingAmount: z.union([z.string(), z.number()]).optional().nullable(),
  status: z.string().optional(),
  closedDate: z.string().optional().nullable(),
})

// ── Family Member Schemas ─────────────────────────────────────────────

export const FamilyMemberCreateSchema = z.object({
  relation: z.string().min(1, "Relation is required"),
  name: z.string().min(1, "Name is required"),
  dateOfBirth: z.string().optional().nullable(),
  birthMonth: z.union([z.string(), z.number()]).optional().nullable(),
  birthYear: z.union([z.string(), z.number()]).optional().nullable(),
  annualIncome: z.union([z.string(), z.number()]).optional().nullable(),
  occupation: z.string().optional().nullable(),
  educationLevel: z.string().optional().nullable(),
  isDependent: z.boolean().optional(),
  monthlySupport: z.union([z.string(), z.number()]).optional().nullable(),
  notes: z.string().optional().nullable(),
})

export const FamilyMemberUpdateSchema = z.object({
  id: z.union([z.string(), z.number()]),
  relation: z.string().optional(),
  name: z.string().optional(),
  dateOfBirth: z.string().optional().nullable(),
  birthMonth: z.union([z.string(), z.number()]).optional().nullable(),
  birthYear: z.union([z.string(), z.number()]).optional().nullable(),
  annualIncome: z.union([z.string(), z.number()]).optional().nullable(),
  occupation: z.string().optional().nullable(),
  educationLevel: z.string().optional().nullable(),
  isDependent: z.boolean().optional(),
  monthlySupport: z.union([z.string(), z.number()]).optional().nullable(),
  notes: z.string().optional().nullable(),
})

// ── Obligation Schemas ────────────────────────────────────────────────

export const ObligationCreateSchema = z.object({
  type: z.string().min(1, "Type is required"),
  description: z.string().min(1, "Description is required"),
  monthlyAmount: z.union([z.string(), z.number()]),
  annualAmount: z.union([z.string(), z.number()]).optional().nullable(),
  startDate: z.string().optional().nullable(),
  endDate: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
  notes: z.string().optional().nullable(),
})

export const ObligationUpdateSchema = z.object({
  id: z.union([z.string(), z.number()]),
  type: z.string().optional(),
  description: z.string().optional(),
  monthlyAmount: z.union([z.string(), z.number()]).optional(),
  annualAmount: z.union([z.string(), z.number()]).optional().nullable(),
  startDate: z.string().optional().nullable(),
  endDate: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
  notes: z.string().optional().nullable(),
})

// ── Insurance Schemas ─────────────────────────────────────────────────

export const InsuranceCreateSchema = z.object({
  name: z.string().min(1, "Name is required"),
  type: z.string().optional().default("Other"),
  provider: z.string().optional().nullable(),
  policyNumber: z.string().optional().nullable(),
  sumAssured: z.union([z.string(), z.number()]).optional().nullable(),
  premium: z.union([z.string(), z.number()]),
  premiumFrequency: z.string().optional().default("yearly"),
  startDate: z.string().min(1, "Start date is required"),
  renewalDate: z.string().optional().nullable(),
  nominee: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  // ── Insurance type classification ──────────────────────────────────
  insuranceType: z.string().optional().nullable(),
  healthCoverType: z.string().optional().nullable(),
  termPolicyTerm: z.union([z.string(), z.number()]).optional().nullable(),
  termMaturityAge: z.union([z.string(), z.number()]).optional().nullable(),
  coverAmount: z.union([z.string(), z.number()]).optional().nullable(),
  vehicleType: z.string().optional().nullable(),
  vehicleCoverValidity: z.string().optional().nullable(),
})

export const InsuranceUpdateSchema = z.object({
  id: z.union([z.string(), z.number()]),
  name: z.string().optional(),
  type: z.string().optional(),
  provider: z.string().optional().nullable(),
  policyNumber: z.string().optional().nullable(),
  sumAssured: z.union([z.string(), z.number()]).optional().nullable(),
  premium: z.union([z.string(), z.number()]).optional(),
  premiumFrequency: z.string().optional(),
  startDate: z.string().optional(),
  renewalDate: z.string().optional().nullable(),
  nominee: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  // ── Insurance type classification ──────────────────────────────────
  insuranceType: z.string().optional().nullable(),
  healthCoverType: z.string().optional().nullable(),
  termPolicyTerm: z.union([z.string(), z.number()]).optional().nullable(),
  termMaturityAge: z.union([z.string(), z.number()]).optional().nullable(),
  coverAmount: z.union([z.string(), z.number()]).optional().nullable(),
  vehicleType: z.string().optional().nullable(),
  vehicleCoverValidity: z.string().optional().nullable(),
})

// ── Investment-Goal Allocation Schemas ────────────────────────────────

export const AllocationCreateSchema = z.object({
  goalId: z.union([z.string(), z.number()]),
  investmentId: z.union([z.string(), z.number()]).optional().nullable(),
  assetId: z.union([z.string(), z.number()]).optional().nullable(),
  fixedDepositId: z.union([z.string(), z.number()]).optional().nullable(),
  cashId: z.union([z.string(), z.number()]).optional().nullable(),
  allocationPct: z.union([z.string(), z.number()]),
  notes: z.string().optional().nullable(),
})

export const AllocationUpdateSchema = z.object({
  id: z.union([z.string(), z.number()]),
  allocationPct: z.union([z.string(), z.number()]).optional(),
  notes: z.string().optional().nullable(),
})
