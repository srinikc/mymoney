import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { isViewer } from "@/lib/roles"
import { writeFile, mkdir, unlink } from "fs/promises"
import path from "path"

const ALLOWED_TYPES = ["application/pdf", "image/png", "image/jpeg", "image/jpg"]
const MAX_FILE_SIZE = 10 * 1024 * 1024
const DOC_TYPES = ["form16", "form26as", "form10e", "capital_gains", "home_loan_cert", "rent_receipts", "donation_receipt", "other"] as const

export async function GET(req: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    const profileId = (session.user as unknown as { profileId?: number }).profileId
    const { searchParams } = new URL(req.url)
    const fy = searchParams.get("fy")

    const where: any = profileId ? { profileId } : {}
    if (fy) where.fy = fy

    const documents = await prisma.taxDocument.findMany({
      where,
      orderBy: { createdAt: "desc" },
    })
    return NextResponse.json(documents)
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    if (isViewer(session?.user as any)) {
      return NextResponse.json({ error: "Viewers cannot modify data" }, { status: 403 })
    }
    const profileId = (session.user as unknown as { profileId?: number }).profileId

    const formData = await req.formData()
    const file = (formData as any).get("file") as File | null
    const type = (formData as any).get("type") as string
    const fy = (formData as any).get("fy") as string
    const label = (formData as any).get("label") as string | null
    const notes = (formData as any).get("notes") as string | null
    const replace = (formData as any).get("replace") === "true"

    if (!file) {
      return NextResponse.json({ error: "File is required" }, { status: 400 })
    }
    if (!type || !DOC_TYPES.includes(type as any)) {
      return NextResponse.json({ error: "Document type is required" }, { status: 400 })
    }
    if (!fy || !/^\d{4}-\d{2}$/.test(fy)) {
      return NextResponse.json({ error: "Financial year is required (e.g., 2024-25)" }, { status: 400 })
    }
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json({ error: "Unsupported file type. Allowed: PDF, PNG, JPG, JPEG" }, { status: 400 })
    }
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: "File size exceeds 10MB limit" }, { status: 400 })
    }

    const existing = await prisma.taxDocument.findFirst({
      where: { profileId: profileId ?? undefined, type, fy },
    })

    if (existing && !replace) {
      return NextResponse.json({
        error: `A ${type.replace("_", " ")} document for FY ${fy} already exists. Set replace=true to overwrite.`,
        existingId: existing.id,
        conflict: true,
      }, { status: 409 })
    }

    const uploadDir = path.join(process.cwd(), "public", "uploads", "tax")
    await mkdir(uploadDir, { recursive: true })

    const safeName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`
    const filePath = path.join(uploadDir, safeName)
    const buffer = Buffer.from(await file.arrayBuffer())
    await writeFile(filePath, buffer)

    if (existing) {
      try {
        const oldPath = path.join(process.cwd(), "public", existing.filePath)
        await unlink(oldPath)
      } catch {}
    }

    const metadata: Record<string, any> = {}
    const grossSalary = (formData as any).get("grossSalary")
    const employerName = (formData as any).get("employerName")
    const tan = (formData as any).get("tan")
    const pan = (formData as any).get("pan")
    const tds = (formData as any).get("tds")

    if (type === "form16") {
      if (grossSalary) metadata.grossSalary = Number(grossSalary)
      if (employerName) metadata.employerName = employerName
      if (tan) metadata.tan = tan
      if (pan) metadata.pan = pan
      if (tds) metadata.tds = Number(tds)
    }
    if (type === "form26as") {
      if (tds) metadata.tdsDeducted = Number(tds)
      if (pan) metadata.pan = pan
    }

    const doc = existing
      ? await prisma.taxDocument.update({
          where: { id: existing.id },
          data: {
            fileName: file.name,
            filePath: `/uploads/tax/${safeName}`,
            mimeType: file.type,
            fileSize: file.size,
            metadata: Object.keys(metadata).length > 0 ? metadata : undefined,
            notes: notes ?? undefined,
          },
        })
      : await prisma.taxDocument.create({
          data: {
            profileId: profileId ?? undefined,
            type,
            fy,
            label,
            fileName: file.name,
            filePath: `/uploads/tax/${safeName}`,
            mimeType: file.type,
            fileSize: file.size,
            metadata: Object.keys(metadata).length > 0 ? metadata : undefined,
            notes,
          },
        })

    return NextResponse.json({ message: existing ? "Document replaced" : "Document uploaded", document: doc }, { status: existing ? 200 : 201 })
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
