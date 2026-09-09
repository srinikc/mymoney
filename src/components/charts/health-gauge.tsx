"use client"

import { useState } from "react"
import Link from "next/link"
import { motion, AnimatePresence } from "motion/react"
import { Card, CardContent } from "@/components/ui/card"
import { ChevronDown, ChevronRight, TrendingUp, TrendingDown, Target, Lightbulb } from "lucide-react"

interface HealthMetric {
  label: string
  value: number | null
  weight: number
  target: number
  targetLabel: string
  description: string
  tips: string[]
  link?: { href: string; label: string }
}

interface HealthGaugeProps {
  score: number
  metrics?: HealthMetric[]
  variant?: "compact" | "full"
}

function getScoreColor(score: number): string {
  if (score < 40) return "#ef4444"
  if (score < 70) return "#f59e0b"
  return "#22c55e"
}

function getScoreLabel(score: number): string {
  if (score < 40) return "Needs Attention"
  if (score < 70) return "Fair"
  return "Good"
}

function getScoreAdvice(score: number): string {
  if (score < 40) return "Your finances need work. Focus on the lowest-scoring areas below."
  if (score < 70) return "You're on the right track. A few improvements could make a big difference."
  return "Great job! Keep maintaining these habits."
}

function getMetricColor(value: number | null): string {
  if (value === null) return "text-muted-foreground"
  if (value < 40) return "text-red-500"
  if (value < 70) return "text-amber-500"
  return "text-emerald-500"
}

function getMetricStatus(value: number | null, target: number): string {
  if (value === null) return "Not set"
  if (value >= target) return "On track"
  if (value >= target * 0.7) return "Almost there"
  return "Needs work"
}

function MetricRow({ metric, isOpen, onToggle }: { metric: HealthMetric; isOpen: boolean; onToggle: () => void }) {
  const color = getMetricColor(metric.value)
  const status = getMetricStatus(metric.value, metric.target)
  const pct = metric.value !== null ? Math.min(100, Math.max(0, metric.value)) : 0

  return (
    <div className="rounded-lg border bg-card overflow-hidden">
      <button
        onClick={onToggle}
        className="flex w-full items-center justify-between p-3 hover:bg-muted/50 transition-colors text-left"
      >
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">{metric.label}</span>
              <span className="text-[10px] text-muted-foreground">({metric.weight}% of score)</span>
            </div>
            <div className="mt-1.5 h-1.5 w-full rounded-full bg-secondary">
              <motion.div
                className="h-1.5 rounded-full"
                style={{ backgroundColor: metric.value !== null ? getScoreColor(metric.value) : "#888" }}
                initial={{ width: 0 }}
                animate={{ width: `${pct}%` }}
                transition={{ duration: 0.8, delay: 0.3, ease: "easeOut" }}
              />
            </div>
          </div>
          <div className="text-right shrink-0 ml-3">
            <span className={`text-sm font-semibold ${color}`}>
              {metric.value !== null ? `${Math.round(metric.value)}%` : "—"}
            </span>
            <p className="text-[10px] text-muted-foreground mt-0.5">{status}</p>
          </div>
        </div>
        <div className="ml-2 shrink-0">
          {isOpen ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
        </div>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="border-t px-3 py-3 space-y-3 bg-muted/20">
              <p className="text-xs text-muted-foreground">{metric.description}</p>

              <div className="flex items-center gap-4 text-xs">
                <div className="flex items-center gap-1.5">
                  <Target className="h-3 w-3 text-primary" />
                  <span className="text-muted-foreground">Target:</span>
                  <span className="font-medium">{metric.targetLabel}</span>
                </div>
                {metric.value !== null && (
                  <div className="flex items-center gap-1.5">
                    {metric.value >= metric.target ? (
                      <TrendingUp className="h-3 w-3 text-emerald-500" />
                    ) : (
                      <TrendingDown className="h-3 w-3 text-red-500" />
                    )}
                    <span className="text-muted-foreground">Your score:</span>
                    <span className={`font-medium ${color}`}>{Math.round(metric.value)}%</span>
                  </div>
                )}
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5 text-xs font-medium">
                  <Lightbulb className="h-3 w-3 text-amber-500" />
                  How to improve
                </div>
                {metric.tips.map((tip, i) => (
                  <p key={i} className="text-xs text-muted-foreground pl-5">• {tip}</p>
                ))}
              </div>

              {metric.link && (
                <Link href={metric.link.href} className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
                  {metric.link.label} →
                </Link>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export function HealthGauge({ score, metrics = [], variant = "compact" }: HealthGaugeProps) {
  const [openMetric, setOpenMetric] = useState<string | null>(null)
  const clampedScore = Math.min(100, Math.max(0, score))
  const circumference = 2 * Math.PI * 60
  const filledLength = (clampedScore / 100) * circumference
  const color = getScoreColor(clampedScore)

  const isFull = variant === "full"

  return (
    <Card className="overflow-hidden">
      <CardContent className={isFull ? "p-6" : "p-4"}>
        <div className={`flex ${isFull ? "flex-col md:flex-row md:items-start" : "flex-col items-center"} gap-4`}>
          {/* Gauge */}
          <div className={`relative flex shrink-0 items-center justify-center ${isFull ? "" : "md:hidden"}`}>
            <svg width={isFull ? "160" : "100"} height={isFull ? "160" : "100"} viewBox="0 0 160 160">
              <circle cx="80" cy="80" r="60" fill="none" stroke="hsl(var(--muted))" strokeWidth="10" />
              <motion.circle
                cx="80" cy="80" r="60" fill="none" stroke={color} strokeWidth="10"
                strokeLinecap="round" strokeDasharray={circumference}
                initial={{ strokeDashoffset: circumference }}
                animate={{ strokeDashoffset: circumference - filledLength }}
                transition={{ duration: 1.2, ease: "easeOut", delay: 0.2 }}
                transform="rotate(-90 80 80)"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <motion.span
                className={isFull ? "text-3xl font-bold" : "text-lg font-bold"}
                style={{ color }}
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, delay: 0.6, ease: "easeOut" }}
              >
                {clampedScore}
              </motion.span>
              <span className="text-[10px] text-muted-foreground">/100</span>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 space-y-3 w-full">
            <div className="flex items-center justify-between">
              <h3 className={isFull ? "text-lg font-semibold" : "text-sm font-semibold"}>Financial Health Score</h3>
              <span
                className="rounded-full px-3 py-0.5 text-xs font-medium text-white"
                style={{ backgroundColor: color }}
              >
                {getScoreLabel(clampedScore)}
              </span>
            </div>

            {isFull && (
              <p className="text-xs text-muted-foreground">{getScoreAdvice(clampedScore)}</p>
            )}

            {/* Compact: mini score for inline display on Overview */}
            {!isFull && (
              <div className="flex items-center gap-3">
                <div className="flex-1 h-1.5 rounded-full bg-secondary">
                  <motion.div
                    className="h-1.5 rounded-full"
                    style={{ backgroundColor: color }}
                    initial={{ width: 0 }}
                    animate={{ width: `${clampedScore}%` }}
                    transition={{ duration: 0.8, delay: 0.3 }}
                  />
                </div>
                <Link href="#" className="text-[10px] text-primary hover:underline whitespace-nowrap">
                  Details →
                </Link>
              </div>
            )}

            {/* Full: expandable metric list */}
            {isFull && (
              <div className="space-y-2">
                {metrics.map((metric) => (
                  <MetricRow
                    key={metric.label}
                    metric={metric}
                    isOpen={openMetric === metric.label}
                    onToggle={() => setOpenMetric(openMetric === metric.label ? null : metric.label)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
