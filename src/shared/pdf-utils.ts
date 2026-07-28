/**
 * Shared PDF text extraction utility.
 * Uses pdf-parse (class-based PDFParse API with getText()).
 */

export async function extractPdfText(buffer: Buffer): Promise<string> {
  const { PDFParse } = await import("pdf-parse")
  const parser = new PDFParse({ data: buffer, verbosity: 0 })

  // getText() internally calls load() and returns all page text
  const result = await parser.getText()
  return result.text || ""
}
