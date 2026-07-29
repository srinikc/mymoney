import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getAuthContext, handleAuthError } from "@/lib/with-auth"
import { PLANS } from "@/lib/pricing"
import Razorpay from "razorpay"
import { z } from "zod"

function getRazorpay() {
  if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
    throw new Error("Razorpay not configured")
  }
  return new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
  })
}

const CreateOrderSchema = z.object({
  plan: z.enum(["pro", "enterprise"]),
})

export async function POST(req: Request) {
  const { profileId, userId, role } = await getAuthContext()
  // userId auto-checked by getAuthContext

  let body: z.infer<typeof CreateOrderSchema>
  try {
    const raw = await req.json()
    const result = await CreateOrderSchema.safeParseAsync(raw)
    if (!result.success) {
      return NextResponse.json({ error: "Invalid plan" }, { status: 400 })
    }
    body = result.data
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const plan = PLANS[body.plan]
  if (!plan || plan.price <= 0) {
    return NextResponse.json({ error: "Invalid plan" }, { status: 400 })
  }

  const amountInPaise = plan.price * 100

  try {
    const razorpay = getRazorpay()
    const order = await razorpay.orders.create({
      amount: amountInPaise,
      currency: "INR",
      receipt: `order_${userId}_${Date.now()}`,
    })

    await prisma.payment.create({
      data: {
        userId,
        orderId: order.id,
        amount: amountInPaise,
        currency: "INR",
        plan: body.plan,
        status: "created",
      },
    })

    return NextResponse.json({
      orderId: order.id,
      amount: amountInPaise,
      currency: "INR",
    })
  } catch (err) {
    console.error("Razorpay order creation failed:", err)
    return NextResponse.json({ error: "Payment order creation failed" }, { status: 500 })
  }
}
