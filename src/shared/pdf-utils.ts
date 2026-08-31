/**
 * Shared PDF text extraction utility.
 * Uses pdf-parse with proper Next.js worker setup.
 */

export async function extractPdfText(buffer: Buffer): Promise<string> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    require("pdf-parse/worker")
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { PDFParse } = require("pdf-parse")
    const parser = new PDFParse({ data: buffer, verbosity: 0 })
    const result = await parser.getText()
    console.log("[pdf-utils] extractPdfText OK, length:", (result.text || "").length)
    return result.text || ""
  } catch (err) {
    console.error("[pdf-utils] extractPdfText FAILED:", err)
    throw err
  }
}
