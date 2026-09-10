/**
 * Shared FD helpers.
 */

/**
 * Compute FD maturity amount with standard Indian bank quarterly compounding.
 * A = P × (1 + r/4)^(4t)   where r = annual rate as decimal, t = years
 */
export function calcFdMaturity(principal: number, annualRatePct: number, startDate?: string | Date | null, maturityDate?: string | Date | null): number | null {
  const P = Number(principal) || 0
  const r = Number(annualRatePct) || 0
  if (P <= 0 || r <= 0) return null
  if (!startDate || !maturityDate) return null
  const start = new Date(startDate).getTime()
  const end = new Date(maturityDate).getTime()
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return null
  const t = (end - start) / (365.25 * 24 * 60 * 60 * 1000)
  if (t <= 0) return null
  const maturity = P * Math.pow(1 + r / 400, 4 * t)
  return Math.round(maturity)
}