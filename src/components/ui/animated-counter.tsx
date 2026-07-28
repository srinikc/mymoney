"use client"

import { useEffect, useRef, useState } from "react"

export interface AnimatedCounterProps {
  value: number
  format?: (n: number) => string
  duration?: number
  delay?: number
}

export function AnimatedCounter({
  value,
  format,
  duration = 1.5,
  delay = 0,
}: AnimatedCounterProps) {
  const [displayValue, setDisplayValue] = useState(value)
  const startTimeRef = useRef<number | null>(null)
  const rafRef = useRef<number>(0)

  useEffect(() => {
    setDisplayValue(0)
    startTimeRef.current = null

    const timeoutId = window.setTimeout(() => {
      startTimeRef.current = null

      const animate = (timestamp: number) => {
        if (startTimeRef.current === null) {
          startTimeRef.current = timestamp
        }

        const elapsed = timestamp - startTimeRef.current
        const progress = Math.min(elapsed / (duration * 1000), 1)
        const eased = 1 - Math.pow(1 - progress, 3)

        setDisplayValue(eased * value)

        if (progress < 1) {
          rafRef.current = requestAnimationFrame(animate)
        } else {
          setDisplayValue(value)
        }
      }

      rafRef.current = requestAnimationFrame(animate)
    }, delay * 1000)

    return () => {
      clearTimeout(timeoutId)
      cancelAnimationFrame(rafRef.current)
    }
  }, [value, duration, delay])

  const formatter = format ?? ((n: number): string => n.toString())

  return <>{formatter(displayValue)}</>
}
