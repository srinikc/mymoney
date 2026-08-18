import { NextResponse } from "next/server"
import { getAuthContext, handleAuthError } from "@/lib/with-auth"
import { getAllConfig, setConfig, type ConfigKey } from "@/lib/get-config"
import { LLM_PROVIDERS } from "@/lib/llm-catalog"

const EDITABLE_API_KEYS = [
  "OPENAI_API_KEY", "ANTHROPIC_API_KEY", "OPENCODE_API_KEY", "LLM_PROVIDER", "LLM_MODEL", "LLM_BASE_URL", "LOCAL_LLM_ENDPOINT",
  "AUTH_RESEND_KEY",
  "ZERODHA_API_KEY", "ZERODHA_API_SECRET",
  "SHAREKHAN_API_KEY", "SHAREKHAN_API_SECRET",
] as const

export async function GET() {
  try {
    const { userId } = await getAuthContext()
    // userId auto-checked by getAuthContext

    const config = await getAllConfig(userId)
    const keys: Record<string, string | undefined> = {}
    for (const k of EDITABLE_API_KEYS) keys[k] = config[k]

    return NextResponse.json({ keys, catalog: { providers: LLM_PROVIDERS } })
  } catch (error) {
    return handleAuthError(error)
  }
}

export async function PUT(req: Request) {
  try {
    const { userId } = await getAuthContext()
    // userId auto-checked by getAuthContext

    const body = await req.json()

    for (const [key, value] of Object.entries(body.keys || {})) {
      if ((EDITABLE_API_KEYS as readonly string[]).includes(key) && typeof value === "string") {
        await setConfig(userId, key as ConfigKey, value)
      }
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    return handleAuthError(error)
  }
}
