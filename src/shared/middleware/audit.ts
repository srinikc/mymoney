import { prisma } from "@/lib/prisma"

export async function logAudit(
  action: string,
  entityType: string,
  entityId?: number,
  metadata?: Record<string, unknown>,
  ip?: string
) {
  try {
    await prisma.auditLog.create({
      data: {
        action,
        entityType,
        entityId: entityId || null,
        metadata: metadata ? JSON.stringify(metadata) : null,
        ip: ip || null,
      },
    })
  } catch {
    // Audit logging is best-effort — never fail the main operation
  }
}

// Helper to get client IP from request
export function getClientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for")
  if (forwarded) return forwarded.split(",")[0].trim()
  return req.headers.get("x-real-ip") || "127.0.0.1"
}
