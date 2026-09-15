// ── GET /api/assistant/conversations ────────────────────────────────────
// List conversations for the current user.

import { NextRequest, NextResponse } from "next/server"
import { withAuth } from "@/lib/with-auth"
import { listConversations } from "@/ai/assistant/conversation"

export async function GET(req: NextRequest) {
  try {
    const auth = await withAuth()
    if (auth.error) return auth.error

    const { searchParams } = new URL(req.url)
    const limit = parseInt(searchParams.get("limit") || "20")

    const conversations = await listConversations(
      auth.userId,
      auth.profileId,
      Math.min(limit, 50)
    )

    return NextResponse.json(conversations)
  } catch (error) {
    console.error("List conversations error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
