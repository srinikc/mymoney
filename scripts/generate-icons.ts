// Generate PWA icons
// Run: npx tsx scripts/generate-icons.ts

import sharp from "sharp"
import * as fs from "fs"
import * as path from "path"

const SIZES = [192, 512]
const OUT_DIR = path.join(__dirname, "..", "public", "icons")

// Create a simple gradient icon
async function generateIcon(size: number, maskable: boolean = false) {
  const svg = `
    <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#6366f1"/>
          <stop offset="100%" style="stop-color:#4f46e5"/>
        </linearGradient>
      </defs>
      ${maskable ? `<rect width="${size}" height="${size}" rx="${size * 0.15}" fill="url(#bg)"/>` : `<rect width="${size}" height="${size}" fill="url(#bg)"/>`}
      <text x="50%" y="55%" dominant-baseline="middle" text-anchor="middle"
            font-family="system-ui, sans-serif" font-weight="bold"
            font-size="${size * 0.5}" fill="white">M</text>
    </svg>
  `

  await sharp(Buffer.from(svg)).png().toFile(path.join(OUT_DIR, `icon-${size}${maskable ? "-maskable" : ""}.png`))
  console.log(`  Created icon-${size}${maskable ? "-maskable" : ""}.png`)
}

async function main() {
  if (!fs.existsSync(OUT_DIR)) {
    fs.mkdirSync(OUT_DIR, { recursive: true })
  }

  console.log("Generating PWA icons...")
  for (const size of SIZES) {
    await generateIcon(size, false)
    await generateIcon(size, true)
  }
  console.log("Done!")
}

main().catch(console.error)
