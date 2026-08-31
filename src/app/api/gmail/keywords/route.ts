import { NextResponse } from "next/server"
import { getAuthContext, handleAuthError } from "@/lib/with-auth"
import { DEFAULT_KEYWORDS, type ParserKeywords } from "@/lib/gmail-parser"

const KEY = "gmail_parser_keywords"

// GET: returns the current parser keywords (DB override or defaults)
export async function GET() {
  try {
    const { userId } = await getAuthContext()
    const { prisma } = await import("@/lib/prisma")
    const setting = await prisma.userSetting.findUnique({
      where: { userId_key: { userId, key: KEY } },
      select: { value: true },
    })
    const keywords = (setting?.value || DEFAULT_KEYWORDS) as ParserKeywords
    return NextResponse.json({ keywords })
  } catch (error) {
    return handleAuthError(error)
  }
}

// PUT: save a full keywords override (add/delete/edit terms per category)
export async function PUT(req: Request) {
  try {
    const { userId } = await getAuthContext()
    const body = await req.json()
    const kw = body.keywords as ParserKeywords | undefined
    if (!kw || typeof kw !== "object") {
      return NextResponse.json({ error: "keywords object required" }, { status: 400 })
    }

    // Validate: only known categories, arrays of strings
    const allowed = new Set(Object.keys(DEFAULT_KEYWORDS))
    const clean: ParserKeywords = {}
    for (const [cat, terms] of Object.entries(kw)) {
      if (!allowed.has(cat) || !Array.isArray(terms)) continue
      const sanitized = terms
        .map((t) => String(t).trim())
        .filter(Boolean)
      if (sanitized.length) clean[cat as keyof ParserKeywords] = sanitized
    }

    const { prisma } = await import("@/lib/prisma")
    await prisma.userSetting.upsert({
      where: { userId_key: { userId, key: KEY } },
      create: { userId, key: KEY, value: clean as unknown as string },
      update: { value: clean as unknown as string },
    })

    return NextResponse.json({ ok: true, keywords: clean })
  } catch (error) {
    return handleAuthError(error)
  }
}