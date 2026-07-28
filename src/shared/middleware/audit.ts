import { prisma } from "@/lib/prisma"

export async function logAudit(
  profileId: number,
  action: string,
  entity: string,
  entityId?: number | null,
  metadata?: Record<string, unknown> | string | null,
  ip?: string,
) {
  try {
    const metaObj: Record<string, unknown> = {}
    if (metadata) {
      if (typeof metadata === "string") {
        metaObj.message = metadata
      } else {
        Object.assign(metaObj, metadata)
      }
    }
    if (ip) metaObj.ip = ip
    await prisma.auditLog.create({
      data: {
        profileId,
        action,
        entity,
        entityId: entityId ?? null,
        metadata: Object.keys(metaObj).length > 0 ? JSON.stringify(metaObj) : null,
      },
    })
  } catch {
    // Audit logging is best-effort — never fail the main operation
  }
}

// Helper to get client IP from request
export function getClientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for")
  if (forwarded) {
    // x-forwarded-for can be comma-separated list — first IP is the real client
    return forwarded.split(",")[0]?.trim() || "127.0.0.1"
  }
  return req.headers.get("x-real-ip") || "127.0.0.1"
}
