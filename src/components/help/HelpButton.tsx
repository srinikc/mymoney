"use client"

import { useState } from "react"
import { usePathname } from "next/navigation"
import { HelpCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { HelpDrawer } from "./HelpDrawer"
import { getHelpForPath } from "./help-content"

export function HelpButton() {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)

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
