"use client"

import { usePathname } from "next/navigation"
import { AdSlot } from "@/components/ads/ad-slot"
import { StickyAdBanner } from "@/components/ads/sticky-ad-banner"
import { isAdEnabledPage } from "@/lib/ad-providers"

interface AdContainerProps {
  slotIdPrefix?: string
  showSticky?: boolean
  className?: string
}

// Client-side container that renders ad slots if the current page is ad-enabled.
// Use inside a page's main content area. Sticky banner only shows if showSticky=true.
export function AdContainer({ slotIdPrefix = "in-content", showSticky = true, className }: AdContainerProps) {
  const pathname = usePathname() ?? ""
  if (!isAdEnabledPage(pathname)) return null

  return (
    <>
      <div className={["flex justify-center my-4", className ?? ""].join(" ")}>
        <AdSlot
          slotId={`${slotIdPrefix}-${pathname}`}
          format="leaderboard"
          position="in-content"
          page={pathname}
        />
      </div>
      {showSticky && <StickyAdBanner page={pathname} />}
    </>
  )
}
