import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getAuthContext, handleAuthError } from "@/lib/with-auth"

const SOURCE_LABELS: Record<string, string> = {
  kcexpenses: "Spreadsheet",
  spreadsheet: "Spreadsheet",
  "gpay-takeout": "GPay",
  "gpay-import": "GPay",
  manual: "Manual",
  user_edit: "Manual",
  user_review: "Manual",
  dismissed: "Dismissed",
  mappings_sheet: "Mappings Sheet",
  seed: "Seed",
}

export async function GET(req: Request) {
  let userId: number
  try {
    const ctx = await getAuthContext()
    userId = ctx.userId
  } catch (e) {
    return handleAuthError(e)
  }

  const url = new URL(req.url)
  const page = Math.max(1, Number.parseInt(url.searchParams.get("page") || "1", 10) || 1)
  const requestedPageSize = Number.parseInt(url.searchParams.get("pageSize") || "50", 10) || 50
  const pageSize = Math.min(Math.max(1, requestedPageSize), 200)
  const search = (url.searchParams.get("search") || "").toLowerCase().trim()

  const where: { userId: number; source?: { not: string }; OR?: object[] } = {
    userId,
    source: { not: "dismissed" },
  }
  if (search) {
    where.OR = [
      { vendorKey: { contains: search, mode: "insensitive" } },
      { description: { contains: search, mode: "insensitive" } },
      { category: { contains: search, mode: "insensitive" } },
      { subCategory: { contains: search, mode: "insensitive" } },
      { person: { contains: search, mode: "insensitive" } },
    ]
  }

  const [total, vendors] = await Promise.all([
    prisma.vendorMapping.count({ where }),
    prisma.vendorMapping.findMany({
      where,
      orderBy: [{ source: "asc" }, { vendorKey: "asc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ])
  return NextResponse.json({
    vendors: vendors.map((v) => ({ ...v, sourceLabel: SOURCE_LABELS[v.source] || v.source })),
    total,
    page,
    pageSize,
  })
}
