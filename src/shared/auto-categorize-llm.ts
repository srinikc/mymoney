/**
 * LLM-based batch categorization for unmatched vendors.
 *
 * Uses MiMo v2.5 (free via OpenCode) to analyze Indian vendor names
 * and determine their expense category + subCategory.
 *
 * The LLM understands Indian context:
 * - "Provision Store" → food/groceries
 * - "Medicals" → medical/pharmacy
 * - "Mess" → food/mess
 * - "Directorate of Electronics" → government/electronics (unmatched)
 */

import { queryLLM } from "@/lib/llm"

// ── Types ──────────────────────────────────────────────────────────────

export interface LLMBatchResult {
  vendor: string
  category: string
  subCategory: string
  reason: string
}

export interface LLMBatchProgress {
  total: number
  processed: number
  successful: number
  failed: number
  currentBatch: number
  totalBatches: number
}

export interface LLMBatchOutput {
  results: LLMBatchResult[]
  errors: string[]
}

// ── Constants ──────────────────────────────────────────────────────────

const BATCH_SIZE = 50
const MAX_RETRIES = 3
const INITIAL_RETRY_DELAY_MS = 5000

const CATEGORIES_LIST = [
  "food", "medical", "travel", "petrol-diesel", "purchase", "clothes",
  "jewelery", "electricity-bill", "mobile-telephone", "entertainment",
  "education", "house-monthly", "house-repair", "vehicle-expense", "haircut",
  "pooja", "flower", "donation", "gift", "investment", "loan", "creditcard",
  "income tax", "newspaper", "alcohol", "stationary", "toileteries",
  "festival", "photos", "wfh", "trip-vacation", "water-bill", "gas",
  "shoes", "vehicle-insurance",
]

// ── Prompt Builder ─────────────────────────────────────────────────────

function buildBatchPrompt(vendorNames: string[]): string {
  const vendorList = vendorNames
    .map((name, i) => `${i + 1}. ${name}`)
    .join("\n")

  return `You are an Indian financial categorization expert. Your job is to analyze Indian merchant/vendor names and categorize them into expense categories.

Available categories: ${CATEGORIES_LIST.join(", ")}

For each vendor name below, determine:
1. The expense category (must be one from the list above)
2. A subCategory (more specific, e.g., "Groceries", "Medicines", "Restaurant", "Mess", "Tiffin", etc.)
3. A brief reason explaining why

IMPORTANT RULES:
- "Provision Store" / "Provisions" / "General Store" → food, Groceries
- "Medicals" / "Medical Store" / "Pharmacy" → medical, Medicines
- "Mess" / "Bhojan" / "Meals" → food, Mess
- "Health Care" → medical, Health
- "Electronics Store" → purchase, Electronics (NOT mobile-telephone)
- "Directorate" / "Government Office" → leave as "unmatched" with reason "government entity"
- If uncertain, use the most likely Indian context category

Return ONLY a valid JSON array. No markdown, no explanation outside JSON.

Format:
[
  {"vendor": "exact vendor name", "category": "category_name", "subCategory": "SubCategory", "reason": "brief reason"},
  ...
]

Vendors to categorize:
${vendorList}`
}

// ── Response Parser ────────────────────────────────────────────────────

function parseLLMResponse(response: string): LLMBatchResult[] {
  // Try to extract JSON from the response
  let jsonStr = response.trim()

  // Remove markdown code blocks if present
  jsonStr = jsonStr.replace(/```json\s*/g, "").replace(/```\s*/g, "")

  // Find the JSON array
  const arrayStart = jsonStr.indexOf("[")
  const arrayEnd = jsonStr.lastIndexOf("]")
  if (arrayStart === -1 || arrayEnd === -1) {
    const snippet = response.slice(0, 200).replace(/\n/g, " ")
    throw new Error(`No JSON array found in LLM response (first 200 chars: "${snippet}")`)
  }

  jsonStr = jsonStr.slice(arrayStart, arrayEnd + 1)

  try {
    const parsed = JSON.parse(jsonStr)
    if (!Array.isArray(parsed)) {
      throw new Error("Response is not an array")
    }

    return parsed.map((item: Record<string, unknown>) => ({
      vendor: String(item.vendor || ""),
      category: String(item.category || "unmatched"),
      subCategory: String(item.subCategory || ""),
      reason: String(item.reason || ""),
    })).filter((item) => item.vendor && item.category !== "unmatched")
  } catch (e) {
    console.error("[auto-categorize-llm] JSON parse error:", e)
    throw new Error(`Failed to parse LLM response: ${String(e)}`)
  }
}

// ── Main Function ──────────────────────────────────────────────────────

/**
 * Categorize a batch of unmatched vendor names using LLM.
 * Processes in batches of BATCH_SIZE.
 *
 * @param vendorNames - Array of unmatched vendor names
 * @param userId - User ID for LLM provider config
 * @param onProgress - Optional callback for progress updates
 * @returns Array of categorization results
 */
export async function categorizeBatchWithLLM(
  vendorNames: string[],
  userId?: number,
  onProgress?: (progress: LLMBatchProgress) => void,
): Promise<LLMBatchOutput> {
  const total = vendorNames.length
  const totalBatches = Math.ceil(total / BATCH_SIZE)
  const allResults: LLMBatchResult[] = []
  const allErrors: string[] = []
  let successful = 0
  let failed = 0

  for (let i = 0; i < total; i += BATCH_SIZE) {
    const batch = vendorNames.slice(i, i + BATCH_SIZE)
    const currentBatch = Math.floor(i / BATCH_SIZE) + 1

    onProgress?.({
      total,
      processed: i,
      successful,
      failed,
      currentBatch,
      totalBatches,
    })

    let lastError: string | null = null
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        const prompt = buildBatchPrompt(batch)
        const response = await queryLLM(prompt, userId)

        if (!response || response.trim().length === 0) {
          lastError = "LLM returned empty response"
          if (attempt < MAX_RETRIES) {
            const delay = INITIAL_RETRY_DELAY_MS * Math.pow(2, attempt)
            console.log(`[auto-categorize-llm] Retrying batch ${currentBatch} in ${delay}ms (empty response)`)
            await new Promise((resolve) => setTimeout(resolve, delay))
            continue
          }
          break
        }

        const results = parseLLMResponse(response)

        allResults.push(...results)
        successful += results.length
        failed += batch.length - results.length
        lastError = null

        console.log(`[auto-categorize-llm] Batch ${currentBatch}/${totalBatches}: ${results.length}/${batch.length} categorized`)
        break // success, exit retry loop
      } catch (error) {
        const errMsg = error instanceof Error ? error.message : String(error)
        const isRateLimit = errMsg.includes("429") || errMsg.toLowerCase().includes("rate") || errMsg.toLowerCase().includes("too many")
        lastError = `Batch ${currentBatch}/${totalBatches}: ${errMsg}`

        if (isRateLimit && attempt < MAX_RETRIES) {
          const delay = INITIAL_RETRY_DELAY_MS * Math.pow(2, attempt)
          console.log(`[auto-categorize-llm] Rate limited on batch ${currentBatch}, retrying in ${delay}ms (attempt ${attempt + 1}/${MAX_RETRIES})`)
          await new Promise((resolve) => setTimeout(resolve, delay))
          continue
        }

        console.error(`[auto-categorize-llm] ${lastError}`)
        break
      }
    }

    if (lastError) {
      allErrors.push(lastError)
      failed += batch.length
    }

    // Delay between batches — free models have stricter rate limits
    if (i + BATCH_SIZE < total) {
      await new Promise((resolve) => setTimeout(resolve, 2000))
    }
  }

  onProgress?.({
    total,
    processed: total,
    successful,
    failed,
    currentBatch: totalBatches,
    totalBatches,
  })

  return { results: allResults, errors: allErrors }
}

/**
 * Categorize a single vendor name using LLM.
 * Useful for quick on-demand categorization.
 */
export async function categorizeSingleWithLLM(
  vendorName: string,
  userId?: number,
): Promise<LLMBatchResult | null> {
  const output = await categorizeBatchWithLLM([vendorName], userId)
  return output.results.length > 0 ? output.results[0] : null
}
