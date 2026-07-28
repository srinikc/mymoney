"use client"

import { useState, useEffect } from "react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Loader2 } from "lucide-react"

interface TransactionConfirmProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: string
  amount?: number
  actionLabel?: string
  onConfirm: () => Promise<void> | void
  delay?: number
}

export default function TransactionConfirm({
  open, onOpenChange, title, description, amount, actionLabel = "Confirm", onConfirm, delay = 1500,
}: TransactionConfirmProps) {
  const [countdown, setCountdown] = useState(delay)
  const [executing, setExecuting] = useState(false)
  const [confirmed, setConfirmed] = useState(false)

  useEffect(() => {
    if (!open) {
      setCountdown(delay)
      setConfirmed(false)
      setExecuting(false)
    }
  }, [open, delay])

  useEffect(() => {
    if (!confirmed || executing) return
    setExecuting(true)
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 100) {
          clearInterval(timer)
          onConfirm()
          return 0
        }
        return prev - 100
      })
    }, 100)
    return () => clearInterval(timer)
  }, [confirmed, executing, onConfirm])

  const handleConfirm = () => {
    setConfirmed(true)
  }

  const progress = (countdown / delay) * 100

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        {amount !== undefined && (
          <div className="text-2xl font-bold text-center py-4">
            ₹{amount.toLocaleString()}
          </div>
        )}
        {executing ? (
          <div className="space-y-3">
            <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
              <div className="bg-primary h-full rounded-full transition-all" style={{ width: `${100 - progress}%` }} />
            </div>
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Processing in {(countdown / 1000).toFixed(1)}s...
            </div>
          </div>
        ) : confirmed ? null : (
          <div className="text-sm text-muted-foreground text-center">
            Please review the details above before confirming.
          </div>
        )}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={executing}>Cancel</AlertDialogCancel>
          {!confirmed && !executing && (
            <AlertDialogAction onClick={handleConfirm} disabled={executing}>
              {actionLabel}
            </AlertDialogAction>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
