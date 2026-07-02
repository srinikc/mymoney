import { NextResponse } from "next/server"
import * as fs from "fs"
import * as path from "path"
import { extractReceiptData, extractReceiptText } from "@/shared/receipt-ocr"

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "application/pdf"]
const MAX_SIZE = 15 * 1024 * 1024 // 15MB

export async function POST(req: Request) {
  try {
    const formData = await req.formData()
    const file = formData.get("file") as File

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json({ error: `Invalid file type: ${file.type}. Allowed: ${ALLOWED_TYPES.join(", ")}` }, { status: 400 })
    }

    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: "File too large. Max 15MB" }, { status: 400 })
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const ext = file.name.split(".").pop() || "jpg"
    const fileName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`
    const uploadDir = path.join(process.cwd(), "public", "uploads")

    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true })
    }

    // eslint-disable-next-line security/detect-non-literal-fs-filename
    const filePath = path.join(uploadDir, fileName)
    fs.writeFileSync(filePath, buffer)

    const receiptUrl = `/uploads/${fileName}`

    // Receipt data extraction using the shared module
    const extracted = {
      merchant: null as string | null,
      date: null as string | null,
      total: null as number | null,
      items: [] as { name: string; price: number }[],
      tax: null as number | null,
      confidence: 0,
      rawText: null as string | null,
    }

    if (file.type !== "application/pdf") {
      try {
        const receiptData = await extractReceiptData(buffer, file.type)

        extracted.merchant = receiptData.merchant || null
        extracted.date = receiptData.date || null
        extracted.total = receiptData.total
        extracted.items = receiptData.items
        extracted.tax = receiptData.tax
        extracted.confidence = receiptData.confidence

        // Get raw text for reference/editing
        const rawText = await extractReceiptText(buffer)
        extracted.rawText = rawText.slice(0, 2000)
      } catch (ocrError) {
        console.error("Receipt OCR failed:", ocrError)
        // OCR failed silently — user can fill manually
      }
    }

    return NextResponse.json({
      success: true,
      receiptUrl,
      extracted,
      message: "Receipt uploaded" + (extracted.total ? ` and scanned (₹${extracted.total})` : ""),
    })
  } catch (error) {
    console.error("Upload error:", error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
