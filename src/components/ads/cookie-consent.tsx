"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Cookie, X, Settings2 } from "lucide-react"
import Link from "next/link"

const STORAGE_KEY = "mymoney-cookie-consent"

type ConsentState = "accepted" | "rejected" | "custom" | null

export function CookieConsent() {
  const [state, setState] = useState<ConsentState>(null)
  const [showSettings, setShowSettings] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    try {
      const stored = localStorage.getItem(STORAGE_KEY) as ConsentState
      setState(stored)
    } catch {
      // ignore
    }
  }, [])

  const handleAccept = () => {
    try {
      localStorage.setItem(STORAGE_KEY, "accepted")
    } catch {
      // ignore
    }
    setState("accepted")
    // Notify other components
    window.dispatchEvent(new CustomEvent("consent-updated", { detail: { state: "accepted" } }))
  }

  const handleReject = () => {
    try {
      localStorage.setItem(STORAGE_KEY, "rejected")
    } catch {
      // ignore
    }
    setState("rejected")
    window.dispatchEvent(new CustomEvent("consent-updated", { detail: { state: "rejected" } }))
  }

  if (!mounted || state !== null) return null

  return (
    <div data-testid="cookie-consent" className="fixed bottom-0 left-0 right-0 z-50 p-3 sm:p-4 pointer-events-none">
      <Card className="max-w-3xl mx-auto pointer-events-auto border-amber-300 dark:border-amber-700 bg-amber-50/95 dark:bg-amber-950/95 backdrop-blur shadow-xl">
        <CardContent className="p-4">
          {showSettings ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Settings2 className="h-4 w-4 text-amber-600" />
                <h3 className="font-semibold text-sm">Ad & Cookie Preferences</h3>
              </div>
              <p className="text-xs text-muted-foreground">
                Choose which cookies and ad personalization you&apos;re comfortable with. You can change this anytime in Settings → Privacy.
              </p>
              <div className="space-y-2 text-xs">
                <div className="flex items-start gap-2 p-2 rounded border border-amber-200 dark:border-amber-800/50 bg-background/50">
                  <input type="checkbox" checked disabled className="mt-0.5" />
                  <div>
                    <p className="font-medium">Essential cookies (required)</p>
                    <p className="text-muted-foreground">Authentication, security, language preferences. Cannot be disabled.</p>
                  </div>
                </div>
                <div className="flex items-start gap-2 p-2 rounded border border-amber-200 dark:border-amber-800/50 bg-background/50">
                  <input type="checkbox" defaultChecked className="mt-0.5" id="consent-ads" />
                  <label htmlFor="consent-ads" className="cursor-pointer">
                    <p className="font-medium">Display advertisements</p>
                    <p className="text-muted-foreground">Shows contextual ads from Google AdSense, InMobi, and Adgebra. Pays for our free service.</p>
                  </label>
                </div>
                <div className="flex items-start gap-2 p-2 rounded border border-amber-200 dark:border-amber-800/50 bg-background/50">
                  <input type="checkbox" defaultChecked className="mt-0.5" id="consent-personalized" />
                  <label htmlFor="consent-personalized" className="cursor-pointer">
                    <p className="font-medium">Personalized recommendations</p>
                    <p className="text-muted-foreground">Shows curated mutual funds, loan rates, and deals based on your profile.</p>
                  </label>
                </div>
                <div className="flex items-start gap-2 p-2 rounded border border-amber-200 dark:border-amber-800/50 bg-background/50">
                  <input type="checkbox" className="mt-0.5" id="consent-targeting" />
                  <label htmlFor="consent-targeting" className="cursor-pointer">
                    <p className="font-medium">Personalized ad targeting</p>
                    <p className="text-muted-foreground">Allows ad networks to show ads based on your browsing across other sites.</p>
                  </label>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" onClick={handleAccept}>Save preferences</Button>
                <Button size="sm" variant="ghost" onClick={() => setShowSettings(false)}>Back</Button>
                <Link href="/privacy" className="text-xs text-muted-foreground hover:text-foreground underline ml-auto self-center">
                  Privacy policy
                </Link>
              </div>
            </div>
          ) : (
            <div className="flex items-start gap-3">
              <Cookie className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1 space-y-2">
                <div>
                  <h3 className="font-semibold text-sm">We use cookies to show relevant ads</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    We use Google AdSense, InMobi, and Adgebra to show contextual ads. Some are affiliate partnerships (we may earn a commission). You can customize or opt out anytime.
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Button size="sm" onClick={handleAccept} data-testid="consent-accept">Accept all</Button>
                  <Button size="sm" variant="outline" onClick={handleReject} data-testid="consent-reject">Reject non-essential</Button>
                  <Button size="sm" variant="ghost" onClick={() => setShowSettings(true)}>Customize</Button>
                  <Link href="/privacy" className="text-xs text-muted-foreground hover:text-foreground underline ml-auto">
                    Learn more
                  </Link>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
