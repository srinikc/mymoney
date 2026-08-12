import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getAuthContext, handleAuthError , withAuth } from "@/lib/with-auth"
import crypto from "node:crypto"
import { z } from "zod"

const VerifySchema = z.object({
  razorpay_order_id: z.string(),
  razorpay_payment_id: z.string(),
  razorpay_signature: z.string(),
  plan: z.enum(["pro", "enterprise"]),
})

export async function POST(req: Request) {
  const auth = await withAuth()
  if (auth.error) return auth.error
  const { profileId, userId, role } = auth
  // userId auto-checked by getAuthContext

  let body: z.infer<typeof VerifySchema>
  try {
    const raw = await req.json()
    const result = await VerifySchema.safeParseAsync(raw)
    if (!result.success) {
      return NextResponse.json({ error: "Invalid verification data" }, { status: 400 })
    }
    body = result.data
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const expectedSignature = crypto
    .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET!)
    .update(`${body.razorpay_order_id}|${body.razorpay_payment_id}`)
    .digest("hex")

  if (expectedSignature !== body.razorpay_signature) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 })
  }

  const payment = await prisma.payment.findUnique({
    where: { orderId: body.razorpay_order_id },
  })

  if (!payment) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 })
  }

  await prisma.payment.update({
    where: { id: payment.id },
    data: {
      paymentId: body.razorpay_payment_id,
      signature: body.razorpay_signature,
      status: "paid",
    },
  })

  await prisma.user.update({
    where: { id: userId },
    data: { tier: body.plan },
  })

  return NextResponse.json({ success: true, tier: body.plan })
}
