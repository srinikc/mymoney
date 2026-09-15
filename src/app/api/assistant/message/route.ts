// ── POST /api/assistant/message ─────────────────────────────────────────
// Unified endpoint for text and voice input.
// Routes through the orchestrator for intent parsing, tool execution, etc.

import { NextRequest, NextResponse } from "next/server"
import { withAuth } from "@/lib/with-auth"
import { processInput } from "@/ai/assistant/orchestrator"
import type { OrchestratorInput } from "@/shared/assistant"

export async function POST(req: NextRequest) {
  try {
    // Auth check
    const auth = await withAuth()
    if (auth.error) return auth.error

    const body = await req.json()
    const { text, modality, language, conversationId, pageRoute } = body

    // Validate input
    if (!text || typeof text !== "string") {
      return NextResponse.json(
        { error: "Text is required" },
        { status: 400 }
      )
    }

    if (text.length > 1000) {
      return NextResponse.json(
        { error: "Text too long (max 1000 characters)" },
        { status: 400 }
      )
    }

    if (modality && !["text", "voice", "mixed"].includes(modality)) {
      return NextResponse.json(
        { error: "Invalid modality. Must be text, voice, or mixed" },
        { status: 400 }
      )
    }

    // Process through orchestrator
    const input: OrchestratorInput = {
      text: text.trim(),
      modality: modality || "text",
      language,
      conversationId,
      pageRoute,
      userId: auth.userId,
      profileId: auth.profileId,
    }

    const result = await processInput(input)

    return NextResponse.json(result)
  } catch (error) {
    console.error("Assistant message error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
