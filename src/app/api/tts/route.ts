// ── POST /api/tts — natural neural text-to-speech ───────────────────────
// Uses Microsoft Edge's free neural TTS to return an MP3. Falls back on the
// client to the browser's Web Speech API if this is unreachable.

import { NextRequest, NextResponse } from "next/server"
import { withAuth } from "@/lib/with-auth"
import { MsEdgeTTS, OUTPUT_FORMAT } from "msedge-tts"
import { defaultEdgeVoice, EDGE_VOICE_IDS } from "@/shared/tts-voices"

export const runtime = "nodejs"
export const maxDuration = 30

const MAX_TEXT = 800

export async function POST(req: NextRequest) {
  try {
    const auth = await withAuth()
    if (auth.error) return auth.error

    const body = await req.json().catch(() => ({}))
    const text = typeof body.text === "string" ? body.text.trim().slice(0, MAX_TEXT) : ""
    const lang = typeof body.lang === "string" ? body.lang : "en-IN"
    const requested = typeof body.voice === "string" ? body.voice : ""
    if (!text) return NextResponse.json({ error: "text is required" }, { status: 400 })

    const voice = EDGE_VOICE_IDS.has(requested) ? requested : defaultEdgeVoice(lang)

    const tts = new MsEdgeTTS()
    await tts.setMetadata(voice, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3)
    const { audioStream } = tts.toStream(text)

    const chunks: Buffer[] = []
    for await (const chunk of audioStream) {
      chunks.push(Buffer.from(chunk as Uint8Array))
    }
    const audio = Buffer.concat(chunks)
    if (audio.length === 0) {
      return NextResponse.json({ error: "tts produced no audio" }, { status: 502 })
    }

    return new NextResponse(new Uint8Array(audio), {
      status: 200,
      headers: {
        "Content-Type": "audio/mpeg",
        "Content-Length": String(audio.length),
        "Cache-Control": "no-store",
      },
    })
  } catch (error) {
    console.error("TTS error:", error)
    return NextResponse.json({ error: "tts failed" }, { status: 502 })
  }
}
