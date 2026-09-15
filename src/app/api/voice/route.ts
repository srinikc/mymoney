// ── Voice API Compatibility Adapter ─────────────────────────────────────
// Routes existing /api/voice requests through the new assistant orchestrator.
// Maintains backward compatibility with the old floating-voice component.

import { NextRequest, NextResponse } from "next/server"
import { withAuth } from "@/lib/with-auth"
import { prisma } from "@/lib/prisma"
import { processInput } from "@/ai/assistant/orchestrator"

export const runtime = "nodejs"

const MAX_TEXT_LENGTH = 500

export async function POST(req: NextRequest) {
  try {
    const auth = await withAuth()
    if (auth.error) return auth.error

    if (!(await isVoiceEnabled())) {
      return NextResponse.json({ error: "Voice input is not enabled for your plan" }, { status: 403 })
    }

    const { text, language, page } = await req.json().catch(() => ({}))

    if (!text || typeof text !== "string" || !text.trim()) {
      return NextResponse.json({ error: "text is required" }, { status: 400 })
    }
    if (text.trim().length > MAX_TEXT_LENGTH) {
      return NextResponse.json({ error: "text is too long" }, { status: 400 })
    }

    // Route through the unified orchestrator
    const result = await processInput({
      text: text.trim(),
      userId: auth.userId,
      profileId: auth.profileId,
      modality: "voice",
      language: typeof language === "string" ? language : undefined,
      pageRoute: typeof page === "string" ? page : undefined,
    })

    // Map to old voice response format for backward compatibility
    return NextResponse.json({
      response: result.response,
      conversationId: result.conversationId,
      source: result.source,
      intent: result.metadata?.intent,
      confidence: result.metadata?.confidence,
    })
  } catch (error) {
    console.error("Voice API error:", error)
    return NextResponse.json({ error: "Failed to process your request" }, { status: 500 })
  }
}

// Soft feature gate: allow when the flag row is absent (dev-friendly), block
// only when explicitly disabled. The `voice_input` flag is seeded enabled.
async function isVoiceEnabled(): Promise<boolean> {
  try {
    const flag = await prisma.featureFlag.findUnique({ where: { name: "voice_input" }, select: { enabled: true } })
    if (!flag) return true
    return flag.enabled
  } catch {
    return true
  }
}
