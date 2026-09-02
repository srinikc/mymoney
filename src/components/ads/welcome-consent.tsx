"use client"

import { useEffect, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Sparkles, X, TrendingUp, Landmark, Tag } from "lucide-react"
import Link from "next/link"

interface WelcomeConsentProps {
  dismissed: boolean
  onDismiss: (accepted: boolean) => void
}

export function WelcomeConsent({ dismissed, onDismiss }: WelcomeConsentProps) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  if (!mounted || dismissed) return null

  return (
    <Card
      data-testid="welcome-consent"
      className="border-amber-200 bg-gradient-to-br from-amber-50 to-yellow-50 dark:from-amber-950/30 dark:to-yellow-950/20 dark:border-amber-800/50"
    >
      <CardContent className="p-4 md:p-5">
        <div className="flex items-start gap-3">
          <div className="h-9 w-9 rounded-lg bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center flex-shrink-0">
            <Sparkles className="h-4.5 w-4.5 text-amber-600 dark:text-amber-400" />
          </div>
          <div className="flex-1 space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="font-semibold text-sm">Welcome to MyMoney!</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  As you explore, we&apos;ll show a few helpful recommendations to make your money decisions easier.
                </p>
              </div>
              <Button
                size="icon"
                variant="ghost"
                className="h-6 w-6 -mt-1"
                onClick={() => onDismiss(false)}
                aria-label="Dismiss"
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
              <div className="flex items-center gap-2 text-xs">
                <TrendingUp className="h-3.5 w-3.5 text-emerald-600 flex-shrink-0" />
                <span>Curated mutual funds</span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <Landmark className="h-3.5 w-3.5 text-blue-600 flex-shrink-0" />
                <span>Today&apos;s best loan rates</span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <Tag className="h-3.5 w-3.5 text-purple-600 flex-shrink-0" />
                <span>Deals on your favorite brands</span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 pt-2">
              <Button size="sm" onClick={() => onDismiss(true)}>
                Got it, show me
              </Button>
              <Button size="sm" variant="ghost" onClick={() => onDismiss(false)}>
                Maybe later
              </Button>
              <Link
                href="/privacy"
                className="text-xs text-muted-foreground hover:text-foreground underline ml-auto"
              >
                How we use your data
              </Link>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
