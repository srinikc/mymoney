import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getSessionFromCookie } from "@/lib/auth"
import { sendWelcomeEmail } from "@/lib/email"

export async function POST() {
  const session = await getSessionFromCookie()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const userId = Number(session.user.id)

  const profile = await prisma.profile.findFirst({
    where: { userId, isDefault: true },
    select: { id: true },
  })

  if (profile) {
    await prisma.reminder.create({
      data: {
        title: "Welcome to MyMoney! 🎉",
        description:
          "Thank you for joining MyMoney! Start by importing your expenses, setting up budgets, and tracking your financial goals.",
        type: "system",
        priority: "high",
        profileId: profile.id,
      },
    })
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true, name: true },
  })

  if (user?.email) {
    const result = await sendWelcomeEmail(user.email, user.name || "there")
    if (!result.success) {
      console.warn("Welcome email not sent:", result.reason)
    }
  }

  return NextResponse.json({
    success: true,
    welcomeShown: true,
    message: "Welcome notification created" + (user?.email ? ", email sent" : ""),
  })
}
