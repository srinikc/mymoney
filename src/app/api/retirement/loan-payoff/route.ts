import { NextResponse } from "next/server"
import { getAuthContext, handleAuthError } from "@/lib/with-auth"
import { calculateLoanPayoff, recommendStrategy } from "@/shared/loan-payoff"

export const runtime = "nodejs"

export async function GET(request: Request) {
  try {
    const { profileId } = await getAuthContext()
    const { searchParams } = new URL(request.url)
    const strategyParam = searchParams.get("strategy") as "avalanche" | "snowball" | null
    const strategy = strategyParam || recommendStrategy()
    const result = await calculateLoanPayoff(profileId, strategy)
    return NextResponse.json(result)
  } catch (e) {
    return handleAuthError(e)
  }
}
