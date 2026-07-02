"use client"

import { motion } from "motion/react"
import { cn } from "@/lib/utils"

interface ChartTooltipProps {
  active?: boolean
  payload?: { name?: string; value?: number; payload?: Record<string, unknown> }[]
  label?: string
  formatter?: (value: number) => string
  className?: string
}

export function ChartTooltip({ active, payload, label, formatter, className }: ChartTooltipProps) {
  if (!active || !payload?.length) return null

  return (
    <motion.div
      initial={{ opacity: 0, y: 4, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 4, scale: 0.95 }}
      transition={{ duration: 0.15, ease: "easeOut" }}
      className={cn(
        "rounded-lg border bg-popover px-3 py-2 text-xs shadow-md backdrop-blur-sm",
        className
      )}
    >
      {label && <p className="mb-1 font-medium text-muted-foreground">{label}</p>}
      {payload.map((entry, i) => (
        <p key={i} className="flex items-center gap-2">
          {entry.name && <span className="text-muted-foreground">{entry.name}:</span>}
          <span className="font-semibold">{formatter ? formatter(entry.value ?? 0) : entry.value}</span>
        </p>
      ))}
    </motion.div>
  )
}
