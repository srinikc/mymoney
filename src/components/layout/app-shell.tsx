"use client"

import { Sidebar } from "./sidebar"
import { useUIStore } from "@/lib/store"
import { useSession, signOut } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Menu, LogOut, User, Moon, Sun, HelpCircle, Settings as SettingsIcon } from "lucide-react"
import { useTheme } from "next-themes"
import { useEffect, useState } from "react"
import { usePathname } from "next/navigation"
import Link from "next/link"
import { HelpDrawer } from "@/components/help/HelpDrawer"
import { getHelpForPath } from "@/components/help/help-content"
import type { HelpSection } from "@/components/help/help-content"

const FALLBACK_HELP: HelpSection = {
  title: "Help",
  summary: "Help and guidance for this page.",
  details: "This page helps you manage your financial data. Use the buttons and controls to view, add, edit, or delete information.",
  workflow: [
    { step: "Explore the page", description: "Use the buttons, filters, and controls to interact with your data." },
    { step: "Need more help?", description: "Check the User Guide at /guide for detailed documentation." },
  ],
  relatedFeatures: [
    { name: "User Guide", description: "Comprehensive guide to all MyMoney features." },
  ],
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const { sidebarOpen, setMobileSidebarOpen } = useUIStore()
  const { data: session } = useSession()
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const [helpOpen, setHelpOpen] = useState(false)

  useEffect(() => setMounted(true), [])

  if (["/login", "/setup"].includes(pathname)) {
    return <div className="min-h-screen bg-background">{children}</div>
  }

  const helpSection = getHelpForPath(pathname) || FALLBACK_HELP

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <main
        id="main-content"
        className={`transition-all duration-300 ${sidebarOpen ? "lg:ml-64 ml-0" : "lg:ml-16 ml-0"}`}
      >
        <header className="flex items-center justify-between gap-3 border-b px-4 lg:px-6 py-2">
          <Button
            variant="ghost"
            size="sm"
            className="lg:hidden"
            onClick={() => setMobileSidebarOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-1 ml-auto">
            <Link
              href="/settings"
              className="h-8 w-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors flex items-center justify-center"
              title="Settings"
            >
              <SettingsIcon className="h-4 w-4" />
            </Link>
            <button
              onClick={() => setHelpOpen(true)}
              className="h-8 w-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors flex items-center justify-center"
              title="Help"
            >
              <HelpCircle className="h-4 w-4" />
            </button>
            <button
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="h-8 w-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors flex items-center justify-center"
            >
              {mounted && theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <User className="h-4 w-4" />
              <span className="hidden sm:inline">{session?.user?.name || session?.user?.email || "User"}</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="text-muted-foreground hover:text-foreground"
            >
              <LogOut className="h-4 w-4 mr-1" />
              <span className="hidden sm:inline">Logout</span>
            </Button>
          </div>
        </header>
        <div className="container mx-auto p-4 lg:p-8">{children}</div>
      </main>
      {helpOpen && (
        <HelpDrawer
          section={helpSection}
          path={pathname}
          onClose={() => setHelpOpen(false)}
        />
      )}
    </div>
  )
}
