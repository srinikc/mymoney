import type { Metadata, Viewport } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import { Suspense } from "react"
import "./globals.css"
import { AppShell } from "@/components/layout/app-shell"
import { SessionProvider } from "@/components/auth/session-provider"
import { FloatingChat } from "@/components/chat/floating-chat"
import { ToastProvider } from "@/components/ui/toast-provider"
import { CookieConsent } from "@/components/ads/cookie-consent"
import { ThemeProvider } from "next-themes"
import SkipToContent from "@/components/layout/skip-to-content"

const geistSans = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
})

const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
})

export const metadata: Metadata = {
  title: "MyMoney - Personal Finance Manager",
  description: "Track expenses, budgets, goals, investments and more",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "MyMoney",
  },
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#6366f1",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="mobile-web-app-capable" content="yes" />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} font-sans antialiased`}>
        <SkipToContent />
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          <SessionProvider>
            <Suspense fallback={<div className="min-h-screen animate-pulse bg-muted" />}>
              <AppShell>{children}</AppShell>
              <FloatingChat />
            </Suspense>
            <ToastProvider />
            <CookieConsent />
          </SessionProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
