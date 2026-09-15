// ── POST /api/assistant/reject/[actionId] ──────────────────────────────
// Reject a pending action.

import { NextRequest, NextResponse } from "next/server"
import { withAuth } from "@/lib/with-auth"
import { rejectAction } from "@/ai/assistant/orchestrator"

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

    const success = await rejectAction(actionId, auth.userId)

    if (!success) {
      return NextResponse.json(
        { error: "Action not found or already processed" },
        { status: 404 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Reject action error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
