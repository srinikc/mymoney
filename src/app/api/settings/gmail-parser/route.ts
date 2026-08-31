import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getAuthContext } from "@/lib/with-auth"
import { DEFAULT_KEYWORDS } from "@/lib/gmail-parser"
import type { ParserKeywords } from "@/lib/gmail-parser"

const SETTINGS_KEY = "gmail_parser_keywords"

export async function GET() {
  try {
    const { userId } = await getAuthContext()
    // userId auto-checked by getAuthContext

    const setting = await prisma.userSetting.findUnique({
      where: { userId_key: { userId: userId, key: SETTINGS_KEY } },
    })

    return NextResponse.json({ keywords: (setting?.value as ParserKeywords) || DEFAULT_KEYWORDS })
  } catch (error) {
    console.error("Gmail parser GET error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function PUT(req: Request) {
  try {
    const { userId } = await getAuthContext()
    // userId auto-checked by getAuthContext

    const body = await req.json()
    const keywords = body.keywords as Partial<ParserKeywords>

    // Validate keywords are arrays of strings
    for (const [key, values] of Object.entries(keywords)) {
      if (!Array.isArray(values) || !values.every((v) => typeof v === "string")) {
        return NextResponse.json({ error: `Invalid keywords for ${key}: must be string array` }, { status: 400 })
      }
    }

    const existing = await prisma.userSetting.findUnique({
      where: { userId_key: { userId: userId, key: SETTINGS_KEY } },
    })

    if (existing) {
      await prisma.userSetting.update({
        where: { id: existing.id },
        data: { value: { ...(existing.value as Record<string, unknown>), ...keywords } },
      })
    } else {
      await prisma.userSetting.create({
        data: {
          userId: userId,
          key: SETTINGS_KEY,
          value: { ...DEFAULT_KEYWORDS, ...keywords },
        },
      })
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error("Gmail parser PUT error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
