"use client"

import { motion } from "motion/react"
import { Card, CardContent } from "@/components/ui/card"

interface HealthMetric {
  label: string
  value: number
}

interface HealthGaugeProps {
  score: number
  metrics: HealthMetric[]
}

function getScoreColor(score: number): string {
  if (score < 40) return "#ef4444" // red
  if (score < 70) return "#f59e0b" // amber
  return "#22c55e" // green
}

function getScoreLabel(score: number): string {
  if (score < 40) return "Needs Attention"
  if (score < 70) return "Fair"
  return "Good"
}

function getMetricColor(value: number): string {
  if (value < 40) return "text-red-500"
  if (value < 70) return "text-amber-500"
  return "text-emerald-500"
}

export function HealthGauge({ score, metrics }: HealthGaugeProps) {
  const clampedScore = Math.min(100, Math.max(0, score))
  const circumference = 2 * Math.PI * 60 // r = 60
  const filledLength = (clampedScore / 100) * circumference
  const color = getScoreColor(clampedScore)

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-6">
        <div className="flex flex-col items-center gap-6 md:flex-row md:items-start">
          {/* Gauge */}
          <div className="relative flex shrink-0 items-center justify-center">
            <svg width="160" height="160" viewBox="0 0 160 160">
              {/* Background circle */}
              <circle
                cx="80"
                cy="80"
                r="60"
                fill="none"
                stroke="hsl(var(--muted))"
                strokeWidth="10"
              />
              {/* Filled arc - animated */}
              <motion.circle
                cx="80"
                cy="80"
                r="60"
                fill="none"
                stroke={color}
                strokeWidth="10"
                strokeLinecap="round"
                strokeDasharray={circumference}
                initial={{ strokeDashoffset: circumference }}
                animate={{ strokeDashoffset: circumference - filledLength }}
                transition={{ duration: 1.2, ease: "easeOut", delay: 0.2 }}
                transform="rotate(-90 80 80)"
              />
            </svg>
            {/* Score in center */}
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <motion.span
                className="text-3xl font-bold"
                style={{ color }}
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, delay: 0.6, ease: "easeOut" }}
              >
                {clampedScore}
              </motion.span>
              <span className="text-xs text-muted-foreground">/100</span>
            </div>
          </div>

          {/* Metrics */}
          <div className="flex-1 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Financial Health Score</h3>
              <span
                className="rounded-full px-3 py-0.5 text-xs font-medium text-white"
                style={{ backgroundColor: color }}
              >
                {getScoreLabel(clampedScore)}
              </span>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {metrics.map((metric) => (
                <div key={metric.label} className="rounded-lg border bg-card p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">{metric.label}</span>
                    <span className={`text-sm font-semibold ${getMetricColor(metric.value)}`}>
                      {Math.round(metric.value)}%
                    </span>
                  </div>
                  <div className="mt-1.5 h-1.5 w-full rounded-full bg-secondary">
                    <motion.div
                      className="h-1.5 rounded-full"
                      style={{ backgroundColor: getScoreColor(metric.value) }}
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min(100, Math.max(0, metric.value))}%` }}
                      transition={{ duration: 0.8, delay: 0.3, ease: "easeOut" }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
