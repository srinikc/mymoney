import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"

/**
 * POST /api/onboarding/welcome — Trigger welcome notification
 * Marks the first-time tutorial as shown
 */
export async function POST() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const userId = Number(session.user.id)

  // Create a welcome reminder/notification for the user
  try {
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
  } catch {
    // best-effort
  }

  return NextResponse.json({
    success: true,
    welcomeShown: true,
    message: "Welcome notification created",
  })
}
