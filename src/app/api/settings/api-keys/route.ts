import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { requireRole, type AuthUser } from "@/lib/roles"
import { getAllConfig, setConfig, type ConfigKey } from "@/lib/get-config"
import { LLM_PROVIDERS } from "@/lib/llm-catalog"

const EDITABLE_API_KEYS = [
  "OPENAI_API_KEY", "ANTHROPIC_API_KEY", "OPENCODE_API_KEY", "LLM_PROVIDER", "LLM_MODEL", "LLM_BASE_URL", "LOCAL_LLM_ENDPOINT",
  "AUTH_RESEND_KEY",
  "ZERODHA_API_KEY", "ZERODHA_API_SECRET",
  "SHAREKHAN_API_KEY", "SHAREKHAN_API_SECRET",
] as const

export async function GET() {
  const session = await auth()
  const forbid = requireRole(session?.user as AuthUser, "admin")
  if (forbid) return forbid

  try {
    const config = await getAllConfig(Number(session!.user!.id))
    const keys: Record<string, string | undefined> = {}
    for (const k of EDITABLE_API_KEYS) keys[k] = config[k]

    return NextResponse.json({ keys, catalog: { providers: LLM_PROVIDERS } })
  } catch (error) {
    return NextResponse.json({ error: "internal error" }, { status: 500 })
  }
}

export async function PUT(req: Request) {
  const session = await auth()
  const forbid = requireRole(session?.user as AuthUser, "admin")
  if (forbid) return forbid

  try {
    const body = await req.json()
    const userId = Number(session!.user!.id)

    for (const [key, value] of Object.entries(body.keys || {})) {
      if ((EDITABLE_API_KEYS as readonly string[]).includes(key) && typeof value === "string") {
        await setConfig(userId, key as ConfigKey, value)
      }
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    return NextResponse.json({ error: "internal error" }, { status: 500 })
  }
}
