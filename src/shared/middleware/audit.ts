import { prisma } from "@/lib/prisma"

export async function logAudit(
  profileId: number,
  action: string,
  entity: string,
  entityId?: number | null,
  metadata?: Record<string, unknown> | string | null,
) {
  try {
    await prisma.auditLog.create({
      data: {
        profileId,
        action,
        entity,
        entityId: entityId ?? null,
        metadata: typeof metadata === "string" ? metadata : (metadata ? JSON.stringify(metadata) : null),
      },
    })
  } catch {
    // Audit logging is best-effort — never fail the main operation
  }
}

// Helper to get client IP from request
export function getClientIp(_req: Request): string {
  return "127.0.0.1"
}
