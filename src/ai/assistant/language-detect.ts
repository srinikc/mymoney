// ── Language Detector ───────────────────────────────────────────────────
// Auto-detects the language of input text.
// Used when user doesn't specify a language.

/**
 * Detect the language of a text string.
 * Returns BCP-47 language code (e.g., "en-IN", "hi-IN").
 *
 * Detection is based on Unicode script ranges:
 * - Devanagari (Hindi, Marathi, Nepali)
 * - Kannada
 * - Tamil
 * - Telugu
 * - Bengali
 * - Gujarati
 * - Gurmukhi (Punjabi)
 * - Odia
 * - Malayalam
 * - Arabic (Urdu)
 * - Latin (English)
 */

interface ScriptDetection {
  script: string
  language: string
  confidence: number
}

const SCRIPT_RANGES: Array<{ start: number; end: number; script: string; language: string }> = [
  // Devanagari (Hindi, Marathi, Nepali)
  { start: 0x0900, end: 0x097F, script: "Devanagari", language: "hi-IN" },
  // Bengali
  { start: 0x0980, end: 0x09FF, script: "Bengali", language: "bn-IN" },
  // Gurmukhi (Punjabi)
  { start: 0x0A00, end: 0x0A7F, script: "Gurmukhi", language: "pa-IN" },
  // Gujarati
  { start: 0x0A80, end: 0x0AFF, script: "Gujarati", language: "gu-IN" },
  // Odia
  { start: 0x0B00, end: 0x0B7F, script: "Odia", language: "or-IN" },
  // Tamil
  { start: 0x0B80, end: 0x0BFF, script: "Tamil", language: "ta-IN" },
  // Telugu
  { start: 0x0C00, end: 0x0C7F, script: "Telugu", language: "te-IN" },
  // Kannada
  { start: 0x0C80, end: 0x0CFF, script: "Kannada", language: "kn-IN" },
  // Malayalam
  { start: 0x0D00, end: 0x0D7F, script: "Malayalam", language: "ml-IN" },
  // Arabic (Urdu)
  { start: 0x0600, end: 0x06FF, script: "Arabic", language: "ur-IN" },
]

/**
 * Detect the language of a text string.
 */
export function detectLanguage(text: string): string {
  if (!text || text.trim().length === 0) {
    return "en-IN" // Default to English
  }

  const scriptCounts: Record<string, number> = {}
  let totalChars = 0

  // Count characters by script
  for (const char of text) {
    const code = char.codePointAt(0)
    if (!code) continue

    // Skip whitespace, punctuation, numbers
    if (code < 0x0020 || (code >= 0x0021 && code <= 0x002F) ||
        (code >= 0x0030 && code <= 0x0039) ||
        (code >= 0x003A && code <= 0x0040) ||
        (code >= 0x005B && code <= 0x0060) ||
        (code >= 0x007B && code <= 0x007E)) {
      continue
    }

    totalChars++

    for (const range of SCRIPT_RANGES) {
      if (code >= range.start && code <= range.end) {
        scriptCounts[range.script] = (scriptCounts[range.script] || 0) + 1
        break
      }
    }
  }

  if (totalChars === 0) {
    return "en-IN"
  }

  // Find the dominant script
  let maxCount = 0
  let dominantScript = "Latin"

  for (const [script, count] of Object.entries(scriptCounts)) {
    if (count > maxCount) {
      maxCount = count
      dominantScript = script
    }
  }

  // If no non-Latin script found, default to English
  if (maxCount === 0) {
    return "en-IN"
  }

  // Check if dominant script is Latin (English)
  if (dominantScript === "Latin") {
    return "en-IN"
  }

  // Find the language for the dominant script
  const scriptInfo = SCRIPT_RANGES.find((r) => r.script === dominantScript)
  if (scriptInfo) {
    return scriptInfo.language
  }

  return "en-IN"
}

/**
 * Get a list of supported languages with their scripts.
 */
export function getSupportedLanguages(): Array<{
  code: string
  name: string
  script: string
}> {
  return [
    { code: "en-IN", name: "English", script: "Latin" },
    { code: "hi-IN", name: "Hindi", script: "Devanagari" },
    { code: "kn-IN", name: "Kannada", script: "Kannada" },
    { code: "ta-IN", name: "Tamil", script: "Tamil" },
    { code: "te-IN", name: "Telugu", script: "Telugu" },
    { code: "bn-IN", name: "Bengali", script: "Bengali" },
    { code: "mr-IN", name: "Marathi", script: "Devanagari" },
    { code: "ur-IN", name: "Urdu", script: "Arabic" },
    { code: "ml-IN", name: "Malayalam", script: "Malayalam" },
    { code: "gu-IN", name: "Gujarati", script: "Gujarati" },
    { code: "pa-IN", name: "Punjabi", script: "Gurmukhi" },
    { code: "or-IN", name: "Odia", script: "Odia" },
  ]
}
