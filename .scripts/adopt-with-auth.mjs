import { readFileSync, writeFileSync, readdirSync } from "node:fs"
import { join, relative } from "node:path"

const srcDir = join(process.cwd(), "src", "app", "api")

function findRouteFiles(dir) {
  const results = []
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const fullPath = join(dir, entry.name)
    if (entry.isDirectory()) results.push(...findRouteFiles(fullPath))
    else if (entry.isFile() && entry.name === "route.ts") results.push(fullPath)
  }
  return results
}

const routeFiles = findRouteFiles(srcDir)
let changed = 0

// ---- The exact 4-line auth block (2-space indent, Record<string,unknown> variant) ----
const AUTH_BLOCK_2 = [
  `  const session = await auth()`,
  `  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })`,
  `  const profileId = (session.user as unknown as Record<string, unknown>)?.profileId as number | undefined`,
  `  if (!profileId) return NextResponse.json({ error: "No profile found" }, { status: 404 })`,
].join("\n")

const AUTH_BLOCK_2B = [
  `  const session = await auth()`,
  `  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })`,
  `  const profileId = (session.user as unknown as { profileId?: number }).profileId`,
  `  if (!profileId) return NextResponse.json({ error: "No profile found" }, { status: 404 })`,
].join("\n")

const AUTH_BLOCK_0 = [
  `const session = await auth()`,
  `if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })`,
  `const profileId = (session.user as unknown as Record<string, unknown>)?.profileId as number | undefined`,
  `if (!profileId) return NextResponse.json({ error: "No profile found" }, { status: 404 })`,
].join("\n")

const AUTH_BLOCK_4 = [
  `    const session = await auth()`,
  `    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })`,
  `    const profileId = (session.user as unknown as Record<string, unknown>)?.profileId as number | undefined`,
  `    if (!profileId) return NextResponse.json({ error: "No profile found" }, { status: 404 })`,
].join("\n")

const AUTH_BLOCK_4B = [
  `    const session = await auth()`,
  `    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })`,
  `    const profileId = (session.user as unknown as { profileId?: number }).profileId`,
  `    if (!profileId) return NextResponse.json({ error: "No profile found" }, { status: 404 })`,
].join("\n")

const AUTH_BLOCK_6 = [
  `      const session = await auth()`,
  `      if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })`,
  `      const profileId = (session.user as unknown as Record<string, unknown>)?.profileId as number | undefined`,
  `      if (!profileId) return NextResponse.json({ error: "No profile found" }, { status: 404 })`,
].join("\n")

// Map of old block -> replacement
const blockReplacements = [
  [AUTH_BLOCK_2,  "  const { profileId, userId, role } = await getAuthContext()"],
  [AUTH_BLOCK_2B, "  const { profileId, userId, role } = await getAuthContext()"],
  [AUTH_BLOCK_0,  "const { profileId, userId, role } = await getAuthContext()"],
  [AUTH_BLOCK_4,  "    const { profileId, userId, role } = await getAuthContext()"],
  [AUTH_BLOCK_4B, "    const { profileId, userId, role } = await getAuthContext()"],
  [AUTH_BLOCK_6,  "      const { profileId, userId, role } = await getAuthContext()"],
]

// -- SIMPLER PATTERNS for files that had partial or no auth --
// These match the 1st line of the auth block to detect handlers that need auth
const AUTH_FIRST_LINE = /^\s*const session = await auth\(\)/m

for (const fullPath of routeFiles) {
  let content = readFileSync(fullPath, "utf-8")
  const rel = relative(srcDir, fullPath)
  let fileChanged = false

  // Skip files that use requireRole pattern (admin routes use a different auth strategy)
  if (content.includes("requireRole(")) continue

  // Detect if file had auth import (already or previously)
  const hadAuthImport = content.includes(`import { auth } from "@/lib/auth"`)
  const hadGetAuthCtx = content.includes(`import { getAuthContext`)

  // Count how many auth blocks exist
  const authBlocks = (content.match(AUTH_FIRST_LINE) || []).length

  if (!hadAuthImport && !hadGetAuthCtx && authBlocks === 0) continue // no auth needed

  // 1. Replace the import
  const OLD_IMPORT = hadAuthImport
    ? `import { auth } from "@/lib/auth"`
    : null

  const NEW_IMPORT = `import { getAuthContext, handleAuthError } from "@/lib/with-auth"`

  if (hadAuthImport) {
    content = content.replace(OLD_IMPORT, NEW_IMPORT)
    fileChanged = true
  } else if (hadGetAuthCtx) {
    // Already has the new import, keep it
  }

  // 2. Replace all complete auth blocks
  for (const [oldBlock, newBlock] of blockReplacements) {
    if (content.includes(oldBlock)) {
      content = content.replaceAll(oldBlock, newBlock)
      fileChanged = true
    }
  }

  // 3. For remaining auth lines (partial matches), replace just the const session line
  //    and add getAuthContext
  let remainingDefs = (content.match(AUTH_FIRST_LINE) || []).length
  if (remainingDefs > 0 && hadAuthImport) {
    // These are auth blocks that didn't match the exact 4-line pattern
    // Replace them with getAuthContext
    content = content.replace(
      /(\s*)const session = await auth\(\)\s*\n\s*if \(!session\?\.user\?\.id\) return NextResponse\.json\(\{ error: "Unauthorized" \}, \{ status: 401 \}\)\s*\n\s*const profileId = \(session\.user as unknown as [^)]+\)\??\.profileId[^)]*\)\s*\n\s*if \(!profileId\) return NextResponse\.json\(\{ error: "No profile found" \}, \{ status: 404 \}\)/g,
      (_m, indent) => `${indent}const { profileId, userId, role } = await getAuthContext()`
    )
    fileChanged = true
  }

  // 4. Clean up remaining broken patterns (from previous partial migration)
  //    Replace `const userId = userId` (TDZ) with nothing
  content = content.replace(/^\s*const userId = userId\s*$/gm, "")
  //    Remove orphaned `const session = await auth()` if getAuthContext is now used
  content = content.replace(/^\s*const session = await auth\(\)\s*$/gm, "")
  //    Replace broken userId refs (where session was replaced but userId never declared)
  content = content.replace(/^\s*if \(!userId\)/gm, "")
  //    Remove orphaned `const sUser` lines
  content = content.replace(/^\s*const sUser = session\.user as unknown as \{ profileId\?: number \}\s*$/gm, "")

  // 5. Remove blank lines left by cleanup
  content = content.replace(/\n{3,}/g, "\n\n")

  if (fileChanged) {
    writeFileSync(fullPath, content, "utf-8")
    changed++
    const remaining = (content.match(/session\??\./g) || []).length +
                     (content.match(/const session = await auth\(\)/g) || []).length +
                     (content.match(/const userId = userId/g) || []).length
    if (remaining > 0) {
      console.log(`⚠️  ${rel}: ${remaining} residual issues`)
    } else {
      console.log(`✅ ${rel}`)
    }
  }
}

console.log(`\nDone: ${changed} files changed`)
