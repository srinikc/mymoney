"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Sparkles, ExternalLink } from "lucide-react"

interface SponsoredCardProps {
  title: string
  description?: string
  ctaText: string
  ctaUrl: string
  slotId: string
  page: string
  position?: string
  badge?: string
  className?: string
}

export function SponsoredCard({ title, description, ctaText, ctaUrl, slotId, page, position = "in-content", badge, className }: SponsoredCardProps) {
  const handleClick = () => {
    void fetch("/api/ads/click", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slotId, position, page, provider: "sponsored", targetUrl: ctaUrl }),
      keepalive: true,
    }).catch(() => {})
    window.open(ctaUrl, "_blank", "noopener,noreferrer")
  }

  return (
    <Card
      data-testid="sponsored-card"
      data-slot-id={slotId}
      className={[
        "border-amber-300 dark:border-amber-700 bg-amber-50/50 dark:bg-amber-950/10",
        "hover:border-amber-500 dark:hover:border-amber-500 transition-colors",
        className ?? "",
      ].join(" ")}
    >
      <CardContent className="p-4 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
            <span className="text-[10px] font-medium uppercase tracking-wide text-amber-700 dark:text-amber-400">
              Sponsored
            </span>
            {badge && (
              <Badge variant="outline" className="text-[10px] h-4 px-1 border-amber-400 text-amber-700 dark:text-amber-300">
                {badge}
              </Badge>
            )}
          </div>
        </div>
        <h3 className="font-semibold text-sm leading-tight">{title}</h3>
        {description && <p className="text-xs text-muted-foreground leading-relaxed">{description}</p>}
        <button
          onClick={handleClick}
          className="inline-flex items-center gap-1 text-xs font-medium text-amber-700 dark:text-amber-300 hover:underline"
        >
          {ctaText} <ExternalLink className="h-3 w-3" />
        </button>
      </CardContent>
    </Card>
  )
}
