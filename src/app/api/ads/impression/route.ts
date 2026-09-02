import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { getUserConsent } from "@/lib/consent"
import { isAdEnabledPage } from "@/lib/ad-providers"

export const runtime = "nodejs"

interface ImpressionBody {
  slotId: string
  position: string
  page: string
  provider: string
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as ImpressionBody
    if (!body.slotId || !body.page || !body.position) {
      return NextResponse.json({ error: "missing fields" }, { status: 400 })
    }

    // Only track impressions on ad-enabled pages
    if (!isAdEnabledPage(body.page)) {
      return NextResponse.json({ ok: true, skipped: true })
    }

    const session = await auth()
    const userId = session?.user ? Number((session.user as { id?: number }).id) || null : null

    if (userId) {
      const consent = await getUserConsent(userId)
      if (body.provider === "mock" || body.provider === "adsense" || body.provider === "inmobi" || body.provider === "adgebra") {
        if (!consent.showDisplayAds) {
          return NextResponse.json({ ok: true, skipped: true, reason: "user opted out of display ads" })
        }
      } else if (body.provider === "sponsored" || body.provider === "affiliate") {
        if (!consent.showPersonalizedRecs) {
          return NextResponse.json({ ok: true, skipped: true, reason: "user opted out of personalized recs" })
        }
      }
    }

    await prisma.adImpression.create({
      data: {
        userId,
        slotId: body.slotId,
        provider: body.provider,
        page: body.page,
        position: body.position,
      },
    })
    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error("ad impression error:", e)
    return NextResponse.json({ ok: false }, { status: 500 })
  }
}
