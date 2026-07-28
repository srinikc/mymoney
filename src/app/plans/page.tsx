"use client"

import { useState } from "react"
import { useSession } from "next-auth/react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { PLANS, type PlanId } from "@/lib/pricing"
import { Check, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { useRouter } from "next/navigation"

declare global {
  interface Window {
    Razorpay: new (options: Record<string, unknown>) => { on: (event: string, handler: (response: { error?: { description?: string } }) => void) => void; open: () => void }
  }
}

function loadRazorpayScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.Razorpay) return resolve()
    const script = document.createElement("script")
    script.src = "https://checkout.razorpay.com/v1/checkout.js"
    script.async = true
    script.addEventListener('load', () => resolve())
    script.addEventListener('error', () => reject(new Error("Failed to load Razorpay SDK")))
    document.body.append(script)
  })
}

export default function PlansPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const currentTier = ((session?.user as { tier?: string })?.tier || "free") as PlanId
  const [loading, setLoading] = useState<PlanId | null>(null)

  const handleUpgrade = async (plan: PlanId) => {
    if (plan === "free") return
    setLoading(plan)

    try {
      await loadRazorpayScript()

      const res = await fetch("/api/payments/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || "Failed to create order")
      }

      const { orderId, amount, currency } = await res.json()

      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        amount,
        currency,
        name: "MyMoney",
        description: `${PLANS[plan].name} Plan`,
        order_id: orderId,
        handler: async function (response: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }) {
          try {
            const verifyRes = await fetch("/api/payments/verify", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                plan,
              }),
            })

            if (!verifyRes.ok) {
              const err = await verifyRes.json()
              throw new Error(err.error || "Verification failed")
            }

            toast.success(`Upgraded to ${PLANS[plan].name}!`)
            router.refresh()
          } catch (err: unknown) {
            toast.error((err as Error).message || "Payment verification failed")
          }
        },
        modal: {
          ondismiss: function () {
            setLoading(null)
          },
        },
        prefill: {
          email: session?.user?.email || "",
          name: session?.user?.name || "",
        },
        theme: { color: "#6366f1" },
      }

      const rzp = new window.Razorpay(options)
      rzp.on("payment.failed", function (response: { error?: { description?: string } }) {
        toast.error(response.error?.description || "Payment failed")
        setLoading(null)
      })
      rzp.open()
    } catch (err: unknown) {
      toast.error((err as Error).message || "Something went wrong")
      setLoading(null)
    }
  }

  const planKeys = Object.keys(PLANS) as PlanId[]

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold tracking-tight">Pricing Plans</h1>
        <p className="text-muted-foreground mt-2">Choose the plan that fits your needs</p>
      </div>

      <div className="grid gap-6 md:grid-cols-3 max-w-5xl mx-auto">
        {planKeys.map((key) => {
          const plan = PLANS[key]
          const isCurrent = currentTier === key
          const isLoading = loading === key

          return (
            <Card
              key={key}
              className={`flex flex-col relative ${isCurrent ? "border-primary ring-1 ring-primary" : ""}`}
            >
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xl">{plan.name}</CardTitle>
                  {isCurrent && <Badge variant="success">Current Plan</Badge>}
                </div>
                <div className="mt-2">
                  <span className="text-3xl font-bold">
                    {plan.price === 0 ? "Free" : `₹${plan.price}`}
                  </span>
                  {plan.price > 0 && (
                    <span className="text-muted-foreground text-sm ml-1">/month</span>
                  )}
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  {plan.profiles} profile{plan.profiles > 1 ? "s" : ""}
                </p>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col gap-4">
                <ul className="space-y-2 flex-1">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2 text-sm">
                      <Check className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
                {key !== "free" && (
                  <Button
                    variant={isCurrent ? "outline" : "default"}
                    size="lg"
                    className="w-full"
                    disabled={isCurrent || isLoading}
                    onClick={() => handleUpgrade(key)}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Processing...
                      </>
                    ) : isCurrent ? (
                      "Current Plan"
                    ) : (
                      "Upgrade"
                    )}
                  </Button>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
