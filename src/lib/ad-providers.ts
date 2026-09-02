// ── Ad Provider Abstraction ─────────────────────────────────────────────
// Mock provider renders a styled card with sample content. When you have
// AdSense/InMobi/Adgebra accounts approved, just set the env vars —
// the code wires them up automatically.

export type AdProviderName = "mock" | "adsense" | "inmobi" | "adgebra"

export interface AdProviderConfig {
  publisherId: string | undefined
  enabled: boolean
}

export interface AdProvider {
  name: AdProviderName
  enabled: boolean
  scriptSrc?: string
  buildHtml: (slotId: string, opts: { width: number; height: number; position: string; page: string }) => string
}

function getProviderConfig(name: AdProviderName): AdProviderConfig {
  switch (name) {
    case "adsense": {
      const id = process.env.NEXT_PUBLIC_ADSENSE_PUBLISHER_ID
      return { publisherId: id, enabled: Boolean(id) }
    }
    case "inmobi": {
      const id = process.env.NEXT_PUBLIC_INMOBI_SITE_ID
      return { publisherId: id, enabled: Boolean(id) }
    }
    case "adgebra": {
      const id = process.env.NEXT_PUBLIC_ADGEBRA_TAG_ID
      return { publisherId: id, enabled: Boolean(id) }
    }
    case "mock":
      return { publisherId: "mock", enabled: true }
  }
}

export function getProvider(name: AdProviderName): AdProvider {
  const config = getProviderConfig(name)

  switch (name) {
    case "adsense": {
      return {
        name,
        enabled: config.enabled,
        scriptSrc: "https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js",
        buildHtml: (slotId, { width, height }) => {
          if (!config.publisherId) return mockHtml(slotId, { width, height })
          return `<ins class="adsbygoogle" style="display:inline-block;width:${width}px;height:${height}px" data-ad-client="${config.publisherId}" data-ad-slot="${slotId}"></ins>`
        },
      }
    }
    case "inmobi": {
      return {
        name,
        enabled: config.enabled,
        scriptSrc: "https://api.inmobi.com/ad/v1",
        buildHtml: (slotId, { width, height }) => {
          if (!config.publisherId) return mockHtml(slotId, { width, height })
          return `<div class="inmobi-ad" data-site-id="${config.publisherId}" data-slot-id="${slotId}" style="width:${width}px;height:${height}px"></div>`
        },
      }
    }
    case "adgebra": {
      return {
        name,
        enabled: config.enabled,
        scriptSrc: "https://cdn.adgebra.io/ads.js",
        buildHtml: (slotId, { width, height }) => {
          if (!config.publisherId) return mockHtml(slotId, { width, height })
          return `<div class="adgebra-ad" data-tag-id="${config.publisherId}" data-slot="${slotId}" style="width:${width}px;height:${height}px"></div>`
        },
      }
    }
    case "mock":
    default: {
      return {
        name: "mock",
        enabled: true,
        buildHtml: (slotId, { width, height }) => mockHtml(slotId, { width, height }),
      }
    }
  }
}

// Waterfall: try in order, return first enabled
export function selectProvider(preferred?: AdProviderName): AdProvider {
  const order: AdProviderName[] = preferred
    ? [preferred, "adsense", "adgebra", "inmobi", "mock"]
    : ["adsense", "adgebra", "inmobi", "mock"]
  for (const name of order) {
    const p = getProvider(name)
    if (p.enabled) return p
  }
  return getProvider("mock")
}

function mockHtml(slotId: string, { width, height }: { width: number; height: number }): string {
  return `<div data-slot="${slotId}" class="bg-muted/40 border border-dashed border-muted-foreground/30 rounded-md flex items-center justify-center text-xs text-muted-foreground" style="width:${width}px;height:${height}px;max-width:100%">Sponsored (${slotId})</div>`
}

// List of pages where display ads are allowed
// Workflow pages (expenses, budgets, goals) are excluded to avoid distracting users
export const AD_ENABLED_PAGES = [
  "/dashboard",
  "/investments",
  "/assets",
  "/subscriptions",
  "/learn",
  "/insights",
  "/deals",
] as const

export function isAdEnabledPage(pathname: string): boolean {
  return AD_ENABLED_PAGES.some((p) => pathname === p || pathname.startsWith(p + "/"))
}

// Default ad dimensions per position
export const AD_DIMENSIONS = {
  "in-content-leaderboard": { width: 728, height: 90 },
  "in-content-rectangle": { width: 300, height: 250 },
  "sticky-mobile": { width: 320, height: 50 },
  "sticky-desktop": { width: 728, height: 90 },
} as const
