import { NextResponse } from "next/server"

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const principal = Number.parseFloat(searchParams.get("principal") || "0")
    const rate = Number.parseFloat(searchParams.get("rate") || "0")
    const tenure = Number.parseInt(searchParams.get("tenure") || "0")

    if (!principal || !rate || !tenure) {
      return NextResponse.json({ error: "principal, rate, and tenure are required" }, { status: 400 })
    }

    const r = rate / 12 / 100
    const n = tenure
    const emi = principal * r * Math.pow(1 + r, n) / (Math.pow(1 + r, n) - 1)

    const schedule = []
    let balance = principal

    for (let month = 1; month <= n; month++) {
      const interest = balance * r
      const principalComp = emi - interest
      balance -= principalComp

      if (balance < 0) balance = 0

      schedule.push({
        month,
        openingBalance: Math.round((balance + principalComp) * 100) / 100,
        emi: Math.round(emi * 100) / 100,
        interest: Math.round(interest * 100) / 100,
        principal: Math.round(principalComp * 100) / 100,
        closingBalance: Math.round(balance * 100) / 100,
      })
    }

    return NextResponse.json({ emi: Math.round(emi * 100) / 100, schedule })
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
