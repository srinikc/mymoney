"use client"

import { type ReactNode, useRef } from "react"
import { motion, useInView } from "motion/react"
import type { Variants } from "motion/react"
import { cn } from "@/lib/utils"

const cardVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
}

export interface AnimatedCardProps {
  children: ReactNode
  className?: string
  delay?: number
}

export function AnimatedCard({ children, className, delay = 0 }: AnimatedCardProps) {
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { once: true, margin: "-50px" })

  return (
    <motion.div
      ref={ref}
      className={cn("rounded-xl border bg-card text-card-foreground shadow-sm transition-shadow duration-200", className)}
      variants={cardVariants}
      initial="hidden"
      animate={isInView ? "visible" : "hidden"}
      transition={{ duration: 0.3, delay, ease: "easeOut" }}
      whileHover={{ scale: 1.02, boxShadow: "0 8px 30px rgba(0,0,0,0.12)", transition: { duration: 0.2, ease: "easeOut" } }}
    >
      {children}
    </motion.div>
  )
}
