import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getAuthContext, handleAuthError } from "@/lib/with-auth"

// Whether the profile has GPay-imported expenses — controls the visibility of
// the "Bank Analysis" button in the Expenses page (only shows after a GPay import).
export async function GET() {
  try {
    const ctx = await getAuthContext()
    const profileId = ctx.profileId

    // Gate on the profile's OWN GPay expenses. ImportSession rows are not
    // profile-scoped, so a session count would leak other users' activity.
    const gpayExpenseCount = await prisma.expense.count({
      where: {
        profileId,
        deletedAt: null,
        OR: [
          { importSession: { is: { source: { startsWith: "gpay" } } } },
          { paymentMode: "UPI", bankAccount: { not: null } },
        ],
      },
    })

    return NextResponse.json({
      ready: gpayExpenseCount > 0,
      sessionCount: null,
      gpayExpenseCount,
    })
  } catch (e) {
    return handleAuthError(e)
  }
}