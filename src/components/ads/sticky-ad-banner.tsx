"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { X } from "lucide-react"

const STORAGE_KEY = "mymoney-sticky-ad-dismissed"
const DISMISS_DAYS = 7

export function StickyAdBanner({ slotId = "sticky-bottom", page }: { slotId?: string; page: string }) {
  const [visible, setVisible] = useState(false)
  const [dismissed, setDismissed] = useState(true)

  useEffect(() => {
    if (typeof window === "undefined") return
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) {
        const ts = Number(raw)
        if (Number.isFinite(ts) && Date.now() - ts < DISMISS_DAYS * 24 * 60 * 60 * 1000) {
          setDismissed(true)
          setVisible(false)
          return
        }
      }
    } catch {
      // ignore
    }
    setDismissed(false)
    setVisible(true)
  }, [])

  useEffect(() => {
    if (!visible) return
    void fetch("/api/ads/impression", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slotId, position: "sticky", page, provider: "mock" }),
      keepalive: true,
    }).catch(() => {})
  }, [visible, slotId, page])

  const handleDismiss = () => {
    setVisible(false)
    setDismissed(true)
    try {
      localStorage.setItem(STORAGE_KEY, String(Date.now()))
    } catch {
      // ignore
    }
  }

  const handleClick = () => {
    void fetch("/api/ads/click", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slotId, position: "sticky", page, provider: "mock", targetUrl: window.location.href }),
      keepalive: true,
    }).catch(() => {})
  }

  if (dismissed || !visible) return null

  return (
    <div
      data-testid="sticky-ad-banner"
      data-slot-id={slotId}
      className="fixed bottom-0 left-0 right-0 z-30 flex justify-center bg-background/95 backdrop-blur border-t shadow-lg p-2"
    >
      <div className="relative w-full max-w-[728px] h-[50px] sm:h-[60px] bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-950/30 dark:to-purple-950/30 border border-indigo-200 dark:border-indigo-800/50 rounded-md flex items-center justify-between px-3 sm:px-4">
        <div
          className="flex-1 flex items-center gap-2 text-xs sm:text-sm cursor-pointer"
          onClick={handleClick}
        >
          <span className="text-[10px] uppercase tracking-wide text-indigo-600 dark:text-indigo-400 font-semibold flex-shrink-0">
            Sponsored
          </span>
          <span className="text-muted-foreground truncate">
            {slotId === "sticky-bottom" ? "Investment tips, loan offers & deals — discover more" : `Ad placeholder for ${page}`}
          </span>
        </div>
        <Button
          size="icon"
          variant="ghost"
          className="h-6 w-6 flex-shrink-0"
          onClick={handleDismiss}
          aria-label="Dismiss ad"
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  )
}
