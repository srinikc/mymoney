// ── BPE Tokenizer for Wake Word Phrases ─────────────────────────────────
// Converts plain text wake word phrases into the exact BPE token sequences
// the Sherpa-ONNX KWS engine expects.
//
// Uses the model's SentencePiece bpe.model (via sentencepiece-js) so the
// tokenization matches the training data exactly. Greedy longest-match against
// tokens.txt does NOT reproduce the trained BPE merges (e.g. "LIGHT UP" splits
// as "▁ L IGHT ▁UP", not "▁LI G H T ▁UP"), which made wake words undetectable.
//
// The model is trained on UPPERCASE text — phrases are uppercased before
// encoding to match how the shipped keywords.txt was generated.

import { SentencePieceProcessor } from "sentencepiece-js"
import { join } from "node:path"

let cachedProcessor: Promise<SentencePieceProcessor> | null = null

/**
 * Load the model's SentencePiece processor (bpe.model). Cached across calls.
 * Server-side only.
 */
export async function loadSentencePiece(modelDir: string): Promise<SentencePieceProcessor> {
  if (!cachedProcessor) {
    cachedProcessor = (async () => {
      const bpePath = join(modelDir, "bpe.model")
      const sp = new SentencePieceProcessor()
      await sp.load(bpePath)
      return sp
    })()
  }
  return cachedProcessor
}

/**
 * Tokenize a plain text phrase into BPE pieces using the model's SentencePiece
 * processor. The phrase is uppercased to match the training data.
 */
export async function tokenizePhrase(phrase: string, sp: SentencePieceProcessor): Promise<string[]> {
  const upper = phrase.toUpperCase()
  return sp.encodePieces(upper)
}

/**
 * Convert a plain text phrase to BPE token string format for the keywords file.
 * Format: tokens separated by spaces, e.g. "▁HE Y ▁MY M ONE Y"
 */
export async function phraseToBpeTokens(phrase: string, sp: SentencePieceProcessor): Promise<string> {
  const pieces = await tokenizePhrase(phrase, sp)
  return pieces.join(" ")
}

/**
 * Validate that all BPE tokens exist in the vocabulary.
 * Returns validation result with invalid tokens if any.
 */
export function validateTokens(bpeTokens: string[], vocab: Map<string, number>): {
  valid: boolean
  invalidTokens: string[]
  message: string
} {
  const invalidTokens = bpeTokens.filter((t) => !vocab.has(t))
  return {
    valid: invalidTokens.length === 0,
    invalidTokens,
    message: invalidTokens.length === 0
      ? "All tokens are valid"
      : `Invalid tokens: ${invalidTokens.join(", ")}`,
  }
}

/**
 * Parse tokens.txt into a vocabulary map (token → id).
 * Format: each line is "<token> <id>"
 */
function parseTokensFile(content: string): Map<string, number> {
  const vocab = new Map<string, number>()
  for (const line of content.split("\n")) {
    const trimmed = line.trim()
    if (!trimmed) continue
    const lastSpace = trimmed.lastIndexOf(" ")
    if (lastSpace === -1) continue
    const token = trimmed.slice(0, lastSpace)
    const id = Number.parseInt(trimmed.slice(lastSpace + 1), 10)
    if (!Number.isNaN(id)) {
      vocab.set(token, id)
    }
  }
  return vocab
}

/**
 * Load the vocabulary from the model's tokens.txt file.
 * Server-side only (uses fs).
 */
export async function loadVocabulary(modelDir: string): Promise<Map<string, number>> {
  const { readFile } = await import("node:fs/promises")
  const tokensPath = join(modelDir, "tokens.txt")
  const content = await readFile(tokensPath, "utf-8")
  return parseTokensFile(content)
}

/**
 * Generate a keywords file content from a wake word phrase.
 * Returns the BPE token string ready to be written to a keywords file.
 */
export async function generateKeywordsContent(phrase: string, sp: SentencePieceProcessor): Promise<string> {
  const bpeTokens = await phraseToBpeTokens(phrase, sp)
  if (!bpeTokens) return ""
  // Each line is a keyword in BPE token format.
  // The KWS engine expects: "TOKEN1 TOKEN2 TOKEN3 @label"
  // The label must NOT contain spaces — the native parser splits on spaces and
  // would try to look up each label word as a token. Use the phrase with spaces
  // replaced so the label stays a single token.
  const label = phrase.trim().replaceAll(/\s+/g, "_")
  return `${bpeTokens} @${label}`
}