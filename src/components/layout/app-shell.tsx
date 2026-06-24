"use client"

import { Sidebar } from "./sidebar"
import { useUIStore } from "@/lib/store"

export function AppShell({ children }: { children: React.ReactNode }) {
  const { sidebarOpen } = useUIStore()

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <main
        className={`transition-all duration-300 ${sidebarOpen ? "ml-64" : "ml-16"}`}
      >
        <div className="container mx-auto p-6 lg:p-8">{children}</div>
      </main>
    </div>
  )
}
