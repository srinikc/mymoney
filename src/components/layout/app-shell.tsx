"use client"

import { Sidebar } from "./sidebar"
import { useUIStore } from "@/lib/store"
import { useSession, signOut } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Menu, LogOut, User, Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"
import { useEffect, useState } from "react"
import { HelpButton } from "@/components/help/HelpButton"

export function AppShell({ children }: { children: React.ReactNode }) {
  const { sidebarOpen, setMobileSidebarOpen } = useUIStore()
  const { data: session } = useSession()
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => setMounted(true), [])

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
          <div className="flex items-center gap-3 ml-auto">
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
      <HelpButton />
    </div>
  )
}
