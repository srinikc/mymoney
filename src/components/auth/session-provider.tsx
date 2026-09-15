"use client"

import { SessionProvider as NextAuthSessionProvider, useSession } from "next-auth/react"
import { usePathname } from "next/navigation"
import { useEffect } from "react"
import type { ReactNode } from "react"

function SessionExpiryWatcher() {
  const { status } = useSession()
  const pathname = usePathname()

  useEffect(() => {
    if (status !== "unauthenticated") return

    // Public pages must never redirect (login/setup and auth/API routes).
    // Middleware already guarantees a session cookie exists for any protected
    // page that renders, so reaching "unauthenticated" here means the cookie
    // is invalid/expired (server restart, idle timeout, or maxAge reached).
    // Redirecting on fresh loads with a stale cookie fixes the dead-end
    // "Failed to load dashboard data" state where data APIs return 401 but
    // the page never sent the user back to login.
    const isPublic =
      pathname === "/login" ||
      pathname === "/setup" ||
      pathname.startsWith("/api/")

    if (isPublic) return

    const callbackUrl = pathname + (window.location.search || "")
    window.location.href = `/login?callbackUrl=${encodeURIComponent(callbackUrl)}`
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