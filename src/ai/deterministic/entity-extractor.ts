// ── Entity Extractor ────────────────────────────────────────────────────
// Extracts structured entities from text: amount, category, vendor, date, etc.

import type { ParsedEntities } from "@/shared/assistant"
import { extractAmount, extractDate, normalizeText } from "./normalizer"

// ── Category Keywords ───────────────────────────────────────────────────

const CATEGORY_KEYWORDS: Record<string, string[]> = {
  // Food & Dining
  food: ["food", "groceries", "grocery", "grocery", "khana", "anna", "tiffin", "lunch", "dinner", "breakfast", "snacks", "tea", "chai", "coffee", "restaurant", "hotel", "dhaba", "swiggy", "zomato"],
  dining: ["restaurant", "hotel", "dhaba", "cafe", "coffee", "tea", "swiggy", "zomato", "food", "dinner", "lunch", "breakfast"],

  // Transport
  transport: ["fuel", "petrol", "diesel", "gas", "auto", "taxi", "uber", "ola", "bus", "metro", "train", "flight", "parking", "toll", "travel"],

  // Shopping
  shopping: ["shopping", "clothes", "clothing", "shoes", "electronics", "mobile", "phone", "laptop", "amazon", "flipkart", "myntra"],

  // Bills & Utilities
  utilities: ["electricity", "power", "water", "gas", "internet", "wifi", "broadband", "mobile recharge", "phone bill", "dth", "cable"],

  // Rent & Housing
  rent: ["rent", "house rent", "maintenance", "society", "repair", "plumber", "electrician"],

  // Health
  health: ["doctor", "medicine", "pharmacy", "hospital", "clinic", "medical", "health", "vitamins", "checkup"],

  // Education
  education: ["school", "college", "tuition", "course", "book", "books", "stationery", "exam", "fee"],

  // Entertainment
  entertainment: ["movie", "movies", "netflix", "hotstar", "amazon prime", "spotify", "youtube", "game", "games", "concert", "show"],

  // Personal Care
  personal: ["salon", "parlor", "haircut", "grooming", "cosmetics", "beauty"],

  // Gifts & Donations
  gifts: ["gift", "gifts", "donation", "charity", "temple", "church", "mosque"],

  // Insurance
  insurance: ["insurance", "premium", "lic", "term insurance", "health insurance"],

  // Subscriptions
  subscriptions: ["subscription", "netflix", "hotstar", "prime", "spotify", "gym"],

  // EMIs
  emi: ["emi", "loan payment", "credit card", "personal loan", "home loan", "car loan"],

  // Salary (for income)
  salary: ["salary", "wages", "stipend", "pay"],

  // Freelance (for income)
  freelance: ["freelance", "project", "client", "consulting", "contract"],
}

// ── Payment Mode Keywords ───────────────────────────────────────────────

const PAYMENT_MODE_KEYWORDS: Record<string, string[]> = {
  cash: ["cash", "cash", "haath", "note"],
  upi: ["upi", "gpay", "google pay", "phonepe", "paytm", "bhim", "qr"],
  card: ["card", "credit card", "debit card", "visa", "mastercard", "rupay"],
  bank_transfer: ["bank transfer", "neft", "rtgs", "imps", "transfer", "bank"],
  online: ["online", "net banking", "wallet", "mobikwik", "freecharge"],
}

// ── Vendor Extraction ───────────────────────────────────────────────────

/**
 * Common vendor/store names to recognize.
 */
const KNOWN_VENDORS: Record<string, string> = {
  swiggy: "Swiggy",
  zomato: "Zomato",
  amazon: "Amazon",
  flipkart: "Flipkart",
  bigbasket: "BigBasket",
  reliance: "Reliance",
  dmart: "DMart",
  starbucks: "Starbucks",
  mcdonalds: "McDonalds",
  kfc: "KFC",
  pizza: "Pizza Hut",
  uber: "Uber",
  ola: "Ola",
  rapido: "Rapido",
  movie: "Movie",
  netflix: "Netflix",
  hotstar: "Hotstar",
  spotify: "Spotify",
  gym: "Gym",
}

// ── Main Extraction Function ────────────────────────────────────────────

/**
 * Extract all entities from text input.
 */
export function extractEntities(text: string): ParsedEntities {
  const normalized = normalizeText(text)

  return {
    amount: extractAmount(normalized),
    category: extractCategory(normalized),
    vendor: extractVendor(normalized),
    description: extractDescription(normalized),
    date: extractDate(normalized),
    paymentMode: extractPaymentMode(normalized),
  }
}

/**
 * Extract expense/income category from text.
 */
export function extractCategory(text: string): string | undefined {
  const lower = text.toLowerCase()

  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    for (const keyword of keywords) {
      if (lower.includes(keyword)) {
        return category
      }
    }
  }

  return undefined
}

/**
 * Extract vendor/store name from text.
 */
export function extractVendor(text: string): string | undefined {
  const lower = text.toLowerCase()

  // Check known vendors
  for (const [key, name] of Object.entries(KNOWN_VENDORS)) {
    if (lower.includes(key)) {
      return name
    }
  }

  // Try to extract vendor after "at", "from", "to"
  const vendorMatch = text.match(/\b(?:at|from|to|of)\s+([A-Za-z][\d\sA-Za-z]{2,20})\b/)
  if (vendorMatch) {
    return vendorMatch[1].trim()
  }

  return undefined
}

/**
 * Extract description from text (the non-entity part).
 */
export function extractDescription(text: string): string | undefined {
  // Remove amounts, dates, payment modes, and categories
  const desc = text
    .replaceAll(/[$£€₹]\s*\d+/g, "")
    .replaceAll(/\d+/g, "")
    .replaceAll(/\b(today|yesterday|tomorrow|last month|this month)\b/gi, "")
    .replaceAll(/\b(cash|upi|card|bank transfer|online)\b/gi, "")
    .replaceAll(/\b(for|on|at|from|to|of|the|a|an)\b/gi, "")
    .replaceAll(/\s+/g, " ")
    .trim()

  if (desc.length < 3) return undefined
  return desc
}

/**
 * Extract payment mode from text.
 */
export function extractPaymentMode(text: string): string | undefined {
  const lower = text.toLowerCase()

  for (const [mode, keywords] of Object.entries(PAYMENT_MODE_KEYWORDS)) {
    for (const keyword of keywords) {
      if (lower.includes(keyword)) {
        return mode
      }
    }
  }

  return undefined
}
