import { readFileSync, writeFileSync, readdirSync } from "node:fs"
import { join } from "node:path"

function findRouteFiles(dir) {
  const results = []
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const fullPath = join(dir, entry.name)
    if (entry.isDirectory()) results.push(...findRouteFiles(fullPath))
    else if (entry.isFile() && entry.name === "route.ts") results.push(fullPath)
  }
  return results
}

const files = findRouteFiles(join(process.cwd(), "src", "app", "api"))

for (const fullPath of files) {
  let content = readFileSync(fullPath, "utf-8")
  const hasCRLF = content.includes("\r\n")
  content = content.replace(/\r\n/g, "\n")
  let changed = false

  // 1. Remove const userId = userId (TDZ error)
  const newContent1 = content.replace(/^(\s*)const userId = userId\s*$/gm, "")
  if (newContent1 !== content) changed = true
  content = newContent1

  // 2. Fix orphaned return + brace after userId auto-checked comment
  const newContent2 = content.replace(
    /\/\/ userId auto-checked by getAuthContext\s*\n\s*return NextResponse\.json\(\{ error: "Unauthorized" \}, \{ status: 401 \}\)\s*\n\s*\}/g,
    "// userId auto-checked by getAuthContext"
  )
  if (newContent2 !== content) changed = true
  content = newContent2

  // 3. Fix orphaned brace after userId auto-checked comment
  const newContent3 = content.replace(
    /\/\/ userId auto-checked by getAuthContext\s*\n\s*\}/g,
    "// userId auto-checked by getAuthContext"
  )
  if (newContent3 !== content) changed = true
  content = newContent3

  // 4. Remove orphaned const profileId = (session.user...
  const newContent4 = content.replace(
    /^(\s*)const profileId = \(session\.user as unknown as \{ profileId\?: number \}\)\.profileId\s*$/gm,
    ""
  )
  if (newContent4 !== content) changed = true
  content = newContent4

  // 5. Remove orphaned "// session.user via getAuthContext" comments
  const newContent5 = content.replace(/\/\/ session\.user via getAuthContext\s*\n*/g, "")
  if (newContent5 !== content) changed = true
  content = newContent5

  // 6. Remove blank line duplication
  const newContent6 = content.replace(/\n{3,}/g, "\n\n")
  if (newContent6 !== content) changed = true
  content = newContent6

  if (changed) {
    const output = hasCRLF ? content.replace(/\n/g, "\r\n") : content
    writeFileSync(fullPath, output, "utf-8")
    console.log(`Fixed ${fullPath.replace(process.cwd(), "")}`)
  }
}
