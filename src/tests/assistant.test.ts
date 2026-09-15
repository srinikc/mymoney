// ── Assistant Tests ─────────────────────────────────────────────────────
// Tests for the unified assistant: intent parsing, entity extraction,
// conversation management, and orchestrator.

import { describe, it, expect } from "vitest"
import { detectIntent, extractEntities } from "@/ai/deterministic/intent-parser"
import { normalizeText, extractAmount, extractDate } from "@/ai/deterministic/normalizer"
import { extractCategory, extractVendor, extractPaymentMode } from "@/ai/deterministic/entity-extractor"
import { detectLanguage } from "@/ai/assistant/language-detect"
import { resolvePageContext, getCapabilitiesForRoute } from "@/ai/assistant/page-context"
import { getConfirmationPolicy, requiresConfirmation, getRiskLevel } from "@/ai/assistant/confirmation"
import { generateResponse } from "@/ai/assistant/response-templates"

// ── Normalizer Tests ────────────────────────────────────────────────────

describe("normalizer", () => {
  describe("normalizeText", () => {
    it("normalizes currency symbols", () => {
      expect(normalizeText("Rs. 500")).toContain("₹500")
      expect(normalizeText("INR 500")).toContain("₹500")
    })

    it("normalizes abbreviations", () => {
      expect(normalizeText("5k")).toContain("5000")
      expect(normalizeText("2 lakh")).toContain("200000")
    })

    it("trims whitespace", () => {
      expect(normalizeText("  hello  ")).toBe("hello")
    })
  })

  describe("extractAmount", () => {
    it("extracts amount with currency symbol", () => {
      expect(extractAmount("₹500")).toBe(500)
      expect(extractAmount("Rs. 500")).toBe(500)
      expect(extractAmount("$50")).toBe(50)
    })

    it("extracts amount after preposition", () => {
      expect(extractAmount("spent 500 for food")).toBe(500)
      expect(extractAmount("500 on groceries")).toBe(500)
    })

    it("extracts standalone number", () => {
      expect(extractAmount("500")).toBe(500)
      expect(extractAmount("1234.56")).toBe(1234.56)
    })

    it("returns undefined for no amount", () => {
      expect(extractAmount("hello world")).toBeUndefined()
    })
  })

  describe("extractDate", () => {
    it("extracts today", () => {
      const today = new Date().toISOString().split("T")[0]
      expect(extractDate("spent today")).toBe(today)
    })

    it("extracts yesterday", () => {
      const yesterday = new Date()
      yesterday.setDate(yesterday.getDate() - 1)
      expect(extractDate("yesterday")).toBe(yesterday.toISOString().split("T")[0])
    })
  })
})

// ── Intent Parser Tests ─────────────────────────────────────────────────

describe("intent parser", () => {
  describe("detectIntent (English)", () => {
    it("detects add_expense intent", () => {
      const result = detectIntent("spent 500 on food", "en-IN")
      expect(result.intent).toBe("add_expense")
      expect(result.confidence).toBe("high")
    })

    it("detects add_income intent", () => {
      const result = detectIntent("received 50000 salary", "en-IN")
      expect(result.intent).toBe("add_income")
      expect(result.confidence).toBe("high")
    })

    it("detects set_budget intent", () => {
      const result = detectIntent("set budget 5000 for food", "en-IN")
      expect(result.intent).toBe("set_budget")
      expect(result.confidence).toBe("high")
    })

    it("detects query_spending intent", () => {
      const result = detectIntent("how much did I spend this month", "en-IN")
      expect(result.intent).toBe("query_spending")
      expect(result.confidence).toBe("high")
    })

    it("detects query_budget intent", () => {
      const result = detectIntent("am I over budget", "en-IN")
      expect(result.intent).toBe("query_budget")
      expect(result.confidence).toBe("high")
    })

    it("detects query_goals intent", () => {
      const result = detectIntent("how is my emergency fund", "en-IN")
      expect(result.intent).toBe("query_goals")
      expect(result.confidence).toBe("high")
    })

    it("detects query_net_worth intent", () => {
      const result = detectIntent("what is my net worth", "en-IN")
      expect(result.intent).toBe("query_net_worth")
      expect(result.confidence).toBe("high")
    })

    it("returns unknown for unrecognized input", () => {
      const result = detectIntent("xyzzy123", "en-IN")
      expect(result.intent).toBe("unknown")
    })

    it("detects navigate intent with a target path", () => {
      const result = detectIntent("open budgets", "en-IN")
      expect(result.intent).toBe("navigate")
      expect(result.entities.path).toBe("/budgets")
    })

    it("detects query_domain for a data domain (loans)", () => {
      const result = detectIntent("loans", "en-IN")
      expect(result.intent).toBe("query_domain")
      expect(result.entities.domain).toBe("loans")
    })

    it("detects query_domain for insurance", () => {
      const result = detectIntent("what insurance do I have", "en-IN")
      expect(result.intent).toBe("query_domain")
      expect(result.entities.domain).toBe("insurance")
    })

    it("detects a month period for transactions", () => {
      const result = detectIntent("what are my july transactions", "en-IN")
      expect(result.intent).toBe("query_transactions")
      expect(result.entities.month).toBe(7)
    })
  })

  describe("detectIntent (Hindi)", () => {
    it("detects add_expense in Hindi", () => {
      const result = detectIntent("500 रुपये खाने में", "hi-IN")
      expect(result.intent).toBe("add_expense")
    })

    it("detects add_income in Hindi", () => {
      const result = detectIntent("50000 तनख्वाह मिली", "hi-IN")
      expect(result.intent).toBe("add_income")
    })
  })

  describe("detectIntent (Kannada)", () => {
    it("detects add_expense in Kannada", () => {
      const result = detectIntent("ಐನೂರು ರೂಪಾಯಿ ಊಟಕ್ಕೆ", "kn-IN")
      expect(result.intent).toBe("add_expense")
    })
  })

  describe("extractEntities", () => {
    it("extracts amount", () => {
      const result = extractEntities("spent 500 on food")
      expect(result.amount).toBe(500)
    })

    it("extracts date", () => {
      const result = extractEntities("spent today")
      expect(result.date).toBeDefined()
    })
  })
})

// ── Entity Extractor Tests ──────────────────────────────────────────────

describe("entity extractor", () => {
  describe("extractCategory", () => {
    it("detects food category", () => {
      expect(extractCategory("spent on groceries")).toBe("food")
      expect(extractCategory("bought chai")).toBe("food")
    })

    it("detects transport category", () => {
      expect(extractCategory("paid for fuel")).toBe("transport")
      expect(extractCategory("uber ride")).toBe("transport")
    })

    it("detects shopping category", () => {
      expect(extractCategory("bought clothes")).toBe("shopping")
      expect(extractCategory("amazon order")).toBe("shopping")
    })

    it("returns undefined for unknown category", () => {
      expect(extractCategory("something random")).toBeUndefined()
    })
  })

  describe("extractVendor", () => {
    it("detects known vendors", () => {
      expect(extractVendor("swiggy order")).toBe("Swiggy")
      expect(extractVendor("zomato delivery")).toBe("Zomato")
      expect(extractVendor("amazon purchase")).toBe("Amazon")
    })

    it("extracts vendor after preposition", () => {
      expect(extractVendor("at Starbucks")).toBe("Starbucks")
    })
  })

  describe("extractPaymentMode", () => {
    it("detects cash", () => {
      expect(extractPaymentMode("paid cash")).toBe("cash")
    })

    it("detects UPI", () => {
      expect(extractPaymentMode("paid via gpay")).toBe("upi")
      expect(extractPaymentMode("phonepe payment")).toBe("upi")
    })

    it("detects card", () => {
      expect(extractPaymentMode("credit card payment")).toBe("card")
    })
  })
})

// ── Language Detector Tests ─────────────────────────────────────────────

describe("language detector", () => {
  it("detects English", () => {
    expect(detectLanguage("hello world")).toBe("en-IN")
  })

  it("detects Hindi (Devanagari)", () => {
    expect(detectLanguage("नमस्ते दुनिया")).toBe("hi-IN")
  })

  it("detects Kannada", () => {
    expect(detectLanguage("ನಮಸ್ಕಾರ ಜಗತ್ತು")).toBe("kn-IN")
  })

  it("detects Tamil", () => {
    expect(detectLanguage("வணக்கம் உலகம்")).toBe("ta-IN")
  })

  it("detects Telugu", () => {
    expect(detectLanguage("నమస్కారం ప్రపంచం")).toBe("te-IN")
  })

  it("detects Bengali", () => {
    expect(detectLanguage("নমস্কার পৃথিবী")).toBe("bn-IN")
  })

  it("defaults to English for empty input", () => {
    expect(detectLanguage("")).toBe("en-IN")
  })
})

// ── Page Context Tests ──────────────────────────────────────────────────

describe("page context", () => {
  it("resolves dashboard context", () => {
    const ctx = resolvePageContext("/dashboard")
    expect(ctx.name).toBe("Dashboard")
    expect(ctx.capabilities).toContain("query_spending")
    expect(ctx.capabilities).toContain("query_net_worth")
  })

  it("resolves budgets context", () => {
    const ctx = resolvePageContext("/budgets")
    expect(ctx.name).toBe("Budgets")
    expect(ctx.capabilities).toContain("query_budget")
    expect(ctx.capabilities).toContain("set_budget")
  })

  it("resolves goals context", () => {
    const ctx = resolvePageContext("/goals")
    expect(ctx.name).toBe("Goals")
    expect(ctx.capabilities).toContain("query_goals")
  })

  it("returns default for unknown route", () => {
    const ctx = resolvePageContext("/unknown")
    expect(ctx.name).toBe("MyMoney")
    expect(ctx.capabilities).toContain("query_spending")
  })

  it("returns default for null route", () => {
    const ctx = resolvePageContext(null)
    expect(ctx.name).toBe("MyMoney")
  })

  it("getCapabilitiesForRoute returns capabilities", () => {
    const caps = getCapabilitiesForRoute("/budgets")
    expect(caps).toContain("query_budget")
    expect(caps).toContain("set_budget")
  })
})

// ── Confirmation Policy Tests ───────────────────────────────────────────

describe("confirmation policy", () => {
  it("reads do not require confirmation", () => {
    expect(requiresConfirmation("query_spending")).toBe(false)
    expect(requiresConfirmation("query_budget")).toBe(false)
    expect(requiresConfirmation("query_goals")).toBe(false)
    expect(requiresConfirmation("query_net_worth")).toBe(false)
  })

  it("writes require confirmation", () => {
    expect(requiresConfirmation("add_expense")).toBe(true)
    expect(requiresConfirmation("add_income")).toBe(true)
    expect(requiresConfirmation("set_budget")).toBe(true)
  })

  it("unknown tools require confirmation", () => {
    expect(requiresConfirmation("unknown_tool")).toBe(true)
  })

  it("autoExecute skips confirmation", () => {
    expect(requiresConfirmation("add_expense", true)).toBe(false)
  })

  it("getRiskLevel returns correct levels", () => {
    expect(getRiskLevel("query_spending")).toBe("none")
    expect(getRiskLevel("add_expense")).toBe("low")
    expect(getRiskLevel("set_budget")).toBe("medium")
  })

  it("getConfirmationPolicy returns policy", () => {
    const policy = getConfirmationPolicy("add_expense")
    expect(policy.toolName).toBe("add_expense")
    expect(policy.requireConfirmation).toBe(true)
    expect(policy.reason).toBeDefined()
  })
})

// ── Response Templates Tests ────────────────────────────────────────────

describe("response templates", () => {
  it("generates add_expense response", () => {
    const response = generateResponse("add_expense", { amount: 500, category: "food" }, "en-IN")
    expect(response).toContain("500")
    expect(response).toContain("food")
  })

  it("generates add_income response", () => {
    const response = generateResponse("add_income", { amount: 50000, name: "Salary" }, "en-IN")
    expect(response).toContain("50000")
    expect(response).toContain("Salary")
  })

  it("generates query_spending response", () => {
    const response = generateResponse("query_spending", {}, "en-IN")
    expect(response).toBeDefined()
    expect(typeof response).toBe("string")
  })

  it("generates unknown response", () => {
    const response = generateResponse("unknown", {}, "en-IN")
    expect(response).toBeDefined()
  })

  it("generates Hindi response for add_expense", () => {
    const response = generateResponse("add_expense", { amount: 500, category: "food" }, "hi-IN")
    expect(response).toContain("500")
  })
})
