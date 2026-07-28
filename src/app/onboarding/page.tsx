"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  ArrowLeft,
  ArrowRight,
  SkipForward,
  Check,
  Sparkles,
  Banknote,
  Wallet,
  Target,
  Shield,
  LayoutDashboard,
  CheckCircle2,
} from "lucide-react"

const STEPS = [
  { title: "Welcome & Profile", icon: Sparkles },
  { title: "Connect Bank", icon: Banknote },
  { title: "Budgets", icon: Wallet },
  { title: "Goals", icon: Target },
  { title: "Risk Profile", icon: Shield },
  { title: "Done!", icon: CheckCircle2 },
]

const DEFAULT_CATEGORIES = [
  "Food & Dining",
  "Transportation",
  "Shopping",
  "Bills & Utilities",
  "Entertainment",
  "Groceries",
]

export default function OnboardingPage() {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState(0)
  const [loading, setLoading] = useState(true)
  const [completed, setCompleted] = useState(false)

  // Step 1: Profile
  const [name, setName] = useState("")
  const [currency, setCurrency] = useState("INR")
  const [selectedCategories, setSelectedCategories] = useState<string[]>(DEFAULT_CATEGORIES.slice(0, 4))

  // Step 3: Budgets
  const [budgets, setBudgets] = useState<Record<string, string>>({})

  // Step 4: Goals
  const [emergencyFund, setEmergencyFund] = useState("")
  const [savingsTarget, setSavingsTarget] = useState("")

  // Step 5: Risk profile
  const [riskScore] = useState<number | null>(null)

  useEffect(() => {
    // Check if onboarding already completed
    fetch("/api/onboarding/status")
      .then((r) => r.json())
      .then((data) => {
        if (data.completed) {
          setCompleted(true)
          router.push("/")
        } else {
          if (data.hasName) setName(data.hasName)
          setLoading(false)
        }
      })
      .catch(() => {
        setLoading(false)
      })
  }, [router])

  const toggleCategory = (cat: string) => {
    setSelectedCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    )
  }

  const handleNext = async () => {
    if (currentStep === 0) {
      // Save profile setup
      try {
        await fetch("/api/onboarding/complete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, currency, profileName: name || "Default" }),
        })
      } catch {
        // continue anyway
      }
    }

    if (currentStep === 2) {
      // Save budgets
      const budgetEntries = Object.entries(budgets).filter(([, v]) => v && Number.parseFloat(v) > 0)
      if (budgetEntries.length > 0) {
        try {
          const cats = await fetch("/api/categories").then((r) => r.json())
          for (const [catName, amount] of budgetEntries) {
            const cat = cats.find((c: { name: string; id: number }) => c.name === catName)
            if (cat) {
              await fetch("/api/budgets", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  categoryId: cat.id,
                  month: new Date().getMonth() + 1,
                  year: new Date().getFullYear(),
                  amount: Number.parseFloat(amount),
                }),
              })
            }
          }
        } catch {
          // continue
        }
      }
    }

    if (currentStep === 3) {
      // Save goals
      if (Number.parseFloat(emergencyFund) > 0) {
        try {
          await fetch("/api/goals", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name: "Emergency Fund",
              targetAmount: Number.parseFloat(emergencyFund),
              category: "emergency",
            }),
          })
        } catch {
          // continue
        }
      }
      if (Number.parseFloat(savingsTarget) > 0) {
        try {
          await fetch("/api/goals", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name: "Savings Target",
              targetAmount: Number.parseFloat(savingsTarget),
              category: "savings",
            }),
          })
        } catch {
          // continue
        }
      }
    }

    if (currentStep === 4) {
      // Risk profile questionnaire - redirect
      router.push("/risk-profile")
      return
    }

    if (currentStep === STEPS.length - 1) {
      // Done - trigger welcome and redirect
      try {
        await fetch("/api/onboarding/welcome", { method: "POST" })
      } catch {
        // continue
      }
      localStorage.setItem("mymoney-tutorial-shown", "false")
      router.push("/")
      return
    }

    setCurrentStep((prev) => Math.min(prev + 1, STEPS.length - 1))
  }

  const handleSkip = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep((prev) => prev + 1)
    }
  }

  const handleBack = () => {
    setCurrentStep((prev) => Math.max(0, prev - 1))
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <Sparkles className="mx-auto h-12 w-12 animate-pulse text-primary" />
          <p className="mt-4 text-muted-foreground">Setting things up...</p>
        </div>
      </div>
    )
  }

  if (completed) {
    return null
  }

  const progress = ((currentStep + 1) / STEPS.length) * 100
  const StepIcon = STEPS[currentStep].icon

  return (
    <div className="flex min-h-[80vh] items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        {/* Progress Bar */}
        <div className="mb-8">
          <div className="mb-2 flex items-center justify-between text-sm">
            <span className="font-medium text-muted-foreground">
              Step {currentStep + 1} of {STEPS.length}
            </span>
            <span className="text-muted-foreground">{STEPS[currentStep].title}</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        {/* Step Indicator */}
        <div className="mb-8 flex justify-between">
          {STEPS.map((step, i) => {
            const StepIconSmall = step.icon
            const isActive = i === currentStep
            const isCompleted = i < currentStep
            return (
              <div key={i} className="flex flex-col items-center gap-1">
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-full text-xs transition-all ${
                    isActive
                      ? "bg-primary text-primary-foreground ring-2 ring-primary/30"
                      : (isCompleted
                      ? "bg-primary/20 text-primary"
                      : "bg-muted text-muted-foreground")
                  }`}
                >
                  {isCompleted ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <StepIconSmall className="h-4 w-4" />
                  )}
                </div>
                <span
                  className={`text-[10px] hidden sm:block ${
                    isActive ? "font-medium text-primary" : "text-muted-foreground"
                  }`}
                >
                  {step.title}
                </span>
              </div>
            )
          })}
        </div>

        {/* Step Content */}
        <Card className="border-2">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <StepIcon className="h-5 w-5" />
              </div>
              <div>
                <CardTitle>{STEPS[currentStep].title}</CardTitle>
                <CardDescription>
                  {currentStep === 0 && "Set up your profile and preferences"}
                  {currentStep === 1 && "Connect your bank account or import data"}
                  {currentStep === 2 && "Set up monthly budgets for key categories"}
                  {currentStep === 3 && "Define your financial goals"}
                  {currentStep === 4 && "Complete the risk profiling questionnaire"}
                  {currentStep === 5 && "You're all set! Let's get started"}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Step 0: Welcome & Profile */}
            {currentStep === 0 && (
              <>
                <div>
                  <label className="text-sm font-medium">Your Name</label>
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter your name"
                    className="mt-1"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Currency</label>
                  <Select value={currency} onValueChange={setCurrency}>
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="INR">INR (₹)</SelectItem>
                      <SelectItem value="USD">USD ($)</SelectItem>
                      <SelectItem value="EUR">EUR (€)</SelectItem>
                      <SelectItem value="GBP">GBP (£)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium">Default Categories</label>
                  <p className="mb-2 text-xs text-muted-foreground">
                    Select categories you want to track by default
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {DEFAULT_CATEGORIES.map((cat) => (
                      <Badge
                        key={cat}
                        variant={selectedCategories.includes(cat) ? "default" : "outline"}
                        className="cursor-pointer"
                        onClick={() => toggleCategory(cat)}
                      >
                        {cat}
                      </Badge>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* Step 1: Connect Bank */}
            {currentStep === 1 && (
              <div className="space-y-4">
                <div className="rounded-lg border border-dashed p-8 text-center">
                  <Banknote className="mx-auto h-12 w-12 text-muted-foreground" />
                  <p className="mt-4 text-sm text-muted-foreground">
                    Upload your bank statement (CSV or PDF) to automatically import your expenses.
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    You can also skip this step and set up later.
                  </p>
                  <div className="mt-4 flex justify-center gap-3">
                    <Button variant="outline" onClick={() => router.push("/expenses/import")}>
                      Upload Statement
                    </Button>
                  </div>
                </div>
                <div className="rounded-lg bg-muted/50 p-4">
                  <p className="text-xs text-muted-foreground">
                    <strong>Supported formats:</strong> CSV (HDFC, ICICI, SBI, Axis), PDF bank
                    statements, GPay transaction history, and more.
                  </p>
                </div>
              </div>
            )}

            {/* Step 2: Budgets */}
            {currentStep === 2 && (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Set monthly budgets for your top spending categories (optional)
                </p>
                {selectedCategories.map((cat) => (
                  <div key={cat} className="flex items-center gap-3">
                    <span className="w-40 text-sm font-medium">{cat}</span>
                    <Input
                      type="number"
                      placeholder="Amount (₹)"
                      value={budgets[cat] || ""}
                      onChange={(e) =>
                        setBudgets((prev) => ({ ...prev, [cat]: e.target.value }))
                      }
                      className="flex-1"
                    />
                  </div>
                ))}
                {selectedCategories.length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    No categories selected. Go back to step 1 to select categories.
                  </p>
                )}
              </div>
            )}

            {/* Step 3: Goals */}
            {currentStep === 3 && (
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Emergency Fund Target</label>
                  <p className="text-xs text-muted-foreground">
                    Aim for 3-6 months of living expenses
                  </p>
                  <Input
                    type="number"
                    placeholder="e.g., 100000"
                    value={emergencyFund}
                    onChange={(e) => setEmergencyFund(e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Savings Target</label>
                  <p className="text-xs text-muted-foreground">
                    Set a savings goal for the year
                  </p>
                  <Input
                    type="number"
                    placeholder="e.g., 50000"
                    value={savingsTarget}
                    onChange={(e) => setSavingsTarget(e.target.value)}
                    className="mt-1"
                  />
                </div>
              </div>
            )}

            {/* Step 4: Risk Profile */}
            {currentStep === 4 && (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Take a quick risk profiling questionnaire to get personalized investment
                  recommendations.
                </p>
                <div className="rounded-lg border p-4">
                  <div className="flex items-center gap-3">
                    <Shield className="h-8 w-8 text-primary" />
                    <div>
                      <p className="text-sm font-medium">Risk Profile Questionnaire</p>
                      <p className="text-xs text-muted-foreground">
                        5 questions to assess your risk tolerance
                      </p>
                    </div>
                  </div>
                  {riskScore !== null && (
                    <Badge variant="secondary" className="mt-2">
                      Score: {riskScore}/10
                    </Badge>
                  )}
                </div>
              </div>
            )}

            {/* Step 5: Done! */}
            {currentStep === 5 && (
              <div className="space-y-6 py-4 text-center">
                <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
                  <CheckCircle2 className="h-10 w-10 text-primary" />
                </div>
                <div>
                  <h3 className="text-xl font-bold">You&apos;re All Set! 🎉</h3>
                  <p className="mt-2 text-muted-foreground">
                    Your MyMoney account is ready. Head to your dashboard to start managing your
                    finances!
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-3 text-left">
                  <div className="rounded-lg border p-3">
                    <p className="text-xs font-medium">Profile</p>
                    <p className="text-sm text-muted-foreground">{name || "Default"}</p>
                  </div>
                  <div className="rounded-lg border p-3">
                    <p className="text-xs font-medium">Categories</p>
                    <p className="text-sm text-muted-foreground">
                      {selectedCategories.length} selected
                    </p>
                  </div>
                  {emergencyFund && (
                    <div className="rounded-lg border p-3">
                      <p className="text-xs font-medium">Emergency Fund</p>
                      <p className="text-sm text-muted-foreground">₹{emergencyFund}</p>
                    </div>
                  )}
                  {savingsTarget && (
                    <div className="rounded-lg border p-3">
                      <p className="text-xs font-medium">Savings Goal</p>
                      <p className="text-sm text-muted-foreground">₹{savingsTarget}</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </CardContent>

          {/* Navigation Buttons */}
          <div className="flex items-center justify-between border-t px-6 py-4">
            <div>
              {currentStep > 0 && (
                <Button variant="ghost" onClick={handleBack}>
                  <ArrowLeft className="mr-1 h-4 w-4" /> Back
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              {currentStep < STEPS.length - 1 && (
                <Button variant="outline" onClick={handleSkip}>
                  <SkipForward className="mr-1 h-4 w-4" /> Skip
                </Button>
              )}
              <Button onClick={handleNext}>
                {currentStep === STEPS.length - 1 ? (
                  <>
                    <LayoutDashboard className="mr-1 h-4 w-4" /> Go to Dashboard
                  </>
                ) : (
                  <>
                    Next <ArrowRight className="ml-1 h-4 w-4" />
                  </>
                )}
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}
