import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { resetVendorKeyCache } from "@/shared/vendor-mapping"
import { getAuthContext, handleAuthError } from "@/lib/with-auth"

// Hard-delete vendor mappings for the current user. Accepts { ids?: number[] }
// or { scope: "all" } to delete every vendor mapping for the user.
export async function POST(req: Request) {
  let userId: number
  try {
    const ctx = await getAuthContext()
    userId = ctx.userId
  } catch (e) {
    return handleAuthError(e)
  }

  try {
    const { ids, scope } = await req.json().catch(() => ({}))
    let result
    if (scope === "all") {
      result = await prisma.vendorMapping.deleteMany({ where: { userId } })
    } else if (Array.isArray(ids) && ids.length > 0) {
      result = await prisma.vendorMapping.deleteMany({ where: { userId, id: { in: ids.map(Number) } } })
    } else {
      return NextResponse.json({ error: "ids array or scope:'all' required" }, { status: 400 })
    }
    resetVendorKeyCache(userId)
    return NextResponse.json({ success: true, count: result.count })
  } catch (error) {
    console.error("Bulk vendor delete error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
