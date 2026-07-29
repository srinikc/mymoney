import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getAuthContext, handleAuthError } from "@/lib/with-auth"
import { writeFile, mkdir, unlink } from "node:fs/promises"
import path from "node:path"
import type { Prisma } from "@prisma/client"

const ALLOWED_TYPES = new Set(["application/pdf", "image/png", "image/jpeg", "image/jpg"])
const MAX_FILE_SIZE = 10 * 1024 * 1024
const DOC_TYPES = ["form16", "form26as", "form10e", "capital_gains", "home_loan_cert", "rent_receipts", "donation_receipt", "other"] as const

export async function GET(req: Request) {
    const { profileId } = await getAuthContext()
    const { searchParams } = new URL(req.url)
    const fy = searchParams.get("fy")

    const where: Record<string, unknown> = profileId ? { profileId } : {}
    if (fy) where.fy = fy

    const documents = await prisma.taxDocument.findMany({
      where,
      orderBy: { createdAt: "desc" },
    })
    return NextResponse.json(documents)
}

export async function POST(req: Request) {
    const { profileId, role } = await getAuthContext()
    if (role === "viewer") {
      return NextResponse.json({ error: "Viewers cannot modify data" }, { status: 403 })
    }

    const formData = await req.formData()
    const file = formData.get("file") as File | null
    const type = formData.get("type") as string
    const fy = formData.get("fy") as string
    const label = formData.get("label") as string | null
    const notes = formData.get("notes") as string | null
    const replace = formData.get("replace") === "true"

    if (!file) {
      return NextResponse.json({ error: "File is required" }, { status: 400 })
    }
    if (!type || !DOC_TYPES.includes(type as (typeof DOC_TYPES)[number])) {
      return NextResponse.json({ error: "Document type is required" }, { status: 400 })
    }
    if (!fy || !/^\d{4}-\d{2}$/.test(fy)) {
      return NextResponse.json({ error: "Financial year is required (e.g., 2024-25)" }, { status: 400 })
    }
    if (!ALLOWED_TYPES.has(file.type)) {
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

    const safeName = `${Date.now()}-${file.name.replaceAll(/[^\w.-]/g, "_")}`
    const filePath = path.join(uploadDir, safeName)
    const buffer = Buffer.from(await file.arrayBuffer())
    await writeFile(filePath, buffer)

    if (existing) {
      try {
        const oldPath = path.join(process.cwd(), "public", existing.filePath)
        await unlink(oldPath)
      } catch { /* ignore old file cleanup */ }
    }

    const metadata: Record<string, unknown> = {}
    const grossSalary = formData.get("grossSalary")
    const employerName = formData.get("employerName")
    const tan = formData.get("tan")
    const pan = formData.get("pan")
    const tds = formData.get("tds")

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
            metadata: Object.keys(metadata).length > 0 ? (metadata as Prisma.InputJsonValue) : undefined,
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
            metadata: Object.keys(metadata).length > 0 ? (metadata as Prisma.InputJsonValue) : undefined,
            notes,
          },
        })

    return NextResponse.json({ message: existing ? "Document replaced" : "Document uploaded", document: doc }, { status: existing ? 200 : 201 })
}
