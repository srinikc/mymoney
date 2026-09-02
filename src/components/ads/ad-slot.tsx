"use client"

import { useEffect, useRef, useState } from "react"
import { Sparkles, X } from "lucide-react"
import { Button } from "@/components/ui/button"

export type AdFormat = "leaderboard" | "rectangle" | "sticky-mobile" | "sticky-desktop"

interface AdSlotProps {
  slotId: string
  format: AdFormat
  position: "in-content" | "sticky"
  page: string
  dismissible?: boolean
  onDismiss?: () => void
  className?: string
}

const FORMAT_CLASSES: Record<AdFormat, string> = {
  leaderboard: "w-full max-w-[728px] h-[90px]",
  rectangle: "w-[300px] h-[250px]",
  "sticky-mobile": "w-[320px] h-[50px] max-w-full",
  "sticky-desktop": "w-[728px] h-[90px] max-w-full",
}

const STICKY_CONTAINER =
  "fixed bottom-0 left-0 right-0 z-40 flex justify-center bg-background/95 backdrop-blur border-t p-2 shadow-lg"

export function AdSlot({ slotId, format, position, page, dismissible, onDismiss, className }: AdSlotProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [dismissed, setDismissed] = useState(false)
  const [visible, setVisible] = useState(false)
  const impressionFired = useRef(false)

  useEffect(() => {
    if (position !== "in-content") {
      setVisible(true)
      return
    }
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setVisible(true)
          obs.disconnect()
        }
      },
      { threshold: 0.1 },
    )
    if (ref.current) obs.observe(ref.current)
    return () => obs.disconnect()
  }, [position])

  useEffect(() => {
    if (!visible || impressionFired.current) return
    impressionFired.current = true
    void fetch("/api/ads/impression", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slotId, position, page, provider: "mock" }),
      keepalive: true,
    }).catch(() => {})
  }, [visible, slotId, position, page])

  if (dismissed) return null

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault()
    void fetch("/api/ads/click", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slotId, position, page, provider: "mock", targetUrl: window.location.href }),
      keepalive: true,
    }).catch(() => {})
  }

  const content = (
    <div
      ref={ref}
      data-testid={`ad-slot-${slotId}`}
      data-slot-id={slotId}
      data-position={position}
      onClick={handleClick}
      className={[
        "relative bg-muted/30 border border-dashed border-muted-foreground/40 rounded-md",
        "flex items-center justify-center text-xs text-muted-foreground",
        "hover:bg-muted/50 transition-colors cursor-pointer select-none",
        FORMAT_CLASSES[format],
        className ?? "",
      ].join(" ")}
    >
      <div className="flex flex-col items-center gap-1">
        <span className="flex items-center gap-1 font-medium">
          <Sparkles className="h-3 w-3" /> Sponsored
        </span>
        <span className="text-[10px] opacity-70">{slotId} · {format}</span>
      </div>
      {dismissible && (
        <Button
          size="icon"
          variant="ghost"
          className="absolute top-1 right-1 h-5 w-5"
          onClick={(e) => {
            e.stopPropagation()
            setDismissed(true)
            onDismiss?.()
          }}
          aria-label="Dismiss ad"
        >
          <X className="h-3 w-3" />
        </Button>
      )}
    </div>
  )

  if (position === "sticky") {
    return <div className={STICKY_CONTAINER}>{content}</div>
  }
  return content
}
