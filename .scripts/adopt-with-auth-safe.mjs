import { readFileSync, writeFileSync } from "node:fs"
import { join } from "node:path"

const SKIP_PATTERNS = ["requireRole(", "session.accessToken", "session.userId", "session.user as AuthUser"]

const modifiedApiFiles = [
  "account/route.ts", "audit-log/route.ts", "auto-link/accept/route.ts", "auto-link/suggestions/route.ts",
  "bank-accounts/route.ts", "bank-accounts/sync-balances/route.ts", "bank-accounts/[id]/route.ts",
  "bank-accounts/[id]/fds/route.ts", "bank-accounts/[id]/fds/[fdId]/route.ts", "bank-accounts/[id]/transactions/route.ts",
  "budgets/route.ts", "chat/route.ts", "export/my-data/route.ts",
  "family/accept/route.ts", "family/invite/route.ts", "family/members/route.ts",
  "family/members/[id]/route.ts", "family/revoke/route.ts",
  "gmail/import/route.ts", "gmail/scan/route.ts", "goals/route.ts", "goals/[id]/route.ts",
  "income/sources/route.ts", "income/sources/[id]/route.ts", "income/summary/route.ts",
  "insurance/route.ts", "insurance/[id]/route.ts", "loans/route.ts", "loans/[id]/route.ts",
  "notifications/send/route.ts", "onboarding/route.ts", "onboarding/welcome/route.ts",
  "payments/create-order/route.ts", "payments/mobile-checkout/route.ts", "payments/verify/route.ts",
  "profiles/route.ts", "reminders/route.ts", "settings/api-keys/route.ts", "settings/environment/route.ts",
  "settings/gmail-parser/route.ts", "tax/documents/route.ts", "tax/documents/[id]/route.ts",
  "tax/itr/route.ts", "tax/itr/[id]/route.ts", "tax/summary/route.ts",
  "users/preferences/route.ts", "users/push-token/route.ts",
]

const baseDir = join(process.cwd(), "src", "app", "api")
let changed = 0, cleanCount = 0

for (const relPath of modifiedApiFiles) {
  const fullPath = join(baseDir, relPath.replace(/\//g, "\\"))
  const rawContent = readFileSync(fullPath, "utf-8")
  const hasCRLF = rawContent.includes("\r\n")
  let content = rawContent.replace(/\r\n/g, "\n")

  // Skip if no auth import or complex patterns
  if (!content.includes(`import { auth } from "@/lib/auth"`)) continue
  if (SKIP_PATTERNS.some((p) => content.includes(p))) {
    console.log(`⏭️  ${relPath} (complex)`)
    continue
  }

  let newContent = content

  // 1. Replace import
  newContent = newContent.replace(
    `import { auth } from "@/lib/auth"`,
    `import { getAuthContext, handleAuthError } from "@/lib/with-auth"`
  )

  // 2. Replace `const session = await auth()` with getAuthContext
  newContent = newContent.replace(
    /^(\s*)const session = await auth\(\)\s*$/gm,
    `$1const { profileId, userId, role } = await getAuthContext()`
  )

  // 3. Remove redundant follow-up lines after the replacement
  //    These are lines that check session?.user?.id or extract profileId
  //    (now redundant since getAuthContext throws on failure)
  newContent = newContent.replace(
    /^(\s*)if \(!session\?\.user\?\.id\)(.*)$/gm,
    (m, indent) => `${indent}// userId auto-checked by getAuthContext`
  )
  newContent = newContent.replace(
    /^(\s*)const profileId = \(session\.user as unknown as [^)]+\)\??\.profileId[^)]*\)\s*$/gm,
    (m, indent) => `${indent}// profileId from getAuthContext`
  )
  newContent = newContent.replace(
    /^(\s*)if \(!profileId\) return NextResponse\.json\(\{ error: "No profile found" \}, \{ status: 4\d{2} \}\)\s*$/gm,
    (m, indent) => `${indent}// profileId auto-checked by getAuthContext`
  )
  newContent = newContent.replace(
    /^(\s*)const sUser = session\.user as unknown as \{ profileId\?: number \}\s*$/gm,
    (m, indent) => `${indent}// session.user via getAuthContext`
  )
  newContent = newContent.replace(
    /^(\s*)const userId = userId\s*$/gm,
    (m, indent) => `${indent}// userId from getAuthContext`
  )

  // 4. Replace all session?.user?.id references with userId
  newContent = newContent.replace(/Number\(session\.user\.id\)/g, "userId")
  newContent = newContent.replace(/session\?\.user\?\.id/g, "userId")
  newContent = newContent.replace(/session\.user\.id/g, "userId")

  // 5. Clean up the "// auto-checked" comments if they're on their own line
  //    between real code -- convert to empty line
  //    Actually leave them as comments to make review easier

  // 6. Remove blank lines that double up
  newContent = newContent.replace(/\n{3,}/g, "\n\n")

  const remainingSession = (newContent.match(/session\??\./g) || []).length
  const remainingAuthDef = (newContent.match(/const session = await auth\(\)/g) || []).length

  if (newContent !== content) {
    const outputContent = hasCRLF ? newContent.replace(/\n/g, "\r\n") : newContent
    writeFileSync(fullPath, outputContent, "utf-8")
    changed++
    if (remainingSession > 0 || remainingAuthDef > 0) {
      console.log(`⚠️  ${relPath}: ${remainingSession} session, ${remainingAuthDef} defs`)
    } else {
      console.log(`✅ ${relPath}`)
      cleanCount++
    }
  }
}

console.log(`\nDone: ${changed} changed (${cleanCount} clean)`)
