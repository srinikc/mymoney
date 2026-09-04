"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ExternalLink, Sparkles } from "lucide-react"
import { formatIndianCurrency } from "@/lib/format"

const BANK_WEBSITES: Record<string, string> = {
  "HDFC Bank": "https://www.hdfcbank.com",
  "ICICI Bank": "https://www.icicibank.com",
  "SBI": "https://sbi.co.in",
  "State Bank of India": "https://sbi.co.in",
  "Axis Bank": "https://www.axisbank.com",
  "Kotak Mahindra Bank": "https://www.kotak.com",
  "Bank of Baroda": "https://bankofbaroda.in",
  "Punjab National Bank": "https://www.pnbbank.in",
  "Canara Bank": "https://www.canarabank.com",
  "Union Bank of India": "https://www.unionbankofindia.co.in",
  "IDFC First Bank": "https://www.idfcfirstbank.com",
  "Bajaj Finserv": "https://www.bajajfinserv.in",
  "Tata Capital": "https://www.tatacapital.com",
  "L&T Finance": "https://www.ltfs.com",
  "Muthoot Finance": "https://www.muthootfinance.com",
  "Manappuram Finance": "https://www.manappuram.com",
  "PNB Housing": "https://www.pnbhousing.com",
  "LIC Housing Finance": "https://www.lichousing.com",
  "HDFC Home Loans": "https://www.hdfc.com",
}

interface LoanProductCardProps {
  product: {
    id?: number
    bankName: string
    productName: string
    loanType: string
    interestRateMin: number
    interestRateMax: number
    maxAmount: number
    tenureMonths: number
    processingFee: string
    features: string[]
    affiliateUrl: string
  }
  isSponsored?: boolean
  slotId?: string
  page?: string
}

export function LoanProductCard({ product, isSponsored, slotId = "loan-card", page = "/loans" }: LoanProductCardProps) {
  const bankWebsite = BANK_WEBSITES[product.bankName] || `https://www.google.com/search?q=${encodeURIComponent(product.bankName + " official website")}`

  const handleApply = () => {
    void fetch("/api/ads/click", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slotId, position: "in-content", page, provider: isSponsored ? "sponsored" : "affiliate", targetUrl: bankWebsite }),
      keepalive: true,
    }).catch(() => {})
    window.open(bankWebsite, "_blank", "noopener,noreferrer")
  }

  return (
    <Card
      data-testid="loan-product-card"
      data-bank={product.bankName}
      data-sponsored={isSponsored ? "true" : "false"}
      className={[
        isSponsored ? "border-amber-300 dark:border-amber-700 bg-amber-50/30 dark:bg-amber-950/10" : "",
        "hover:shadow-md transition-shadow",
      ].join(" ")}
    >
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">{product.bankName}</p>
            <h3 className="font-semibold text-sm mt-0.5">{product.productName}</h3>
          </div>
          {isSponsored && (
            <Badge variant="outline" className="text-[10px] h-4 px-1 border-amber-400 text-amber-700 dark:text-amber-300 gap-0.5">
              <Sparkles className="h-2.5 w-2.5" /> Sponsored
            </Badge>
          )}
        </div>

        <div className="grid grid-cols-2 gap-x-3 gap-y-2 text-xs">
          <div>
            <p className="text-muted-foreground text-[10px]">Interest rate</p>
            <p className="font-semibold">
              {product.interestRateMin}% - {product.interestRateMax}%
            </p>
          </div>
          <div>
            <p className="text-muted-foreground text-[10px]">Max amount</p>
            <p className="font-semibold">{formatIndianCurrency(product.maxAmount)}</p>
          </div>
          <div>
            <p className="text-muted-foreground text-[10px]">Tenure</p>
            <p className="font-semibold">up to {product.tenureMonths} months</p>
          </div>
          <div>
            <p className="text-muted-foreground text-[10px]">Processing fee</p>
            <p className="font-semibold">{product.processingFee}</p>
          </div>
        </div>

        {product.features.length > 0 && (
          <ul className="text-xs text-muted-foreground space-y-0.5">
            {product.features.slice(0, 2).map((f, i) => (
              <li key={i} className="flex gap-1">
                <span className="text-emerald-600">•</span>
                <span>{f}</span>
              </li>
            ))}
          </ul>
        )}

        <Button size="sm" className="w-full" onClick={handleApply} variant={isSponsored ? "default" : "outline"}>
          View on {product.bankName} <ExternalLink className="h-3 w-3 ml-1" />
        </Button>
      </CardContent>
    </Card>
  )
}
