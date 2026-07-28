import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import crypto from "node:crypto"

interface RazorpayEvent {
  event: string
  payload: {
    payment: {
      entity: {
        order_id: string
        id: string
        amount: number
        status: string
        error_description?: string
      }
    }
  }
}

const WEBHOOK_SECRET = process.env.RAZORPAY_WEBHOOK_SECRET || ""

function verifyWebhookSignature(body: string, signature: string, secret: string): boolean {
  const expected = crypto.createHmac("sha256", secret).update(body).digest("hex")
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature))
}

export async function POST(req: Request) {
  if (!WEBHOOK_SECRET) {
    console.error("RAZORPAY_WEBHOOK_SECRET not set")
    return NextResponse.json({ error: "Webhook secret not configured" }, { status: 500 })
  }

  const text = await req.text()
  const signature = req.headers.get("x-razorpay-signature") || ""

  if (!verifyWebhookSignature(text, signature, WEBHOOK_SECRET)) {
    return NextResponse.json({ error: "Invalid webhook signature" }, { status: 400 })
  }

  let event: RazorpayEvent
  try {
    event = JSON.parse(text) as RazorpayEvent
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 })
  }

  const eventName = event.event

  if (eventName === "payment.captured") {
    const paymentEntity = event.payload.payment.entity
    const orderId = paymentEntity.order_id
    const paymentId = paymentEntity.id

    try {
      const dbPayment = await prisma.payment.findUnique({
        where: { orderId },
      })

      if (dbPayment && dbPayment.status !== "paid") {
        await prisma.payment.update({
          where: { id: dbPayment.id },
          data: {
            paymentId,
            status: "paid",
          },
        })

        await prisma.user.update({
          where: { id: dbPayment.userId },
          data: { tier: dbPayment.plan },
        })
      }
    } catch (err) {
      console.error("Webhook payment.captured handler failed:", err)
    }
  }

  if (eventName === "payment.failed") {
    const paymentEntity = event.payload.payment.entity
    console.error("Razorpay payment failed:", {
      orderId: paymentEntity.order_id,
      paymentId: paymentEntity.id,
      error: paymentEntity.error_description,
    })

    try {
      await prisma.payment.updateMany({
        where: { orderId: paymentEntity.order_id },
        data: { status: "failed" },
      })
    } catch (err) {
      console.error("Webhook payment.failed handler failed:", err)
    }
  }

  return NextResponse.json({ received: true })
}
