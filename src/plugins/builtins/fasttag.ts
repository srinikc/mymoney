// FastTag Plugin — auto-categorizes FastTag transactions
// Runs during import pipeline to detect and tag FASTag entries

const FASTAG_PATTERNS = [
  /fastag/i,
  /fast.?tag/i,
  /fas.?tag/i,
  /nha[iy]/i,
  /national highway/i,
  /toll plaza/i,
  /toll\s*gate/i,
  /toll\s*naka/i,
  /highway\s*toll/i,
  /electronic\s*toll/i,
  /etc\s*toll/i,
  /icici\s*gateway\s*toll/i,
]

export function isFastTag(vendor: string, description: string): boolean {
  const text = `${vendor} ${description}`.toLowerCase()
  return FASTAG_PATTERNS.some((p) => p.test(text))
}

export function getFastTagCategoryId(categories: Array<{ id: number; name: string }>): number {
  const vehicleExpense = categories.find(
    (c) => c.name.toLowerCase().replaceAll(/[\s-]/g, "") === "vehicleexpense"
  )
  return vehicleExpense?.id || 0
}
