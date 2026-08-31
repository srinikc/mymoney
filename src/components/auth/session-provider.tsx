"use client"

import { SessionProvider as NextAuthSessionProvider, useSession } from "next-auth/react"
import { usePathname } from "next/navigation"
import { useEffect, useRef } from "react"
import type { ReactNode } from "react"

function SessionExpiryWatcher() {
  const { status } = useSession()
  const pathname = usePathname()
  const wasAuthenticated = useRef(false)

  useEffect(() => {
    if (status === "authenticated") {
      wasAuthenticated.current = true
      return
    }
    // Only redirect when a previously-valid session has expired.
    // A fresh page load with no session (status "loading" -> "unauthenticated")
    // is handled by middleware and must NOT trigger a redirect loop.
    if (status === "unauthenticated" && wasAuthenticated.current) {
      const callbackUrl = pathname + (window.location.search || "")
      window.location.href = `/login?callbackUrl=${encodeURIComponent(callbackUrl)}`
    }
  }, [status, pathname])

  return null
}

export function SessionProvider({ children }: { children: ReactNode }) {
  return (
    <NextAuthSessionProvider refetchInterval={5 * 60} refetchOnWindowFocus={false}>
      <SessionExpiryWatcher />
      {children}
    </NextAuthSessionProvider>
  )
}