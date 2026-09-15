// ── POST /api/assistant/confirm/[actionId] ─────────────────────────────
// Confirm a pending action.

import { NextRequest, NextResponse } from "next/server"
import { withAuth } from "@/lib/with-auth"
import { confirmAction } from "@/ai/assistant/orchestrator"

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ actionId: string }> }
) {
  try {
    const auth = await withAuth()
    if (auth.error) return auth.error

    const { actionId: actionIdParam } = await params
    const actionId = parseInt(actionIdParam)
    if (isNaN(actionId)) {
      return NextResponse.json(
        { error: "Invalid action ID" },
        { status: 400 }
      )
    }

    const result = await confirmAction(actionId, auth.userId, auth.profileId)

    return NextResponse.json(result)
  } catch (error) {
    console.error("Confirm action error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
