/**
 * Title-case a display string: capitalize the first letter of each word,
 * lowercase the rest (e.g. "MOHANAN M O" -> "Mohanan M O",
 * "Vinutha K - April Home Expenses" -> "Vinutha K - April Home Expenses").
 * Used for display values (vendor names, persons, sub-categories) at import
 * boundaries so they read cleanly. Matching keys stay lowercase; searches are
 * case-insensitive, so casing here is purely cosmetic.
 */
export function titleCase(text: string): string {
  return String(text)
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ")
}
