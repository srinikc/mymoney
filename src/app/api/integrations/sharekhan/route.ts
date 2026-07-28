import { NextRequest, NextResponse } from "next/server"
import { SharekhanClient } from "@/lib/sharekhan"
import { prisma } from "@/lib/prisma"

export async function GET(req: NextRequest) {
  try {
    const url = req.nextUrl
    const action = url.searchParams.get("action") || "status"

    const apiKey = process.env.SHAREKHAN_API_KEY
    const accessToken = process.env.SHAREKHAN_ACCESS_TOKEN

    if (!apiKey) {
      return NextResponse.json({
        configured: false,
        loginUrl: null,
        message: "Sharekhan API key not configured. Add SHAREKHAN_API_KEY to .env",
      })
    }

    if (action === "login") {
      const redirectUri = url.searchParams.get("redirect_uri") || `${url.origin}/api/integrations/sharekhan/callback`
      const loginUrl = SharekhanClient.getLoginUrl(apiKey, redirectUri)
      return NextResponse.json({ configured: true, loginUrl, message: "Redirect user to Sharekhan for authorization" })
    }

    if (action === "holdings") {
      if (!accessToken) {
        return NextResponse.json({ error: "Sharekhan not authenticated. Complete OAuth flow first." }, { status: 401 })
      }
      const client = new SharekhanClient(apiKey, accessToken)
      const holdings = await client.getHoldings()
      const investments = holdings.map((h) => ({
        type: "stock",
        name: h.symbol,
        symbol: h.symbol,
        quantity: h.quantity,
        buyPrice: h.averagePrice,
        amount: h.quantity * h.averagePrice,
        currentValue: h.quantity * h.lastPrice,
        purchaseDate: new Date(),
        returnRate: h.averagePrice > 0 ? ((h.lastPrice - h.averagePrice) / h.averagePrice) * 100 : 0,
        notes: `ISIN: ${h.isin} | Exchange: ${h.exchange} | P&L: ${h.profitLoss}`,
        status: "active",
      }))
      return NextResponse.json({ success: true, total: holdings.length, holdings, investments })
    }

    if (action === "positions") {
      if (!accessToken) {
        return NextResponse.json({ error: "Sharekhan not authenticated." }, { status: 401 })
      }
      const client = new SharekhanClient(apiKey, accessToken)
      const positions = await client.getPositions()
      return NextResponse.json({ success: true, total: positions.length, positions })
    }

    if (action === "profile") {
      if (!accessToken) {
        return NextResponse.json({ error: "Sharekhan not authenticated." }, { status: 401 })
      }
      const client = new SharekhanClient(apiKey, accessToken)
      const profile = await client.getProfile()
      return NextResponse.json({ success: true, profile })
    }

    const loginUrl = SharekhanClient.getLoginUrl(apiKey, `${url.origin}/api/integrations/sharekhan/callback`)
    return NextResponse.json({
      configured: true,
      authenticated: !!accessToken,
      loginUrl,
      message: accessToken ? "Sharekhan authenticated" : "Sharekhan configured but not authenticated. Use login URL.",
    })
  } catch (error) {
    console.error("Sharekhan API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}))
    const action = body.action || "import-holdings"

    const apiKey = process.env.SHAREKHAN_API_KEY
    const accessToken = process.env.SHAREKHAN_ACCESS_TOKEN || body.accessToken

    if (!apiKey || !accessToken) {
      return NextResponse.json({ error: "Sharekhan not configured or authenticated" }, { status: 400 })
    }

    const client = new SharekhanClient(apiKey, accessToken)

    if (action === "import-holdings") {
      const holdings = await client.getHoldings()
      let imported = 0

      for (const h of holdings) {
        const cost = h.quantity * h.averagePrice
        const value = h.quantity * h.lastPrice
        const returnRate = h.averagePrice > 0 ? ((h.lastPrice - h.averagePrice) / h.averagePrice) * 100 : 0

        const existing = await prisma.investment.findFirst({
          where: { symbol: h.symbol, type: "stock" },
        })

        await (existing
          ? prisma.investment.update({
              where: { id: existing.id },
              data: {
                amount: cost,
                currentValue: value,
                quantity: h.quantity,
                buyPrice: h.averagePrice,
                returnRate,
                notes: `ISIN: ${h.isin} | Exchange: ${h.exchange} | P&L: ${h.profitLoss}`,
              },
            })
          : prisma.investment.create({
              data: {
                type: "stock",
                name: h.symbol,
                symbol: h.symbol,
                quantity: h.quantity,
                buyPrice: h.averagePrice,
                amount: cost,
                currentValue: value,
                purchaseDate: new Date(),
                returnRate,
                notes: `ISIN: ${h.isin} | Exchange: ${h.exchange} | P&L: ${h.profitLoss}`,
                status: "active",
              },
            }))
        imported++
      }

      return NextResponse.json({
        success: true,
        imported,
        total: holdings.length,
        message: `Imported/updated ${imported} stock holdings from Sharekhan`,
      })
    }

    return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 })
  } catch (error) {
    console.error("Sharekhan import error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
