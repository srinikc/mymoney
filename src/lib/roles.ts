/**
 * Role-based access control helper.
 * Add `import { requireRole } from "@/lib/roles"` to any API route.
 * Then at the top: `const roleCheck = requireRole(session, "admin")`
 * If the user doesn't have the role, return the 403 response immediately.
 */

import { NextResponse } from "next/server"

export type UserRole = "admin" | "manager" | "viewer" | "user"

export interface AuthUser {
  id: number
  role?: string
}

export function checkRole(
  user: AuthUser | null | undefined,
  allowedRoles: UserRole[]
): boolean {
  if (!user) return false
  return allowedRoles.includes((user.role || "user") as UserRole)
}

export function requireRole(
  user: AuthUser | null | undefined,
  ...allowedRoles: UserRole[]
): NextResponse | null {
  if (!checkRole(user, allowedRoles)) {
    return NextResponse.json(
      { error: "Forbidden — insufficient permissions" },
      { status: 403 }
    )
  }
  return null
}

export function canModify(user: AuthUser | null | undefined): boolean {
  return checkRole(user, ["admin", "manager", "user"])
}

export function isViewer(user: AuthUser | null | undefined): boolean {
  return user?.role === "viewer"
}
