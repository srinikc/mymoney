"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { X, ChevronRight, ChevronLeft } from "lucide-react"

const TUTORIAL_STEPS = [
  {
    title: "Welcome to MyMoney!",
    description: "This is your Dashboard — your financial command center. All your money insights in one place.",
    icon: "👋",
  },
  {
    title: "Your KPIs at a Glance",
    description: "Here are your Key Performance Indicators — total spent, this month's expenses, average, and budgets. Keep an eye on these!",
    icon: "📊",
  },
  {
    title: "Spending Trends & Charts",
    description: "The charts show your spending trends over time and top spending categories. Use them to spot patterns.",
    icon: "📈",
  },
  {
    title: "Manage Your Expenses",
    description: "Click any expense to edit, or use the sidebar to explore budgets, goals, investments, and more.",
    icon: "✏️",
  },
  {
    title: "Need Help?",
    description: "Click the chat icon for MyMoney AI! Ask questions about your finances, get tips, and more.",
    icon: "💬",
  },
]

export function TutorialOverlay() {
  const [isOpen, setIsOpen] = useState(false)
  const [currentStep, setCurrentStep] = useState(0)

  useEffect(() => {
    // Check if tutorial has been shown before
    const shown = localStorage.getItem("mymoney-tutorial-shown")
    if (shown !== "true") {
      // Delay showing the tutorial slightly
      const timer = setTimeout(() => setIsOpen(true), 1000)
      return () => clearTimeout(timer)
    }
  }, [])

  const handleDismiss = () => {
    localStorage.setItem("mymoney-tutorial-shown", "true")
    setIsOpen(false)
  }

  const handleNext = () => {
    if (currentStep < TUTORIAL_STEPS.length - 1) {
      setCurrentStep((prev) => prev + 1)
    } else {
      handleDismiss()
    }
  }

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1)
    }
  }

  if (!isOpen) return null

  const step = TUTORIAL_STEPS[currentStep]
  const progress = ((currentStep + 1) / TUTORIAL_STEPS.length) * 100

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <Card className="mx-4 w-full max-w-md shadow-2xl">
        <CardHeader className="relative">
          <button
            onClick={handleDismiss}
            className="absolute right-4 top-4 rounded-sm opacity-70 transition-opacity hover:opacity-100"
          >
            <X className="h-4 w-4" />
          </button>
          <div className="flex items-center gap-3">
            <span className="text-3xl">{step.icon}</span>
            <div>
              <CardTitle className="text-lg">{step.title}</CardTitle>
              <Progress value={progress} className="mt-2 h-1.5" />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground leading-relaxed">{step.description}</p>
        </CardContent>
        <CardFooter className="flex items-center justify-between">
          <div className="flex gap-1">
            {TUTORIAL_STEPS.map((_, i) => (
              <div
                key={i}
                className={`h-1.5 w-1.5 rounded-full transition-colors ${
                  i === currentStep ? "bg-primary" : "bg-muted"
                }`}
              />
            ))}
          </div>
          <div className="flex gap-2">
            {currentStep > 0 && (
              <Button variant="outline" size="sm" onClick={handlePrev}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={handleDismiss}>
              Skip
            </Button>
            <Button size="sm" onClick={handleNext}>
              {currentStep < TUTORIAL_STEPS.length - 1 ? (
                <>
                  Next <ChevronRight className="ml-1 h-4 w-4" />
                </>
              ) : (
                "Got it!"
              )}
            </Button>
          </div>
        </CardFooter>
      </Card>
    </div>
  )
}
