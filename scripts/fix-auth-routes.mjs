import { readFileSync, writeFileSync } from "fs"
import { join } from "path"

const root = process.cwd()
const files = [
  "src/app/api/assets/route.ts", "src/app/api/audit-log/route.ts",
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
  "src/app/api/files/[id]/route.ts", "src/app/api/files/receipt/[name]/route.ts",
  "src/app/api/family/members/[id]/route.ts",
]

for (const rel of files) {
  const p = join(root, rel)
  let content = readFileSync(p, "utf-8")

  // Add withAuth to import from @/lib/with-auth
  const importRegex = /(import.*?from\s+['"]@\/lib\/with-auth['"])/s
  const importMatch = content.match(importRegex)
  if (importMatch) {
    if (!importMatch[1].includes("withAuth")) {
      content = content.replace(importMatch[1], importMatch[1].replace("}", ", withAuth }"))
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

  // Replace getAuthContext() with withAuth()
  const getAuthRegex = /(const\s+\{[^}]+\}\s*=\s*await\s+getAuthContext\(\))/g
  let match
  while ((match = getAuthRegex.exec(content)) !== null) {
    const vars = match[1].replace("const ", "").replace(" = await getAuthContext()", "")
    const replacement = `const auth = await withAuth()\n  if (auth.error) return auth.error\n  const ${vars} = auth`
    content = content.replace(match[1], replacement)
  }

  writeFileSync(p, content, "utf-8")
  console.log("FIXED:", rel)
}
