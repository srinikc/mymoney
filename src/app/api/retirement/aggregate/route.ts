import { NextResponse } from "next/server"
import { getAuthContext, handleAuthError } from "@/lib/with-auth"
import { aggregateRetirementCorpus } from "@/shared/retirement-aggregator"

export const runtime = "nodejs"

export async function GET() {
  try {
    const { profileId } = await getAuthContext()
    const result = await aggregateRetirementCorpus(profileId)
    return NextResponse.json(result)
  } catch (e) {
    return handleAuthError(e)
  }
}
