import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Separate build dir for the E2E server (scripts/start-e2e.cjs) so it never
  // shares chunk/cache files with the dev server (avoids ChunkLoadError).
  distDir: process.env.NEXT_DIST_DIR || ".next",
  eslint: { ignoreDuringBuilds: true },
  serverExternalPackages: ["prisma", "@prisma/client", "pdf-parse", "msedge-tts", "ws", "bufferutil", "utf-8-validate"],
  // Phase 5 (E2E row 2 of scaling_perf.md): enable Next.js built-in compression.
  // When `compress: true`, Next.js compresses HTML, CSS, JS, JSON, and SVG
  // responses with gzip when the client sends `Accept-Encoding: gzip`. On
  // production platforms (Vercel, Cloudflare, Fly) Brotli is also applied at
  // the edge automatically for an additional ~20% size reduction.
  compress: true,
  // Compress only responses above this threshold to skip the CPU cost on
  // tiny responses (under ~1KB).
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "Service-Worker-Allowed", value: "/" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-XSS-Protection", value: "1; mode=block" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
          {
            key: "Content-Security-Policy",
            value: "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://checkout.razorpay.com https://accounts.google.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self' https://exp.host https://checkout.razorpay.com https://accounts.google.com; frame-src https://checkout.razorpay.com https://accounts.google.com; worker-src 'self' blob:;",
          },
          { key: "Permissions-Policy", value: "camera=(), microphone=(self), geolocation=()" },
        ],
      },
      {
        source: "/sw.js",
        headers: [
          { key: "Content-Type", value: "application/javascript; charset=utf-8" },
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
        ],
      },
      // Sherpa-ONNX WASM binary + JS modules (~13MB total, versioned directory)
      {
        source: "/wasm/(.*)",
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
        ],
      },
      // Sherpa-ONNX KWS model files (~6.5MB total, versioned directory)
      {
        source: "/kws-models/(.*)",
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
        ],
      },
    ]
  },
};

export default nextConfig;
