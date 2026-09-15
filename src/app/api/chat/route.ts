// ── Chat API Compatibility Adapter ──────────────────────────────────────
// Routes existing /api/chat requests through the new assistant orchestrator.
// Maintains backward compatibility with the old floating-chat component.

import { NextRequest, NextResponse } from "next/server"
import { getAuthContext } from "@/lib/with-auth"
import { processInput } from "@/ai/assistant/orchestrator"

export const runtime = "nodejs"

export async function POST(req: NextRequest) {
  try {
    const { userId, profileId } = await getAuthContext()
    const { message, conversationId } = await req.json()

    if (!message || typeof message !== "string") {
      return NextResponse.json({ error: "Message is required" }, { status: 400 })
    }

    // Route through the unified orchestrator
    const result = await processInput({
      text: message.trim(),
      userId,
      profileId,
      modality: "text",
    })

    // Map to old response format for backward compatibility
    return NextResponse.json({
      response: result.response,
      conversationId: result.conversationId?.toString() || conversationId || crypto.randomUUID(),
      source: result.source === "deterministic" ? "local" : result.source,
      stats: result.metadata,
    })
  } catch (error) {
    console.error("Chat API error:", error)
    return NextResponse.json(
      { error: "Failed to process your message. Please try again." },
      { status: 500 },
    )
  }
}
