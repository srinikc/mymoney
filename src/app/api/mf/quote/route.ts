import { NextResponse } from "next/server"
import { getAuthContext, handleAuthError } from "@/lib/with-auth"
import { SEED_FUNDS } from "@/shared/mf-seed"

export async function GET(req: Request) {
  try {
    await getAuthContext()
    const { searchParams } = new URL(req.url)
    const code = searchParams.get("code")
    if (!code) {
      return NextResponse.json({ error: "code required" }, { status: 400 })
    }
    const fund = SEED_FUNDS.find((f) => f.code === code)
    if (!fund) {
      return NextResponse.json({ error: "Fund not found" }, { status: 404 })
    }
    return NextResponse.json(fund)
  } catch (e) {
    return handleAuthError(e)
  }
}
