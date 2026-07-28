"use client"

import { useEffect, useRef } from "react"
import { X, ExternalLink, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import type { HelpSection } from "./help-content"

interface HelpDrawerProps {
  section: HelpSection
  path: string
  onClose: () => void
}

export function HelpDrawer({ section, path: _path, onClose }: HelpDrawerProps) {
  const drawerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    document.addEventListener("keydown", handleEscape)
    drawerRef.current?.focus()
    return () => document.removeEventListener("keydown", handleEscape)
  }, [onClose])

  useEffect(() => {
    document.body.style.overflow = "hidden"
    return () => { document.body.style.overflow = "" }
  }, [])

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div
        ref={drawerRef}
        tabIndex={0}
        className="relative ml-auto flex h-full w-full max-w-lg flex-col bg-background shadow-2xl animate-in slide-in-from-right duration-300"
      >
        <div className="flex items-center justify-between border-b px-6 py-4">
          <div className="flex items-center gap-2">
            <span className="text-lg font-semibold">{section.title}</span>
            <Badge variant="secondary" className="text-xs">Help</Badge>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close help">
            <X className="h-5 w-5" />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          <div className="space-y-6">
            <div>
              <p className="text-sm leading-relaxed text-muted-foreground">{section.summary}</p>
            </div>

            <div>
              <h3 className="mb-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">Overview</h3>
              <p className="text-sm leading-relaxed">{section.details}</p>
            </div>

            {section.controls && section.controls.length > 0 && (
              <div>
                <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">Buttons &amp; Controls</h3>
                <div className="space-y-2">
                  {section.controls.map((ctl, i) => (
                    <div key={i} className="rounded-lg border p-3">
                      <div className="flex items-start justify-between gap-2">
                        <code className="rounded bg-muted px-1.5 py-0.5 text-xs font-semibold">{ctl.name}</code>
                        {ctl.location && (
                          <Badge variant="outline" className="shrink-0 text-[10px]">{ctl.location}</Badge>
                        )}
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">{ctl.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {section.workflow && (
              <div>
                <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">How to Use</h3>
                <ol className="space-y-3">
                  {section.workflow.map((step, i) => (
                    <li key={i} className="flex gap-3">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                        {i + 1}
                      </span>
                      <div className="flex-1">
                        <p className="text-sm font-medium">{step.step}</p>
                        <p className="text-sm text-muted-foreground">{step.description}</p>
                        {step.example && (
                          <p className="mt-1 text-xs italic text-muted-foreground/70 border-l-2 border-muted pl-2">
                            Example: {step.example}
                          </p>
                        )}
                      </div>
                    </li>
                  ))}
                </ol>
              </div>
            )}

            {section.relatedFeatures && (
              <div>
                <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                  Related Features
                </h3>
                <div className="space-y-2">
                  {section.relatedFeatures.map((rel, i) => (
                    <div key={i} className="flex gap-2 rounded-lg border p-3">
                      <ArrowRight className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                      <div>
                        <p className="text-sm font-medium">{rel.name}</p>
                        <p className="text-xs text-muted-foreground">{rel.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="border-t px-6 py-4">
          <Button variant="outline" size="sm" className="w-full gap-2" asChild>
            <a href="/guide">
              <ExternalLink className="h-4 w-4" />
              View Full User Guide
            </a>
          </Button>
        </div>
      </div>
    </div>
  )
}
