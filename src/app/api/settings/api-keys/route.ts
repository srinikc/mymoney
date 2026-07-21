import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { getAllConfig, setConfig } from "@/lib/get-config"

const EDITABLE_API_KEYS = [
  "OPENAI_API_KEY", "ANTHROPIC_API_KEY", "LLM_PROVIDER", "LLM_MODEL",
  "AUTH_RESEND_KEY",
  "ZERODHA_API_KEY", "ZERODHA_API_SECRET",
  "SHAREKHAN_API_KEY", "SHAREKHAN_API_SECRET",
] as const

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const config = await getAllConfig(Number(session.user.id))
    const keys: Record<string, string | undefined> = {}
    for (const k of EDITABLE_API_KEYS) keys[k] = config[k]

    return NextResponse.json({ keys })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}

export async function PUT(req: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const body = await req.json()
    const userId = Number(session.user.id)

    for (const [key, value] of Object.entries(body.keys || {})) {
      if ((EDITABLE_API_KEYS as readonly string[]).includes(key) && typeof value === "string") {
        await setConfig(userId, key as any, value)
      }
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
