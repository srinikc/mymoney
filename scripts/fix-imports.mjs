import { readFileSync, writeFileSync } from "fs"
import { join } from "path"

const root = process.cwd()
const files = [
  "src/app/api/account/route.ts", "src/app/api/audit-log/route.ts",
  "src/app/api/bank-accounts/route.ts", "src/app/api/bank-accounts/sync-balances/route.ts",
  "src/app/api/budgets/route.ts", "src/app/api/deals/route.ts",
  "src/app/api/expenses/flagged/route.ts", "src/app/api/expenses/years/route.ts",
  "src/app/api/export/my-data/route.ts",
  "src/app/api/family/accept/route.ts", "src/app/api/family/invite/route.ts",
  "src/app/api/family/members/route.ts", "src/app/api/family/revoke/route.ts",
  "src/app/api/goals/route.ts", "src/app/api/investments/route.ts",
  "src/app/api/liabilities/route.ts", "src/app/api/net-worth/route.ts",
  "src/app/api/onboarding/route.ts", "src/app/api/onboarding/welcome/route.ts",
  "src/app/api/profiles/route.ts", "src/app/api/reminders/route.ts",
  "src/app/api/reminders/auto-detect/route.ts", "src/app/api/subscriptions/route.ts",
  "src/app/api/tax/documents/route.ts", "src/app/api/tax/itr/route.ts",
  "src/app/api/account/route.ts",
  "src/app/api/assets/[id]/route.ts", "src/app/api/expenses/[id]/route.ts",
  "src/app/api/goals/[id]/route.ts", "src/app/api/liabilities/[id]/route.ts",
  "src/app/api/payments/create-order/route.ts", "src/app/api/payments/verify/route.ts",
  "src/app/api/family/members/[id]/route.ts",
  "src/app/api/auth/mobile-google/route.ts",
  "src/app/api/assets/route.ts",
]

for (const rel of files) {
  const p = join(root, rel)
  let content = readFileSync(p, "utf-8")

  // Fix: remove withAuth from next/server import
  content = content.replace(/import\s*\{\s*([^}]*?)withAuth\s*([^}]*?)\}\s*from\s*['"]next\/server['"]/g, (match, before, after) => {
    const cleaned = (before + after).split(",").map(s => s.trim()).filter(s => s && s !== ",").join(", ")
    if (cleaned) return `import { ${cleaned} } from "next/server"`
    return `import { NextResponse } from "next/server"`
  })

  // Fix: remove duplicate commas in imports
  content = content.replace(/,\s*,/g, ",")

  // Ensure @/lib/with-auth import has withAuth
  const hasWithAuthImport = content.match(/withAuth.*from\s+['"]@\/lib\/with-auth['"]/)
  if (!hasWithAuthImport) {
    const existing = content.match(/(import\s*\{[^}]*\}\s*from\s+['"]@\/lib\/with-auth['"])/)
    if (existing) {
      if (!existing[1].includes("withAuth")) {
        content = content.replace(existing[1], existing[1].replace("}", ", withAuth }"))
      }
    } else {
      const lines = content.split("\n")
      let lastImport = -1
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].trimStart().startsWith("import ")) lastImport = i
      }
      if (lastImport >= 0) {
        lines.splice(lastImport + 1, 0, 'import { withAuth } from "@/lib/with-auth"')
        content = lines.join("\n")
      }
    }
  }

  writeFileSync(p, content, "utf-8")
}
