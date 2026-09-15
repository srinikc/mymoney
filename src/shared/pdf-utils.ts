/**
 * Shared PDF text extraction utility.
 * Uses pdf-parse with proper Next.js worker setup.
 */

export async function extractPdfText(buffer: Buffer): Promise<string> {
  try {
    await import("pdf-parse/worker")
    const { PDFParse } = await import("pdf-parse")
    const parser = new PDFParse({ data: buffer, verbosity: 0 })
    const result = await parser.getText()
    console.log("[pdf-utils] extractPdfText OK, length:", (result.text || "").length)
    return result.text || ""
  } catch (err) {
    console.error("[pdf-utils] extractPdfText FAILED:", err)
    throw err
  }
}
