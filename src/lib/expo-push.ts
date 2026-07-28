import { prisma } from "@/lib/prisma"

interface PushPayload {
  title: string
  body: string
  data?: Record<string, unknown>
}

export async function sendPushToUser(userId: number, payload: PushPayload): Promise<void> {
  const tokens = await prisma.userSetting.findMany({
    where: { userId, key: { startsWith: "push_token_" } },
  })

  for (const setting of tokens) {
    try {
      await fetch("https://exp.host/--/api/v2/push/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: setting.value,
          title: payload.title,
          body: payload.body,
          data: payload.data || {},
          sound: "default",
          priority: "high",
        }),
      })
    } catch { /* ignore push errors */ }
  }
}

export async function sendPushToAllUsers(payload: PushPayload): Promise<void> {
  const tokens = await prisma.userSetting.findMany({
    where: { key: { startsWith: "push_token_" } },
  })

  const chunkSize = 100
  for (let i = 0; i < tokens.length; i += chunkSize) {
    const chunk = tokens.slice(i, i + chunkSize)
    try {
      await fetch("https://exp.host/--/api/v2/push/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          chunk.map((s) => ({
            to: s.value,
            title: payload.title,
            body: payload.body,
            data: payload.data || {},
            sound: "default",
            priority: "high",
          }))
        ),
      })
    } catch { /* ignore push errors */ }
  }
}
