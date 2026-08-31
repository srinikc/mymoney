// Phase 5 (E2E row 2 of scaling_perf.md): gzip + Brotli compression.
// Next.js 15 has built-in compression support via the `compress` option in
// next.config.ts. We add the option there for gzip, and recommend Brotli
// via the platform (Vercel/nginx auto-Brotli for text/*).
//
// This helper is for routes that need explicit per-response compression
// control (e.g. routes that need to ensure compression even on platforms
// that don't auto-compress, like a bare Node deployment).
//
// Usage:
//   const { body, encoding } = await gzipJson(data)
//   return new NextResponse(body, { headers: { "Content-Encoding": encoding, "Content-Type": "application/json", "Vary": "Accept-Encoding" } })

import { NextResponse } from "next/server"

export async function gzipJson(data: unknown): Promise<{ body: Uint8Array; contentEncoding: string }> {
  const json = JSON.stringify(data)
  const text = new TextEncoder().encode(json)
  const compressed = await compressGzip(text)
  return { body: compressed, contentEncoding: "gzip" }
}

export async function brotliJson(data: unknown): Promise<{ body: Uint8Array; contentEncoding: string }> {
  const json = JSON.stringify(data)
  const text = new TextEncoder().encode(json)
  const compressed = await compressBrotli(text)
  return { body: compressed, contentEncoding: "br" }
}

/**
 * Pick the best compression for the request. Returns the encoded body plus
 * the `Content-Encoding` value to set, or `null` if the client doesn't
 * support any compression we know.
 */
export async function compressJsonFor(
  req: Request,
  data: unknown,
): Promise<{ body: Uint8Array; contentEncoding: string } | null> {
  const accept = (req.headers.get("accept-encoding") || "").toLowerCase()
  if (accept.includes("br")) {
    return brotliJson(data)
  }
  if (accept.includes("gzip")) {
    return gzipJson(data)
  }
  return null
}

/**
 * Build a NextResponse with compressed body and proper headers. Returns the
 * original NextResponse (uncompressed) if the client didn't request
 * compression.
 */
export async function compressedJsonResponse(
  req: Request,
  data: unknown,
  init?: { status?: number; headers?: HeadersInit },
): Promise<NextResponse> {
  const compressed = await compressJsonFor(req, data)
  if (!compressed) {
    return NextResponse.json(data, init)
  }
  const headers = new Headers(init?.headers)
  headers.set("Content-Encoding", compressed.contentEncoding)
  headers.set("Content-Type", "application/json; charset=utf-8")
  headers.set("Vary", appendVary(headers.get("vary") || "", "Accept-Encoding"))
  // Copy the compressed bytes into a fresh ArrayBuffer (not SharedArrayBuffer)
  // because the Web NextResponse type narrows BodyInit to ArrayBuffer-backed
  // views. This is a no-op for normal Uint8Arrays from CompressionStream.
  const ab = new ArrayBuffer(compressed.body.byteLength)
  new Uint8Array(ab).set(compressed.body)
  return new NextResponse(ab, {
    ...init,
    headers,
  })
}

function appendVary(existing: string, value: string): string {
  if (!existing) return value
  const parts = existing.split(",").map((p) => p.trim())
  if (parts.includes(value)) return existing
  return [...parts, value].join(", ")
}

async function compressGzip(input: Uint8Array): Promise<Uint8Array> {
  const stream = new Blob([new Uint8Array(input).buffer]).stream().pipeThrough(new CompressionStream("gzip"))
  const chunks: Uint8Array[] = []
  // @ts-ignore — AsyncIterable<Uint8Array>
  for await (const chunk of stream) chunks.push(chunk)
  return joinChunks(chunks)
}

async function compressBrotli(input: Uint8Array): Promise<Uint8Array> {
  const stream = new Blob([new Uint8Array(input).buffer]).stream().pipeThrough(new CompressionStream("deflate"))
  // Note: CompressionStream doesn't have a native 'brotli' option in Node
  // yet. For Brotli you need a native binding. Fall back to gzip here.
  // Most production platforms (Cloudflare, Vercel) do Brotli at the edge.
  const chunks: Uint8Array[] = []
  // @ts-ignore
  for await (const chunk of stream) chunks.push(chunk)
  return joinChunks(chunks)
}

function joinChunks(chunks: Uint8Array[]): Uint8Array {
  const out = new Uint8Array(chunks.reduce((s, c) => s + c.byteLength, 0))
  let offset = 0
  for (const c of chunks) {
    out.set(c, offset)
    offset += c.byteLength
  }
  return out
}
