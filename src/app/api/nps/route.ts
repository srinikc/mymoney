import { NextResponse } from "next/server"
import { getAuthContext, handleAuthError } from "@/lib/with-auth"
import { NPS_FUND_MANAGERS, NPS_TAX_BENEFITS } from "@/shared/nps"

export async function GET() {
  try {
    await getAuthContext()
    return NextResponse.json({
      fundManagers: NPS_FUND_MANAGERS,
      taxBenefits: NPS_TAX_BENEFITS,
      source: "static",
    })
  } catch (e) {
    return handleAuthError(e)
  }
}
