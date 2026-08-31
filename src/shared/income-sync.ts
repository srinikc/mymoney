import { prisma } from "@/lib/prisma"

export function sourceToYearlyAmount(s: { type: string; amount: number | null | undefined }): number {
  const amt = Number(s.amount) || 0
  switch (s.type) {
    case "yearly":
      return amt
    case "monthly":
      return amt * 12
    case "variable":
      return amt
    case "onetime":
      return amt
    default:
      return amt * 12
  }
}

export async function syncProfileAnnualIncome(profileId: number): Promise<number> {
  const sources = await prisma.incomeSource.findMany({
    where: { profileId, endDate: null },
    select: { type: true, amount: true, endDate: true },
  })
  const total = sources.reduce((sum, s) => {
    if (s.endDate) return sum
    return sum + sourceToYearlyAmount(s)
  }, 0)
  const rounded = Math.round(total * 100) / 100
  await prisma.profile.update({
    where: { id: profileId },
    data: { annualIncome: rounded > 0 ? rounded : null },
  })
  return rounded
}
