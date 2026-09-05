import { NextResponse } from "next/server"
import { getAuthContext, handleAuthError } from "@/lib/with-auth"
import { checkInsuranceAdequacy } from "@/shared/insurance-adequacy"

export const runtime = "nodejs"

export async function GET() {
  try {
    const { profileId } = await getAuthContext()
    const result = await checkInsuranceAdequacy(profileId)
    return NextResponse.json(result)
  } catch (e) {
    return handleAuthError(e)
  }
}
