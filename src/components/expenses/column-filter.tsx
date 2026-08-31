"use client"

import { useState } from "react"
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover"
import { Input } from "@/components/ui/input"
import { MultiSelect, MultiSelectOption } from "@/components/ui/multi-select"

interface ColumnFilterProps {
  label: string
  /** Type of filter control */
  type: "multiselect" | "amount" | "daterange" | "multiselect-with-mode" | "text"
  /** Options for multiselect filters */
  options?: MultiSelectOption[]
  /** Current selected values */
  value: string[]
  /** Called when selection changes */
  onChange: (vals: string[]) => void
  /** For text filter */
  textValue?: string
  onTextChange?: (val: string) => void
  /** Show (Blank) option for null/empty values */
  showBlankOption?: boolean
  /** For amount filter */
  amountMin?: string
  amountMax?: string
  onAmountMinChange?: (val: string) => void
  onAmountMaxChange?: (val: string) => void
  /** For date range filter */
  dateFrom?: string
  dateTo?: string
  onDateFromChange?: (val: string) => void
  onDateToChange?: (val: string) => void
  /** For multiselect-with-mode */
  mode?: "contains" | "not-contains"
  onModeToggle?: () => void
  /** Sort props (optional) */
  sortField?: string
  currentSort?: string
  sortDir?: "asc" | "desc"
  onSort?: () => void
  /** Number of rows matching this filter (for badge display) */
  matchCount?: number
}

export function ColumnFilter({
  label,
  type,
  options = [],
  value,
  onChange,
  amountMin,
  amountMax,
  onAmountMinChange,
  onAmountMaxChange,
  dateFrom,
  dateTo,
  onDateFromChange,
  onDateToChange,
  textValue,
  onTextChange,
  mode,
  onModeToggle,
  showBlankOption = false,
  sortField,
  currentSort,
  sortDir,
  onSort,
  matchCount,
}: ColumnFilterProps) {
  const [open, setOpen] = useState(false)
  const hasSelection = value.length > 0 || (type === "amount" && (amountMin || amountMax)) || (type === "daterange" && (dateFrom || dateTo)) || (type === "text" && !!textValue)

  const badgeLabel = (() => {
    if (!hasSelection) return null
    if (matchCount != null) return String(matchCount)
    if (type === "amount" || type === "daterange" || type === "text") return "!"
    return String(value.length)
  })()

  return (
    <th className="px-1.5 py-1 select-none text-[10px] font-medium text-muted-foreground">
      <div className="flex items-center gap-0.5">
        <span
          className={`cursor-pointer hover:text-foreground ${sortField && onSort ? "cursor-pointer" : ""}`}
          onClick={() => { if (sortField && onSort) onSort() }}
        >
          {label}
        </span>
        {sortField && (
          <svg
            className={`h-2.5 w-2.5 cursor-pointer hover:text-foreground ${currentSort === sortField ? (sortDir === "desc" ? "rotate-180" : "text-foreground") : "text-muted-foreground/50"}`}
            viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
            onClick={() => { if (onSort) onSort() }}
          >
            <path d="M12 5v14M5 12l7 7 7-7" />
          </svg>
        )}
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <span
              className="inline-flex items-center justify-center h-3.5 w-3.5 rounded cursor-pointer hover:bg-muted text-muted-foreground/50 hover:text-foreground"
              data-testid={`filter-btn-${label}`}
            >
              {hasSelection ? (
                <span className="inline-flex items-center justify-center h-3.5 min-w-3.5 rounded-full bg-primary/20 text-[8px] font-bold px-1 text-primary -mt-0.5">
                  {badgeLabel}
                </span>
              ) : (
                <svg className="h-2.5 w-2.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M22 3H2l8 9.46V19l4 2v-8.54L22 3z" />
                </svg>
              )}
            </span>
          </PopoverTrigger>
          <PopoverContent className="w-56 p-2" align="start">
            {type === "multiselect" || type === "multiselect-with-mode" ? (
              <div className="space-y-2">
                <MultiSelect
                  label={label}
                  options={options}
                  selected={value}
                  onChange={onChange}
                  placeholder={`Filter ${label}`}
                  showBlankOption={showBlankOption}
                />
                {type === "multiselect-with-mode" && onModeToggle && (
                  <button
                    className="text-[10px] text-muted-foreground hover:text-foreground underline"
                    onClick={onModeToggle}
                  >
                    Mode: {mode === "contains" ? "Contains" : "Not Contains"}
                  </button>
                )}
              </div>
            ) : type === "amount" ? (
              <div className="space-y-2">
                <div className="flex items-center gap-1">
                  <Input
                    type="number"
                    placeholder="Min"
                    aria-label="Amount-min"
                    className="h-7 text-xs"
                    value={amountMin || ""}
                    onChange={(e) => onAmountMinChange?.(e.target.value)}
                  />
                  <span className="text-[10px] text-muted-foreground">—</span>
                  <Input
                    type="number"
                    placeholder="Max"
                    aria-label="Amount-max"
                    className="h-7 text-xs"
                    value={amountMax || ""}
                    onChange={(e) => onAmountMaxChange?.(e.target.value)}
                  />
                </div>
              </div>
            ) : type === "daterange" ? (
              <div className="space-y-2">
                <div className="flex items-center gap-1">
                  <input type="date" className="h-7 text-xs px-1 rounded border border-input bg-transparent w-full focus:outline-none focus:ring-1 focus:ring-primary"
                    value={dateFrom || ""}
                    onChange={(e) => onDateFromChange?.(e.target.value)}
                    aria-label="Date-from"
                  />
                  <span className="text-[10px] text-muted-foreground">—</span>
                  <input type="date" className="h-7 text-xs px-1 rounded border border-input bg-transparent w-full focus:outline-none focus:ring-1 focus:ring-primary"
                    value={dateTo || ""}
                    onChange={(e) => onDateToChange?.(e.target.value)}
                    aria-label="Date-to"
                  />
                </div>
              </div>
            ) : type === "text" ? (
              <div className="space-y-2">
                <Input
                  type="text"
                  placeholder={`Search ${label}`}
                  className="h-7 text-xs"
                  value={textValue || ""}
                  onChange={(e) => onTextChange?.(e.target.value)}
                />
              </div>
            ) : null}
          </PopoverContent>
        </Popover>
      </div>
    </th>
  )
}
