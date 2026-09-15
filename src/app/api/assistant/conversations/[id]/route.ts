// ── GET /api/assistant/conversations/[id] ───────────────────────────────
// Get a conversation with its messages.

import { NextRequest, NextResponse } from "next/server"
import { withAuth } from "@/lib/with-auth"
import { getConversation, getMessages } from "@/ai/assistant/conversation"

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await withAuth()
    if (auth.error) return auth.error

    const { id: idParam } = await params
    const conversationId = parseInt(idParam)
    if (isNaN(conversationId)) {
      return NextResponse.json(
        { error: "Invalid conversation ID" },
        { status: 400 }
      )
    }

    const conversation = await getConversation(conversationId, auth.userId)
    if (!conversation) {
      return NextResponse.json(
        { error: "Conversation not found" },
        { status: 404 }
      )
    }

    const messages = await getMessages(conversationId, 50)

    return NextResponse.json({
      ...conversation,
      messages,
    })
  } catch (error) {
    console.error("Get conversation error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

// ── DELETE /api/assistant/conversations/[id] ────────────────────────────
// Delete a conversation (soft delete).

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await withAuth()
    if (auth.error) return auth.error

    const { id: idParam } = await params
    const conversationId = parseInt(idParam)
    if (isNaN(conversationId)) {
      return NextResponse.json(
        { error: "Invalid conversation ID" },
        { status: 400 }
      )
    }

    const { deleteConversation } = await import("@/ai/assistant/conversation")
    const deleted = await deleteConversation(conversationId, auth.userId)

    if (!deleted) {
      return NextResponse.json(
        { error: "Conversation not found" },
        { status: 404 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Delete conversation error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
