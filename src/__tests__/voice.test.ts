import { describe, it, expect } from "vitest"
import {
  buildVoicePrompt,
  extractJsonObject,
  parseVoiceResponse,
  detectVoiceIntentRegex,
} from "@/lib/voice"
import { SUPPORTED_LANGUAGES, isSupportedLanguage } from "@/shared/voice"

describe("extractJsonObject", () => {
  it("parses a plain JSON object", () => {
    expect(extractJsonObject('{"intent":"query"}')).toEqual({ intent: "query" })
  })

  it("parses JSON wrapped in a markdown fence", () => {
    expect(extractJsonObject('```json\n{"intent":"add_expense"}\n```')).toEqual({ intent: "add_expense" })
  })

  it("parses JSON with surrounding prose", () => {
    expect(extractJsonObject('Sure! {"intent":"query","answer":"hi"} done')).toEqual({ intent: "query", answer: "hi" })
  })

  it("handles braces inside a string value", () => {
    expect(extractJsonObject('{"answer":"use {braces} carefully"}')).toEqual({ answer: "use {braces} carefully" })
  })

  it("returns null for malformed JSON", () => {
    expect(extractJsonObject("no json here")).toBeNull()
    expect(extractJsonObject("{ not valid }")).toBeNull()
  })
})

describe("parseVoiceResponse", () => {
  it("parses an add_expense result with entity", () => {
    const r = parseVoiceResponse(
      '{"intent":"add_expense","confidence":"high","entity":{"type":"expense","amount":250,"vendor":"Big Bazaar","category":"Groceries","date":"2026-09-11","paymentMode":"UPI"}}',
      "en-IN",
    )
    expect(r).not.toBeNull()
    expect(r!.intent).toBe("add_expense")
    expect(r!.confidence).toBe("high")
    expect(r!.entity).toMatchObject({ amount: 250, vendor: "Big Bazaar", category: "Groceries", paymentMode: "UPI" })
    expect(r!.source).toBe("llm")
  })

  it("parses a query result with answer", () => {
    const r = parseVoiceResponse('{"intent":"query","confidence":"medium","answer":"You spent ₹2,500."}', "hi-IN")
    expect(r!.intent).toBe("query")
    expect(r!.answer).toBe("You spent ₹2,500.")
    expect(r!.language).toBe("hi-IN")
  })

  it("coerces a string amount and strips currency symbols", () => {
    const r = parseVoiceResponse('{"intent":"add_expense","entity":{"amount":"₹1,250.50"}}', "en-IN")
    expect(r!.entity!.amount).toBe(1250.5)
  })

  it("falls back to unknown when an add intent has no entity", () => {
    const r = parseVoiceResponse('{"intent":"add_expense","confidence":"high"}', "en-IN")
    expect(r!.intent).toBe("unknown")
  })

  it("normalizes an unrecognized intent to unknown", () => {
    const r = parseVoiceResponse('{"intent":"do_something_weird"}', "en-IN")
    expect(r!.intent).toBe("unknown")
  })

  it("returns null when there is no JSON", () => {
    expect(parseVoiceResponse("I could not understand", "en-IN")).toBeNull()
  })
})

describe("detectVoiceIntentRegex", () => {
  it("detects an expense with amount and vendor", () => {
    const r = detectVoiceIntentRegex("spent 250 on groceries at Big Bazaar today", "en-IN")
    expect(r.intent).toBe("add_expense")
    expect(r.entity!.amount).toBe(250)
    expect(r.entity!.vendor).toBe("Big Bazaar")
    expect(r.source).toBe("regex")
  })

  it("detects income", () => {
    const r = detectVoiceIntentRegex("received 50000 salary", "en-IN")
    expect(r.intent).toBe("add_income")
    expect(r.entity!.amount).toBe(50000)
    expect(r.entity!.incomeType).toBe("onetime")
  })

  it("detects a budget with category", () => {
    const r = detectVoiceIntentRegex("set budget 5000 for groceries", "en-IN")
    expect(r.intent).toBe("set_budget")
    expect(r.entity!.amount).toBe(5000)
    expect(r.entity!.category).toBe("groceries")
  })

  it("scales k / lakh", () => {
    expect(detectVoiceIntentRegex("paid 2.5k for shoes", "en-IN").entity!.amount).toBe(2500)
    expect(detectVoiceIntentRegex("received 1 lakh bonus", "en-IN").entity!.amount).toBe(100000)
  })

  it("detects a question as query", () => {
    const r = detectVoiceIntentRegex("how much did I spend on food last month", "en-IN")
    expect(r.intent).toBe("query")
    expect(r.answer).toBeTruthy()
  })

  it("returns unknown for gibberish", () => {
    expect(detectVoiceIntentRegex("blah blah", "en-IN").intent).toBe("unknown")
  })
})

describe("buildVoicePrompt", () => {
  it("includes the language and the page hint", () => {
    const p = buildVoicePrompt("spent 100 on tea", "kn-IN", "/expenses")
    expect(p).toContain("kn-IN")
    expect(p).toContain("/expenses")
    expect(p).toContain("spent 100 on tea")
  })
})

describe("SUPPORTED_LANGUAGES", () => {
  it("includes the major Indian languages", () => {
    const codes = SUPPORTED_LANGUAGES.map((l) => l.code)
    expect(codes).toEqual(expect.arrayContaining(["en-IN", "hi-IN", "kn-IN", "ta-IN", "te-IN", "bn-IN", "mr-IN", "ur-IN"]))
  })

  it("validates language codes", () => {
    expect(isSupportedLanguage("hi-IN")).toBe(true)
    expect(isSupportedLanguage("xx-YY")).toBe(false)
  })
})