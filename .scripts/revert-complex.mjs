import { readFileSync, writeFileSync } from "fs"

const files = [
  "src/app/api/payments/mobile-checkout/route.ts",
  "src/app/api/income/sources/[id]/route.ts",
  "src/app/api/tax/documents/[id]/route.ts",
  "src/app/api/tax/itr/[id]/route.ts",
]

for (const f of files) {
  let c = readFileSync(f, "utf-8")
  c = c.replace(
    'import { getAuthContext, handleAuthError } from "@/lib/with-auth"',
    'import { auth } from "@/lib/auth"'
  )
  c = c.replace(
    /const \{ profileId, userId, role \} = await getAuthContext\(\)/g,
    "const session = await auth()"
  )
  c = c.replace(/\/\/ userId auto-checked by getAuthContext\s*\n\s*/g, "")
  writeFileSync(f, c, "utf-8")
  console.log("Reverted " + f)
}
