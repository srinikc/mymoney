import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { getConfig, setConfig, BOOT_CONFIG_KEYS } from "@/lib/get-config"

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const userId = Number(session.user.id)

    const vars: Record<string, { value: string | undefined; envValue: string | undefined }> = {}
    for (const cfg of BOOT_CONFIG_KEYS) {
      const dbValue = await getConfig(cfg.key as any, userId)
      const envValue = process.env[cfg.key] || undefined
      vars[cfg.key] = {
        value: dbValue || envValue,
        envValue,
      }
    }

    return NextResponse.json({ vars, definitions: BOOT_CONFIG_KEYS })
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

    for (const [key, value] of Object.entries(body.vars || {})) {
      const def = BOOT_CONFIG_KEYS.find((d) => d.key === key)
      if (def?.editable && typeof value === "string") {
        await setConfig(userId, key as any, value)
      }
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
