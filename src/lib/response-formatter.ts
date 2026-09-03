/**
 * Formats the LLM response for display in the chat UI.
 * - Cleans excessive markdown
 * - Formats Indian numbers with proper units
 * - Adds emphasis to key numbers
 */

export function formatResponse(text: string): string {
  if (!text) return ""

  let formatted = text

  // Normalize line breaks
  formatted = formatted.replaceAll("\r\n", "\n")

  // Remove excessive blank lines (more than 2 consecutive)
  formatted = formatted.replaceAll(/\n{3,}/g, "\n\n")

  // Ensure markdown bold for ₹ amounts (must have ₹ prefix).
  // Only wrap the ₹ number — NOT bare numbers — to avoid breaking natural text.
  formatted = formatted.replaceAll(
    /₹(\d{1,3}(?:,\d{2})*(?:\.\d+)?)/g,
    "**₹$1**",
  )

  // Bold percentages
  formatted = formatted.replaceAll(
    /(\d+(?:\.\d+)?)%/g,
    "**$1%**",
  )

  // Convert bullet points to clean markdown
  // Convert asterisk bullet points to clean markdown
  formatted = formatted.replaceAll(/^\*\s+/gm, "• ")
  // Convert dash bullet points to clean markdown
  formatted = formatted.replaceAll(/^-\s+/gm, "• ")

  // Ensure numbered lists are clean
  formatted = formatted.replaceAll(/^(\d+)\.\s+/gm, "$1. ")

  // Clean up any double bold
  formatted = formatted.replaceAll(/\*\*\s*\*\*/g, "")

  // Ensure proper spacing after punctuation
  formatted = formatted.replaceAll(/\.([A-Z])/g, ". $1")

  return formatted.trim()
}

/**
 * Extracts plain text from markdown for speech/summary use.
 */
export function stripMarkdown(text: string): string {
  return text
    .replaceAll(/\*\*(.*?)\*\*/g, "$1")
    .replaceAll(/__(.*?)__/g, "$1")
    .replaceAll(/`(.*?)`/g, "$1")
    .replaceAll(/^#{1,6}\s+/gm, "")
    .replaceAll(/\[([^\]]+)]\([^)]+\)/g, "$1")
    .replaceAll(/[*~]/g, "")
    .replaceAll(/>\s+/g, "")
    .replaceAll(/\n{2,}/g, "\n")
    .trim()
}
