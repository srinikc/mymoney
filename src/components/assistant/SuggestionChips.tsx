// ── SuggestionChips ─────────────────────────────────────────────────────
// Context-aware prompt suggestions based on current page.

"use client"

import { Lightbulb } from "lucide-react"

interface SuggestionChipsProps {
  suggestions: string[]
  onSelect: (suggestion: string) => void
}

export function SuggestionChips({ suggestions, onSelect }: SuggestionChipsProps) {
  if (suggestions.length === 0) return null

  return (
    <div className="px-4 py-2">
      <div className="flex items-center gap-2 mb-2">
        <Lightbulb className="w-3 h-3 text-amber-500" />
        <span className="text-xs text-gray-500">Try asking</span>
      </div>
      <div className="flex flex-wrap gap-2">
        {suggestions.map((suggestion, index) => (
          <button
            key={index}
            onClick={() => onSelect(suggestion)}
            className="px-3 py-1.5 text-xs bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full transition-colors"
          >
            {suggestion}
          </button>
        ))}
      </div>
    </div>
  )
}
