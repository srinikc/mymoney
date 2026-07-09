"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { Check, ChevronDown, X, Search } from "lucide-react"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"

export interface MultiSelectOption {
  label: string
  value: string
}

interface MultiSelectProps {
  options: MultiSelectOption[]
  selected: string[]
  onChange: (selected: string[]) => void
  placeholder?: string
  label?: string
  allowSelectAll?: boolean
  className?: string
  showSearch?: boolean
  /** For P3.6 — text-based filter mode toggle */
  showModeToggle?: boolean
  mode?: "contains" | "not-contains"
  onModeToggle?: () => void
  /** Show (Blank) option for null/empty values */
  showBlankOption?: boolean
  disabled?: boolean
}

export function MultiSelect({
  options,
  selected,
  onChange,
  placeholder = "Select...",
  label,
  allowSelectAll = true,
  className,
  showSearch = true,
  showModeToggle = false,
  mode = "contains",
  onModeToggle,
  showBlankOption = false,
  disabled = false,
}: MultiSelectProps) {
  const [open, setOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [focusedIdx, setFocusedIdx] = useState(-1)
  const containerRef = useRef<HTMLDivElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  // Build filtered option list including (Blank)
  const allOptions = showBlankOption
    ? [{ label: "(Blank)", value: "__blank__" }, ...options]
    : options

  const filteredOptions = allOptions.filter((opt) =>
    opt.label.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // Close on click away
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside)
    }
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [open])

  // Reset search and focus on open
  useEffect(() => {
    if (open) {
      setSearchQuery("")
      setFocusedIdx(-1)
      setTimeout(() => searchInputRef.current?.focus(), 50)
    }
  }, [open])

  // Scroll focused item into view
  useEffect(() => {
    if (focusedIdx >= 0 && listRef.current) {
      const items = listRef.current.querySelectorAll<HTMLElement>("[data-option-index]")
      items[focusedIdx]?.scrollIntoView({ block: "nearest" })
    }
  }, [focusedIdx])

  const isSelected = useCallback(
    (value: string) => selected.includes(value),
    [selected]
  )

  const toggleOption = (value: string) => {
    if (isSelected(value)) {
      onChange(selected.filter((v) => v !== value))
    } else {
      onChange([...selected, value])
    }
  }

  const handleSelectAll = () => {
    if (selected.length === allOptions.length) {
      onChange([])
    } else {
      onChange(allOptions.map((o) => o.value))
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!open) {
      if (e.key === "Enter" || e.key === "ArrowDown") {
        setOpen(true)
        e.preventDefault()
      }
      return
    }

    switch (e.key) {
      case "ArrowDown": {
        e.preventDefault()
        setFocusedIdx((prev) => Math.min(prev + 1, filteredOptions.length - 1))
        break
      }
      case "ArrowUp": {
        e.preventDefault()
        setFocusedIdx((prev) => Math.max(prev - 1, 0))
        break
      }
      case "Enter": {
        e.preventDefault()
        if (focusedIdx >= 0 && focusedIdx < filteredOptions.length) {
          toggleOption(filteredOptions[focusedIdx].value)
        }
        break
      }
      case "Escape": {
        e.preventDefault()
        setOpen(false)
        break
      }
      case " ": {
        e.preventDefault()
        if (focusedIdx >= 0 && focusedIdx < filteredOptions.length) {
          toggleOption(filteredOptions[focusedIdx].value)
        }
        break
      }
    }
  }

  const handleRemove = (value: string) => {
    onChange(selected.filter((v) => v !== value))
  }

  const testId = label ? `multi-select-${label.toLowerCase().replaceAll(/\s+/g, "-")}` : undefined

  return (
    <div ref={containerRef} className={cn("relative", className)} data-testid={testId}>
      {/* Trigger button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen(!open)}
        onKeyDown={handleKeyDown}
        className={cn(
          "flex h-9 w-full items-center justify-between rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-sm",
          "ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          "disabled:cursor-not-allowed disabled:opacity-50 hover:bg-accent/50 transition-colors",
          open && "ring-2 ring-ring"
        )}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={label || placeholder}
      >
        <div className="flex items-center gap-1.5 flex-1 min-w-0">
          {selected.length === 0 ? (
            <span className="text-muted-foreground truncate">{placeholder}</span>
          ) : (
            <div className="flex items-center gap-1 flex-wrap">
              {selected.length <= 2 ? (
                selected.map((v) => {
                  const opt = allOptions.find((o) => o.value === v)
                  return (
                    <Badge
                      key={v}
                      variant="secondary"
                      className="text-[10px] px-1.5 py-0 gap-0.5 max-w-[80px]"
                    >
                      <span className="truncate">{opt?.label || v}</span>
                      <span
                        role="button"
                        tabIndex={0}
                        onClick={(e) => {
                          e.stopPropagation()
                          handleRemove(v)
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.stopPropagation()
                            handleRemove(v)
                          }
                        }}
                        className="ml-0.5 hover:text-foreground shrink-0 cursor-pointer"
                        aria-label={`Remove ${opt?.label || v}`}
                      >
                        <X className="h-2.5 w-2.5" />
                      </span>
                    </Badge>
                  )
                })
              ) : (
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                  {selected.length} selected
                </Badge>
              )}
            </div>
          )}
        </div>
        <ChevronDown className={cn("h-4 w-4 opacity-50 shrink-0 ml-1 transition-transform", open && "rotate-180")} />
      </button>

      {/* Dropdown */}
      {open && (
        <div
          className="absolute z-50 mt-1 w-full min-w-[200px] rounded-lg border bg-popover text-popover-foreground shadow-md"
          onKeyDown={handleKeyDown}
        >
          {/* Mode toggle (P3.6) */}
          {showModeToggle && (
            <div className="flex items-center gap-1 px-2 pt-1.5 pb-1 border-b">
              <button
                type="button"
                onClick={onModeToggle}
                className={cn(
                  "flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded transition-colors",
                  mode === "contains"
                    ? "bg-primary/10 text-primary"
                    : "bg-destructive/10 text-destructive"
                )}
                title={mode === "contains" ? "Currently: Contains — click to toggle" : "Currently: Does Not Contain — click to toggle"}
              >
                {mode === "contains" ? (
                  <><span className="font-mono text-xs">~=</span> Contains</>
                ) : (
                  <><span className="font-mono text-xs">!=</span> Not</>
                )}
              </button>
            </div>
          )}

          {/* Search input */}
          {showSearch && (
            <div className="p-1.5 border-b">
              <div className="relative">
                <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  ref={searchInputRef}
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value)
                    setFocusedIdx(-1)
                  }}
                  className="h-8 pl-7 text-xs"
                  onKeyDown={handleKeyDown}
                />
              </div>
            </div>
          )}

          {/* Select All / Clear All */}
          {allowSelectAll && (
            <div className="px-1.5 py-1 border-b">
              <button
                type="button"
                onClick={handleSelectAll}
                className="flex w-full items-center gap-2 rounded-md px-2 py-1 text-xs font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
              >
                {selected.length === allOptions.length ? (
                  <X className="h-3.5 w-3.5" />
                ) : (
                  <Check className="h-3.5 w-3.5" />
                )}
                {selected.length === allOptions.length ? "Clear All" : "Select All"}
              </button>
            </div>
          )}

          {/* Options list */}
          <div
            ref={listRef}
            className="max-h-48 overflow-y-auto py-1 scrollbar-hide"
            role="listbox"
            aria-multiselectable="true"
          >
            {filteredOptions.length === 0 ? (
              <div className="px-3 py-4 text-center text-xs text-muted-foreground">
                No options found
              </div>
            ) : (
              filteredOptions.map((opt, idx) => {
                const selected = isSelected(opt.value)
                return (
                  <div
                    key={opt.value}
                    data-option-index={idx}
                    role="option"
                    aria-selected={selected}
                    className={cn(
                      "flex items-center gap-2 px-3 py-1.5 text-sm cursor-pointer transition-colors",
                      "hover:bg-accent hover:text-accent-foreground",
                      focusedIdx === idx && "bg-accent text-accent-foreground",
                      selected && "bg-primary/5"
                    )}
                    onClick={() => toggleOption(opt.value)}
                    onMouseEnter={() => setFocusedIdx(idx)}
                  >
                    <div
                      className={cn(
                        "flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors",
                        selected
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-input"
                      )}
                    >
                      {selected && <Check className="h-3 w-3" />}
                    </div>
                    <span className="truncate">{opt.label}</span>
                  </div>
                )
              })
            )}
          </div>
        </div>
      )}
    </div>
  )
}
