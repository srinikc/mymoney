import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import * as XLSX from "xlsx"
import { getAuthContext, handleAuthError } from "@/lib/with-auth"
import { titleCase } from "@/shared/title-case"

export async function POST(req: Request) {
  let userId: number
  try {
    const ctx = await getAuthContext()
    userId = ctx.userId
  } catch (e) {
    return handleAuthError(e)
  }

  try {
    const formData = await req.formData()
    const file = formData.get("file") as File
    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const workbook = XLSX.read(buffer, { type: "buffer" })

    // Find the mappings sheet
    const sheetName = workbook.SheetNames.find(
      (s) => s.toLowerCase().includes("mapping")
    )
    if (!sheetName) {
      return NextResponse.json({
        error: "No sheet named 'mappings' found. Sheets: " + workbook.SheetNames.join(", "),
      }, { status: 400 })
    }

    const sheet = workbook.Sheets[sheetName]
    const rows = XLSX.utils.sheet_to_json(sheet) as Record<string, unknown>[]

    if (rows.length === 0) {
      return NextResponse.json({ error: "Mappings sheet is empty" }, { status: 400 })
    }

    const headers = Object.keys(rows[0])
    const keyField = headers.find((h) => /key|merchant|vendor/i.test(h))
    const typeField = headers.find((h) => /type|category/i.test(h))
    const subField = headers.find((h) => /sub/i.test(h))
    const personField = headers.find((h) => /person|name/i.test(h))
    const descField = headers.find((h) => /desc|notes/i.test(h))

    if (!keyField) {
      return NextResponse.json({
        error: "Could not identify vendor key column. Found: " + headers.join(", "),
      }, { status: 400 })
    }

    let imported = 0
    let skipped = 0

    for (const row of rows) {
      const key = String(row[keyField] || "").toLowerCase().trim()
      if (!key) { skipped++; continue }

      // Check if mapping already exists for this user (unique constraint also catches this)
      const exists = await prisma.vendorMapping.findUnique({ where: { userId_vendorKey: { userId, vendorKey: key } } })
      if (exists) { skipped++; continue }

      await prisma.vendorMapping.create({
        data: {
          userId,
          vendorKey: key,
          description: descField ? titleCase(String(row[descField] || "").trim()) || null : null,
          category: typeField ? String(row[typeField] || "").trim() || null : null,
          subCategory: subField ? String(row[subField] || "").trim() || null : null,
          person: personField ? String(row[personField] || "").trim() || null : null,
          source: "mappings_sheet",
        },
      })
      imported++
    }

    return NextResponse.json({
      success: true,
      imported,
      skipped,
      total: rows.length,
      message: `Imported ${imported} vendor mappings, skipped ${skipped} duplicates`,
    })
  } catch (error) {
    console.error("Mappings import error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
