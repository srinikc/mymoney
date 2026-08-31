import { NextResponse } from "next/server"
import { getAuthContext } from "@/lib/with-auth"
import { getConfig, setConfig, BOOT_CONFIG_KEYS, type ConfigKey } from "@/lib/get-config"

export async function GET() {
  try {
    const { userId } = await getAuthContext()
    // userId auto-checked by getAuthContext

    const vars: Record<string, { value: string | undefined; envValue: string | undefined }> = {}
    for (const cfg of BOOT_CONFIG_KEYS) {
      const dbValue = await getConfig(cfg.key as ConfigKey, userId)
      const envValue = process.env[cfg.key] || undefined
      vars[cfg.key] = {
        value: dbValue || envValue,
        envValue,
      }
    }

    return NextResponse.json({ vars, definitions: BOOT_CONFIG_KEYS })
  } catch (error) {
    console.error("Environment GET error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function PUT(req: Request) {
  try {
    const { userId } = await getAuthContext()
    // userId auto-checked by getAuthContext

    const body = await req.json()

    for (const [key, value] of Object.entries(body.vars || {})) {
      const def = BOOT_CONFIG_KEYS.find((d) => d.key === key)
      if (def?.editable && typeof value === "string") {
        await setConfig(userId, key as ConfigKey, value)
      }
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error("Environment PUT error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
