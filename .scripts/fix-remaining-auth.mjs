import { readFileSync, writeFileSync } from "node:fs"
import { join } from "node:path"

// Fix remaining session references in these files
const files = [
  "account/route.ts", "audit-log/route.ts", "auto-link/suggestions/route.ts",
  "chat/route.ts", "export/my-data/route.ts",
  "goals/route.ts", "goals/[id]/route.ts",
  "income/sources/route.ts", "income/sources/[id]/route.ts", "income/summary/route.ts",
  "insurance/route.ts", "insurance/[id]/route.ts",
  "loans/route.ts", "loans/[id]/route.ts",
  "payments/mobile-checkout/route.ts",
  "tax/documents/route.ts", "tax/documents/[id]/route.ts",
  "tax/itr/route.ts", "tax/itr/[id]/route.ts",
]

const baseDir = join(process.cwd(), "src", "app", "api")

for (const relPath of files) {
  const fullPath = join(baseDir, relPath.replace(/\//g, "\\"))
  let content = readFileSync(fullPath, "utf-8")
  const hasCRLF = content.includes("\r\n")
  content = content.replace(/\r\n/g, "\n")

  // 1. Fix orphaned return lines after removed session check
  content = content.replace(
    /\/\/ userId auto-checked by getAuthContext\s*\n\s*return NextResponse\.json\(\{ error: "Unauthorized" \}, \{ status: 401 \}\)\s*\n\s*\}/g,
    "// userId auto-checked by getAuthContext"
  )

  // 2. Replace session.user references (including .profileId)
  content = content.replace(/session\.user\.profileId\b/g, "profileId")
  content = content.replace(/session\?\.user\?\.profileId\b/g, "profileId")
  content = content.replace(/session\.user\.role\b/g, "role")
  content = content.replace(/session\?\.user\?\.role\b/g, "role")

  // 3. Replace sUser references (from `const sUser = session.user as ...`)
  content = content.replace(/sUser\.profileId\b/g, "profileId")
  content = content.replace(/sUser\.role\b/g, "role")

  // 4. Replace remaining session.user.id
  content = content.replace(/session\.user\.id\b/g, "userId")
  content = content.replace(/session\?\.user\?\.id\b/g, "userId")

  // 5. Remove orphaned const sUser lines
  content = content.replace(/^\s*const sUser = session\.user as unknown as \{ profileId\?: number;? ?role\??:? ?string? \}\s*$/gm, "")

  // 6. Remove orphaned const profileId = sUser.profileId or similar
  content = content.replace(/^\s*const profileId = (profileId|session\.user\.profileId)\s*$/gm, "")

  // 7. Fix if (!session?.user?.profileId) -> already replaced to if (!profileId)
  content = content.replace(/if \(!profileId\)\s*\{/g, "if (!profileId) {")

  const outputContent = hasCRLF ? content.replace(/\n/g, "\r\n") : content
  writeFileSync(fullPath, outputContent, "utf-8")
  console.log(`Fixed ${relPath}`)
}
