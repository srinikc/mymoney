export interface Category {
  id: number
  name: string
  type: string
  icon: string
  color: string
}

export interface Expense {
  id: number
  date: string
  amount: number
  categoryId: number
  category: Category
  subCategory: string | null
  person: string | null
  vendor: string | null
  description: string | null
  paymentMode: string
  recurrenceType: string | null
  otherType: string | null
  tags: string | null
  receiptUrl: string | null
  isShared: boolean
  sharedWith: string | null
  paidThrough: string | null
  bankAccount: string | null
  notes: string | null
  importSessionId: number | null
  flagged: boolean | null
  deletedAt: string | null
  createdAt: string
  updatedAt: string
}

export interface Budget {
  id: number
  categoryId: number
  category: Category
  subCategory?: string | null
  month: number
  year: number
  amount: number
  spent?: number
  remaining?: number
}

export interface Goal {
  id: number
  name: string
  targetAmount: number
  currentAmount: number
  deadline: string | null
  category: string
  term: string
  priority: string
  type: string
  targetUnit: string | null
  goldQuantity: number | null
  description: string | null
  monthlyContribution: number | null
  notes: string | null
  status: string
  progress: number
}

export interface Loan {
  id: number
  name: string
  type: string
  principal: number
  interestRate: number
  tenureMonths: number
  emiAmount: number
  lender: string | null
  startDate: string
  notes: string | null
  linkedGoalId: number | null
  emiActive: boolean
  emiStartDate: string | null
  emiFrequency: string | null
  remainingAmount: number | null
  status: string
  closedDate: string | null
  createdAt: string
  updatedAt: string
}

export interface Asset {
  id: number
  name: string
  type: string
  currentValue: number
  purchasePrice: number | null
  purchaseDate: string | null
  quantity: number | null
  unit: string | null
  location: string | null
  status: string
  purpose: string | null
  notes: string | null
  createdAt: string
  updatedAt: string
  profitLoss?: number
  profitLossPercent?: number
}

export interface Investment {
  id: number
  type: string
  name: string
  symbol: string | null
  quantity: number | null
  buyPrice: number | null
  amount: number
  currentValue: number
  purchaseDate: string
  returnRate: number | null
  purpose: string | null
  linkedGoalId: number | null
  notes: string | null
  status: string
  employeeContribution: number | null
  employerContribution: number | null
  passbookUrl: string | null
  projectionYears: number | null
  fdNumber: string | null
  bankName: string | null
  maturityDate: string | null
  paymentMode: string | null
  monthlyContribution: number | null
  totalMonths: number | null
  completedMonths: number | null
  returnPercent: number
}

export interface Plan {
  id: number
  name: string
  description: string | null
  category: string
  amountNeeded: number
  amountSaved: number
  monthlyContribution: number | null
  deadline: string | null
  status: string
  notes: string | null
  progress: number
}

export interface Subscription {
  id: number
  name: string
  provider: string
  amount: number
  billingCycle: string
  nextDueDate: string | null
  category: string
  status: string
  notes: string | null
  createdAt: string
  updatedAt: string
  daysUntilDue?: number
  nextBillingDate?: string | null
}

export interface DashboardInsights {
  periodLabel: string
  periodExpense: number
  periodIncome: number
  periodNetSavings: number
  overallExpense: number
  overallIncome: number
  overallNetSavings: number
  currentMonthBudget: number
  currentMonthSpent: number
  currentMonthOverUnder: { amount: number; pct: number; status: "over" | "under" } | null
  trendByYear: { year: number; months: { month: string; amount: number }[] }[]
  totalExpenses: number
  totalIncome: number
  monthlyExpense: number
  monthlyBudget: number
  budgetUtilization: number
  activeGoals: number
  goalProgress: number
  totalInvestments: number
  totalCurrentValue: number
  investmentReturns: number
  totalPF: number
  totalLoans: number
  yearlyExpense: number
  topCategories: { name: string; amount: number; percentage: number }[]
  monthlyTrend: { month: string; amount: number }[]
  incomeTrend: { month: string; amount: number }[]
  categoryBreakdown: { name: string; amount: number; color: string }[]
  recentExpenses: Expense[]
  allTimeExpenses: number
  currentMonthExpenses: number
  allTimeIncome: number
  currentYearIncome: number
  totalInsurancePremium: number
  totalSubscriptionMonthly: number
}
