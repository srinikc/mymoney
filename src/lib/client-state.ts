"use client"

// Allow-listed cleanup on logout. Never use localStorage.clear() — it would
// also remove device-level preferences that should survive (cookie consent,
// tutorial-shown, sticky-ad-dismissed). Only per-user financial/app state is
// cleared here.

const STORAGE_KEYS_TO_CLEAR = [
  // GPay sync state (per-user, financial)
  "mymoney-gpay-known-files",
  "mymoney-gpay-last-sync",
  "mymoney-gpay-pending",
  // Legacy broker tokens that were previously stored client-side.
  // Current flow stores them server-side; this removes any stale leftovers.
  "zerodha_access_token",
  "sharekhan_access_token",
]

const SESSION_KEYS_TO_CLEAR = [
  // Chat history may contain financial information
  "mymoney-chat-history",
]

export function clearClientState(): void {
  if (typeof window === "undefined") return

  for (const key of STORAGE_KEYS_TO_CLEAR) {
    try { window.localStorage.removeItem(key) } catch { /* ignore */ }
  }

  for (const key of SESSION_KEYS_TO_CLEAR) {
    try { window.sessionStorage.removeItem(key) } catch { /* ignore */ }
  }

  // Reset the persisted active-profile selection so user A's profile choice
  // never leaks into user B's session on the same browser.
  try {
    const raw = window.localStorage.getItem("mymoney-ui-store")
    if (raw) {
      const parsed = JSON.parse(raw) as { state?: { activeProfileId?: number | null; activeProfileName?: string | null } }
      if (parsed?.state && (parsed.state.activeProfileId != null || parsed.state.activeProfileName != null)) {
        parsed.state.activeProfileId = null
        parsed.state.activeProfileName = null
        window.localStorage.setItem("mymoney-ui-store", JSON.stringify(parsed))
      }
    }
  } catch { /* ignore */ }
}