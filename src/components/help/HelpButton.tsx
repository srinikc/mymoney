"use client"

import { useState, useEffect } from "react"
import { usePathname } from "next/navigation"
import { HelpCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { HelpDrawer } from "./HelpDrawer"
import { getHelpForPath } from "./help-content"

export function HelpButton() {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (process.env.NODE_ENV === "development") {
      const section = getHelpForPath(pathname)
      if (!section) {
        console.warn(`[HelpContent] No help content for route "${pathname}". Add an entry in help-content.ts to prevent this warning.`)
      }
    }
  }, [pathname])

  const hideOnPaths = ["/login", "/setup"]
  if (hideOnPaths.includes(pathname)) return null

  const section = getHelpForPath(pathname)
  if (!section) return null

  return (
    <>
      <Button
        variant="outline"
        size="icon"
        className="fixed bottom-6 right-6 z-40 h-10 w-10 rounded-full shadow-lg"
        onClick={() => setOpen(true)}
        aria-label="Help — {section.title}"
        title={"Help: " + section.title}
      >
        <HelpCircle className="h-5 w-5" />
      </Button>

      {open && (
        <HelpDrawer
          section={section}
          path={pathname}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  )
}
