import { NextResponse } from "next/server"
import { getAuthContext, handleAuthError } from "@/lib/with-auth"
import { discoverSubGoals, linkSubGoal, unlinkSubGoal } from "@/shared/retirement-discovery"

export const runtime = "nodejs"

export async function GET() {
  try {
    const { profileId } = await getAuthContext()
    const result = await discoverSubGoals(profileId)
    return NextResponse.json(result)
  } catch (e) {
    return handleAuthError(e)
  }
}

export async function POST(req: Request) {
  try {
    const { profileId } = await getAuthContext()
    const body = await req.json()

    if (body.action === "link") {
      if (!body.retirementGoalId || !body.childGoalId) {
        return NextResponse.json({ error: "retirementGoalId and childGoalId required" }, { status: 400 })
      }
      await linkSubGoal(body.retirementGoalId, body.childGoalId)
      return NextResponse.json({ ok: true })
    }

    if (body.action === "unlink") {
      if (!body.childGoalId) {
        return NextResponse.json({ error: "childGoalId required" }, { status: 400 })
      }
      await unlinkSubGoal(body.childGoalId)
      return NextResponse.json({ ok: true })
    }

    return NextResponse.json({ error: "Invalid action. Use 'link' or 'unlink'." }, { status: 400 })
  } catch (e) {
    return handleAuthError(e)
  }
}
