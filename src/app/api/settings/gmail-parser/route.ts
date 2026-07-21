import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { DEFAULT_KEYWORDS } from "@/lib/gmail-parser"
import type { ParserKeywords } from "@/lib/gmail-parser"

const SETTINGS_KEY = "gmail_parser_keywords"

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const setting = await prisma.userSetting.findUnique({
      where: { userId_key: { userId: Number(session.user.id), key: SETTINGS_KEY } },
    })

    return NextResponse.json({ keywords: (setting?.value as ParserKeywords) || DEFAULT_KEYWORDS })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}

export async function PUT(req: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const body = await req.json()
    const keywords = body.keywords as Partial<ParserKeywords>

    // Validate keywords are arrays of strings
    for (const [key, values] of Object.entries(keywords)) {
      if (!Array.isArray(values) || !values.every((v) => typeof v === "string")) {
        return NextResponse.json({ error: `Invalid keywords for ${key}: must be string array` }, { status: 400 })
      }
    }

    const existing = await prisma.userSetting.findUnique({
      where: { userId_key: { userId: Number(session.user.id), key: SETTINGS_KEY } },
    })

    if (existing) {
      await prisma.userSetting.update({
        where: { id: existing.id },
        data: { value: { ...(existing.value as any), ...keywords } },
      })
    } else {
      await prisma.userSetting.create({
        data: {
          userId: Number(session.user.id),
          key: SETTINGS_KEY,
          value: { ...DEFAULT_KEYWORDS, ...keywords },
        },
      })
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
