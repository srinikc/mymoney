import { NextResponse } from "next/server"
import * as fs from "fs"
import * as path from "path"

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "application/pdf"]
const MAX_SIZE = 10 * 1024 * 1024 // 10MB

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
      return NextResponse.json({ error: "File too large. Max 10MB" }, { status: 400 })
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const ext = file.name.split(".").pop() || "jpg"
    const fileName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`
    const uploadDir = path.join(process.cwd(), "public", "uploads")

    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true })
    }

    const filePath = path.join(uploadDir, fileName)
    // eslint-disable-next-line security/detect-non-literal-fs-filename
    fs.writeFileSync(filePath, buffer)

    const receiptUrl = `/uploads/${fileName}`

    // OCR extraction (best-effort)
    const extracted = { amount: null as number | null, date: null as string | null, merchant: null as string | null }

    if (file.type !== "application/pdf") {
      try {
        // Use Tesseract.js for OCR if available
        const Tesseract = await import("tesseract.js")
        const { data } = await Tesseract.recognize(buffer, "eng", {
          logger: () => {},
        })

        const text = data.text

        // Extract amount: look for ₹, Rs., INR patterns
        // eslint-disable-next-line security/detect-unsafe-regex
        const amtMatch = text.match(/[₹Rs.\s]*(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)/)
        if (amtMatch) {
          extracted.amount = parseFloat(amtMatch[1].replace(/,/g, ""))
        }

        // Extract date: DD/MM/YYYY or YYYY-MM-DD
        const dateMatch = text.match(/(\d{2}[/-]\d{2}[/-]\d{4})/)
        if (dateMatch) {
          extracted.date = dateMatch[1]
        }

        // Extract merchant: first line of text that looks like a business name
        const lines = text.split("\n").filter((l) => l.trim().length > 3)
        if (lines.length > 0) {
          // Skip first line if it looks like header (date, time, etc.)
          for (const line of lines.slice(0, 5)) {
            const trimmed = line.trim()
            if (trimmed.length > 3 && !trimmed.match(/^\d/) && !trimmed.toLowerCase().includes("receipt") && !trimmed.toLowerCase().includes("invoice")) {
              extracted.merchant = trimmed
              break
            }
          }
        }
      } catch {
        // OCR failed silently — user can fill manually
      }
    }

    return NextResponse.json({
      success: true,
      receiptUrl,
      extracted,
      message: "Receipt uploaded" + (extracted.amount ? " and scanned" : ""),
    })
  } catch (error) {
    console.error("Upload error:", error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
