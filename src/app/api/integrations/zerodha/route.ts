import { NextRequest, NextResponse } from "next/server"
import { ZerodhaClient } from "@/lib/zerodha"
import { prisma } from "@/lib/prisma"

// GET endpoints
export async function GET(req: NextRequest) {
  try {
    const url = req.nextUrl
    const action = url.searchParams.get("action") || "status"

    // Check if Zerodha is configured
    const apiKey = process.env.ZERODHA_API_KEY
    const accessToken = process.env.ZERODHA_ACCESS_TOKEN

    if (!apiKey) {
      return NextResponse.json({
        configured: false,
        loginUrl: null,
        message: "Zerodha API key not configured. Add ZERODHA_API_KEY to .env",
      })
    }

    // Generate login URL for OAuth flow
    if (action === "login") {
      const redirectUri = url.searchParams.get("redirect_uri") || `${url.origin}/api/integrations/zerodha/callback`
      const loginUrl = ZerodhaClient.getLoginUrl(apiKey, redirectUri)

      return NextResponse.json({
        configured: true,
        loginUrl,
        message: "Redirect user to Zerodha for authorization",
      })
    }

    // Fetch holdings
    if (action === "holdings") {
      if (!accessToken) {
        return NextResponse.json({ error: "Zerodha not authenticated. Complete OAuth flow first." }, { status: 401 })
      }

      const client = new ZerodhaClient(apiKey, accessToken)
      const holdings = await client.getHoldings()

      // Map holdings to Investment records
      const investments = holdings.map((h) => ({
        type: "stock",
        name: `${h.tradingsymbol} (${h.exchange})`,
        amount: h.quantity * h.averagePrice,
        currentValue: h.quantity * h.lastPrice,
        purchaseDate: new Date(),
        returnRate: h.averagePrice > 0 ? ((h.lastPrice - h.averagePrice) / h.averagePrice) * 100 : 0,
        notes: `ISIN: ${h.isin} | Qty: ${h.quantity} | Avg: ${h.averagePrice} | P&L: ${h.pnl}`,
        status: "active",
      }))

      return NextResponse.json({
        success: true,
        total: holdings.length,
        holdings,
        investments,
      })
    }

    // Fetch positions
    if (action === "positions") {
      if (!accessToken) {
        return NextResponse.json({ error: "Zerodha not authenticated. Complete OAuth flow first." }, { status: 401 })
      }

      const client = new ZerodhaClient(apiKey, accessToken)
      const positions = await client.getPositions()

      return NextResponse.json({
        success: true,
        total: positions.length,
        positions,
      })
    }

    // Get user profile
    if (action === "profile") {
      if (!accessToken) {
        return NextResponse.json({ error: "Zerodha not authenticated." }, { status: 401 })
      }

      const client = new ZerodhaClient(apiKey, accessToken)
      const profile = await client.getProfile()

      return NextResponse.json({
        success: true,
        profile,
      })
    }

    // Default: status check
    const loginUrl = ZerodhaClient.getLoginUrl(apiKey, `${url.origin}/api/integrations/zerodha/callback`)

    return NextResponse.json({
      configured: true,
      authenticated: !!accessToken,
      loginUrl,
      message: accessToken ? "Zerodha authenticated" : "Zerodha configured but not authenticated. Use login URL.",
    })
  } catch (error) {
    console.error("Zerodha API error:", error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}

// POST: Import holdings as investments
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}))
    const action = body.action || "import-holdings"

    const apiKey = process.env.ZERODHA_API_KEY
    const accessToken = process.env.ZERODHA_ACCESS_TOKEN || body.accessToken

    if (!apiKey || !accessToken) {
      return NextResponse.json({ error: "Zerodha not configured or authenticated" }, { status: 400 })
    }

    const client = new ZerodhaClient(apiKey, accessToken)

    if (action === "import-holdings") {
      const holdings = await client.getHoldings()

      let imported = 0

      for (const h of holdings) {
        const value = h.quantity * h.lastPrice
        const cost = h.quantity * h.averagePrice
        const returnRate = h.averagePrice > 0 ? ((h.lastPrice - h.averagePrice) / h.averagePrice) * 100 : 0

        // Check if investment already exists
        const existing = await prisma.investment.findFirst({
          where: { name: `${h.tradingsymbol} (${h.exchange})`, type: "stock" },
        })

        await (existing ? prisma.investment.update({
          where: { id: existing.id },
          data: {
            amount: cost,
            currentValue: value,
            returnRate,
            notes: `ISIN: ${h.isin} | Qty: ${h.quantity} | Avg: ${h.averagePrice} | P&L: ${h.pnl}`,
          },
        }) : prisma.investment.create({
          data: {
            type: "stock",
            name: `${h.tradingsymbol} (${h.exchange})`,
            amount: cost,
            currentValue: value,
            purchaseDate: new Date(),
            returnRate,
            notes: `ISIN: ${h.isin} | Qty: ${h.quantity} | Avg: ${h.averagePrice} | P&L: ${h.pnl}`,
            status: "active",
          },
        }))
        imported++
      }

      return NextResponse.json({
        success: true,
        imported,
        total: holdings.length,
        message: `Imported/updated ${imported} stock holdings from Zerodha`,
      })
    }

    if (action === "import-positions") {
      const positions = await client.getPositions()

      let imported = 0

      for (const p of positions) {
        const value = p.quantity * p.buyPrice
        const currentVal = p.sellAmount || value

        const existing = await prisma.investment.findFirst({
          where: { name: `${p.tradingsymbol} (${p.exchange})`, type: "stock" },
        })

        await (existing ? prisma.investment.update({
            where: { id: existing.id },
            data: {
              amount: p.buyAmount || value,
              currentValue: currentVal,
              returnRate: p.pnl,
            },
          }) : prisma.investment.create({
            data: {
              type: "stock",
              name: `${p.tradingsymbol} (${p.exchange})`,
              amount: p.buyAmount || value,
              currentValue: currentVal,
              purchaseDate: new Date(),
              returnRate: p.pnl,
              notes: `Qty: ${p.quantity} | Buy: ${p.buyPrice} | P&L: ${p.pnl}`,
              status: "active",
            },
          }));
        imported++
      }

      return NextResponse.json({
        success: true,
        imported,
        total: positions.length,
        message: `Imported/updated ${imported} stock positions from Zerodha`,
      })
    }

    return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 })
  } catch (error) {
    console.error("Zerodha import error:", error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
