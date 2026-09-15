// ── Conversational Write Flow ───────────────────────────────────────────
// Deterministic, multi-turn creation of expenses / income / budgets /
// investments / goals / subscriptions / insurance. Collects required fields
// across turns, handles yes/no, and writes straight to the DB (no HTTP).

import { prisma } from "@/lib/prisma"
import type { ParsedEntities } from "@/shared/assistant"

export type WriteKind =
  | "add_expense"
  | "add_income"
  | "set_budget"
  | "add_investment"
  | "add_goal"
  | "add_subscription"
  | "add_insurance"

export interface Draft {
  kind: WriteKind
  fields: Record<string, unknown>
}

export interface Awaiting {
  mode: "confirm" | "field" | "offer"
  draft: Draft
  field?: string
  question: string
}

export interface WriteContext {
  userId: number
  profileId: number
}

const REQUIRED: Record<WriteKind, string[]> = {
  add_expense: ["amount"],
  add_income: ["amount", "name"],
  set_budget: ["category", "amount"],
  add_investment: ["name", "amount"],
  add_goal: ["name", "targetAmount"],
  add_subscription: ["name", "amount"],
  add_insurance: ["name", "premium"],
}

const FIELD_QUESTION: Record<string, string> = {
  amount: "How much? (e.g. 500)",
  targetAmount: "What's the target amount? (e.g. 100000)",
  premium: "What's the premium amount? (e.g. 12000/year)",
  category: "Which category? (e.g. Food, Rent, Shopping)",
  name: "What should I call it?",
  vendor: "Where / to whom? (optional)",
}

const KIND_LABEL: Record<WriteKind, string> = {
  add_expense: "expense",
  add_income: "income",
  set_budget: "budget",
  add_investment: "investment",
  add_goal: "goal",
  add_subscription: "subscription",
  add_insurance: "insurance",
}

/** Yes/no detection for conversational replies. */
export function parseYesNo(text: string): boolean | null {
  const t = text.trim().toLowerCase()
  if (/^(yes|yeah|yep|y|ok|okay|sure|confirm|do it|add it|add|proceed|haan|ha|sari|ಹೌದು|हाँ|हां)\b/.test(t)) return true
  if (/^(no|nope|n|cancel|stop|don'?t|dont|nah|nahi|nahin|बेडा|इल्ल|ಇಲ್ಲ)\b/.test(t)) return false
  return null
}

/** Build an initial draft from parsed entities. */
export function startDraft(kind: WriteKind, entities: ParsedEntities): Draft {
  const fields: Record<string, unknown> = {}
  if (entities.amount !== undefined) fields.amount = entities.amount
  if (entities.category) fields.category = entities.category
  if (entities.vendor) fields.vendor = entities.vendor
  if (entities.name) fields.name = entities.name
  if (entities.date) fields.date = entities.date
  if (kind === "add_goal" && entities.amount !== undefined) fields.targetAmount = entities.amount
  if (kind === "add_insurance" && entities.amount !== undefined) fields.premium = entities.amount
  return { kind, fields }
}

function missingFields(draft: Draft): string[] {
  return REQUIRED[draft.kind].filter((f) => draft.fields[f] === undefined || draft.fields[f] === null || draft.fields[f] === "")
}

/** Summarise a draft for confirmation. */
export function describeDraft(draft: Draft): string {
  const f = draft.fields
  switch (draft.kind) {
    case "add_expense":
      return `Add ₹${f.amount} expense${f.category ? ` for ${f.category}` : ""}${f.vendor ? ` at ${f.vendor}` : ""}?`
    case "add_income":
      return `Add ₹${f.amount} income from ${f.name}?`
    case "set_budget":
      return `Set ₹${f.amount} budget for ${f.category}?`
    case "add_investment":
      return `Add investment "${f.name}" worth ₹${f.amount}?`
    case "add_goal":
      return `Create goal "${f.name}" with target ₹${f.targetAmount}?`
    case "add_subscription":
      return `Add subscription "${f.name}" at ₹${f.amount}/month?`
    case "add_insurance":
      return `Add insurance "${f.name}" at ₹${f.premium}/year?`
    default:
      return "Confirm this action?"
  }
}

/** Advance a draft to the next step: ask for a missing field, or confirm. */
export function advanceDraft(draft: Draft): Awaiting {
  const missing = missingFields(draft)
  if (missing.length > 0) {
    const field = missing[0]
    return { mode: "field", draft, field, question: FIELD_QUESTION[field] || `Please provide ${field}.` }
  }
  return { mode: "confirm", draft, question: describeDraft(draft) }
}

/** Apply a user's free-text answer to the field we are waiting on. */
export function applyFieldAnswer(draft: Draft, field: string, text: string): Draft {
  const fields = { ...draft.fields }
  if (field === "amount" || field === "targetAmount" || field === "premium") {
    const m = text.replaceAll(",", "").match(/\d+(\.\d+)?/)
    if (m) fields[field] = Number.parseFloat(m[0])
  } else {
    const cleaned = text
      .replaceAll(/\b(it'?s|its|is|for|the|a|an)\b/gi, " ")
      .replaceAll(/\b(rupees|rs|inr|₹)\b/gi, " ")
      .replaceAll(/\s+/g, " ")
      .trim()
    fields[field] = cleaned || text.trim()
  }
  return { kind: draft.kind, fields }
}

// ── Category resolution ─────────────────────────────────────────────────

async function resolveExpenseCategory(name?: string): Promise<number> {
  const wanted = (name || "Uncategorized").trim()
  const existing = await prisma.category.findFirst({ where: { name: { equals: wanted, mode: "insensitive" } } })
  if (existing) return existing.id
  const fallback = await prisma.category.findFirst({ where: { name: { equals: "Uncategorized", mode: "insensitive" } } })
  if (fallback) return fallback.id
  const created = await prisma.category.create({ data: { name: wanted, type: "expense" } })
  return created.id
}

// ── Execution ───────────────────────────────────────────────────────────

/** Execute a completed draft against the database. */
export async function executeDraft(draft: Draft, ctx: WriteContext): Promise<string> {
  const f = draft.fields
  const today = new Date()
  const iso = typeof f.date === "string" ? f.date : today.toISOString().slice(0, 10)

  try {
    switch (draft.kind) {
      case "add_expense": {
        const categoryId = await resolveExpenseCategory(f.category as string | undefined)
        await prisma.expense.create({
          data: {
            date: new Date(iso),
            amount: Number(f.amount),
            categoryId,
            vendor: (f.vendor as string) || (f.category as string) || "Assistant",
            description: (f.vendor as string) || (f.category as string) || undefined,
            paymentMode: "UPI",
            profileId: ctx.profileId,
          },
        })
        return `✅ Added ₹${f.amount} expense${f.category ? ` for ${f.category}` : ""}${f.vendor ? ` at ${f.vendor}` : ""}.`
      }
      case "add_income": {
        const categoryId = await resolveExpenseCategory("Salary")
        await prisma.incomeSource.create({
          data: { name: String(f.name), type: "monthly", amount: Number(f.amount), categoryId, profileId: ctx.profileId },
        })
        return `✅ Added income of ₹${f.amount} from ${f.name}.`
      }
      case "set_budget": {
        const categoryId = await resolveExpenseCategory(f.category as string)
        const month = today.getMonth() + 1
        const year = today.getFullYear()
        await prisma.budget.upsert({
          where: { categoryId_month_year: { categoryId, month, year } },
          create: { categoryId, month, year, amount: Number(f.amount), profileId: ctx.profileId },
          update: { amount: Number(f.amount), profileId: ctx.profileId },
        })
        return `✅ Set ₹${f.amount} budget for ${f.category}.`
      }
      case "add_investment": {
        await prisma.investment.create({
          data: {
            type: "other",
            name: String(f.name),
            amount: Number(f.amount),
            currentValue: Number(f.amount),
            purchaseDate: new Date(iso),
            status: "active",
            profileId: ctx.profileId,
          },
        })
        return `✅ Added investment "${f.name}" worth ₹${f.amount}.`
      }
      case "add_goal": {
        await prisma.goal.create({
          data: { name: String(f.name), targetAmount: Number(f.targetAmount), currentAmount: 0, status: "active", profileId: ctx.profileId },
        })
        return `✅ Created goal "${f.name}" with target ₹${f.targetAmount}.`
      }
      case "add_subscription": {
        await prisma.subscription.create({
          data: { name: String(f.name), provider: String(f.name), amount: Number(f.amount), billingCycle: "monthly", status: "active", profileId: ctx.profileId },
        })
        return `✅ Added subscription "${f.name}" at ₹${f.amount}/month.`
      }
      case "add_insurance": {
        await prisma.insurance.create({
          data: { name: String(f.name), type: "Other", premium: Number(f.premium), premiumFrequency: "yearly", startDate: new Date(iso), profileId: ctx.profileId },
        })
        return `✅ Added insurance "${f.name}" at ₹${f.premium}/year.`
      }
      default:
        return "I couldn't complete that action."
    }
  } catch (error) {
    console.error("executeDraft failed:", error)
    return `I couldn't save that ${KIND_LABEL[draft.kind]}. Please try again.`
  }
}

/** Map an intent to a write kind. */
export function intentToWriteKind(intent: string): WriteKind | null {
  const map: Record<string, WriteKind> = {
    add_expense: "add_expense",
    add_income: "add_income",
    set_budget: "set_budget",
    update_budget: "set_budget",
    add_investment: "add_investment",
    add_goal: "add_goal",
    add_subscription: "add_subscription",
    add_insurance: "add_insurance",
  }
  return map[intent] || null
}
