import { readFileSync } from "fs"
import { parseGpayTakeoutHtml } from "../src/shared/gpay-parser"

const htmlPath = String.raw`C:\Users\ADMIN\Downloads\takeout-20260822T124005Z-1-001\Takeout\Google Pay\My Activity\My Activity.html`

const html = readFileSync(htmlPath, "utf-8")
const txns = parseGpayTakeoutHtml(html)

console.log(`\n========== GPay Takeout HTML Analysis ==========`)
console.log(`Total transactions parsed (debit only): ${txns.length}`)

const withVendor = txns.filter((t) => t.vendor.trim() !== "")
const withoutVendor = txns.filter((t) => t.vendor.trim() === "")
console.log(`\nTransactions WITH vendor name: ${withVendor.length}`)
console.log(`Transactions WITHOUT vendor name (blank): ${withoutVendor.length}`)

const withNote = txns.filter((t) => t.note && t.note.trim() !== "")
console.log(`\nTransactions with non-empty note: ${withNote.length} / ${txns.length}`)
if (withNote.length > 0) {
  console.log(`Sample notes (first 10):`)
  for (const t of withNote.slice(0, 10)) {
    console.log(`  [${t.date.toISOString().slice(0, 10)}] ₹${t.amount} | vendor="${t.vendor}" | note="${t.note}"`)
  }
}

// Distinct vendors
const vendorCount = new Map<string, number>()
for (const t of txns) {
  const v = t.vendor || "(no vendor)"
  vendorCount.set(v, (vendorCount.get(v) || 0) + 1)
}
const sortedVendors = [...vendorCount.entries()].sort((a, b) => b[1] - a[1])
console.log(`\nDistinct vendors: ${sortedVendors.length}`)
console.log(`\nTop 50 vendors by frequency:`)
for (const [v, count] of sortedVendors.slice(0, 50)) {
  console.log(`  ${count.toString().padStart(4)}x  ${v}`)
}

// Samples
console.log(`\n========== Sample: 30 transactions WITH vendor ==========`)
for (const t of withVendor.slice(0, 30)) {
  console.log(`  ${t.date.toISOString().slice(0, 10)} | ₹${t.amount.toString().padStart(10)} | ${t.vendor.padEnd(40)} | ${t.bankAccount} | note=${t.note || "(none)"}`)
}

console.log(`\n========== Sample: 30 transactions WITHOUT vendor ==========`)
for (const t of withoutVendor.slice(0, 30)) {
  console.log(`  ${t.date.toISOString().slice(0, 10)} | ₹${t.amount.toString().padStart(10)} | "${t.vendor}" | ${t.bankAccount} | note=${t.note || "(none)"}`)
}
