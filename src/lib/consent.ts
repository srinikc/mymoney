// ── User Consent Management ─────────────────────────────────────────────
// Tracks per-user ad preferences stored in UserSetting (key-value JSON).
// Defaults: personalized recs ON, display ads ON, personalized targeting OFF.

import { prisma } from "@/lib/prisma"

export type ConsentKey =
  | "ad.showPersonalizedRecs"
  | "ad.showDisplayAds"
  | "ad.personalizedTargeting"
  | "ad.frequencyCap"
  | "ad.consentAcceptedAt"
  | "ad.welcomeDismissed"

export interface ConsentValue {
  showPersonalizedRecs: boolean
  showDisplayAds: boolean
  personalizedTargeting: boolean
  frequencyCap: number
  consentAcceptedAt: string | null
  welcomeDismissed: boolean
}

const DEFAULTS: ConsentValue = {
  showPersonalizedRecs: true,
  showDisplayAds: true,
  personalizedTargeting: false,
  frequencyCap: 2,
  consentAcceptedAt: null,
  welcomeDismissed: false,
}

export async function getUserConsent(userId: number): Promise<ConsentValue> {
  const rows = await prisma.userSetting.findMany({
    where: { userId, key: { startsWith: "ad." } },
  })
  const map: Record<string, unknown> = {}
  for (const r of rows) {
    const v = r.value as unknown
    if (v && typeof v === "object" && "value" in (v as Record<string, unknown>)) {
      map[r.key] = (v as Record<string, unknown>).value
    } else {
      map[r.key] = v
    }
  }
  return {
    showPersonalizedRecs: (map["ad.showPersonalizedRecs"] as boolean) ?? DEFAULTS.showPersonalizedRecs,
    showDisplayAds: (map["ad.showDisplayAds"] as boolean) ?? DEFAULTS.showDisplayAds,
    personalizedTargeting: (map["ad.personalizedTargeting"] as boolean) ?? DEFAULTS.personalizedTargeting,
    frequencyCap: (map["ad.frequencyCap"] as number) ?? DEFAULTS.frequencyCap,
    consentAcceptedAt: (map["ad.consentAcceptedAt"] as string) ?? DEFAULTS.consentAcceptedAt,
    welcomeDismissed: (map["ad.welcomeDismissed"] as boolean) ?? DEFAULTS.welcomeDismissed,
  }
}

export async function setUserConsent(
  userId: number,
  patch: Partial<ConsentValue>,
): Promise<ConsentValue> {
  const current = await getUserConsent(userId)
  const next: ConsentValue = { ...current, ...patch }
  const updates: { key: ConsentKey; value: unknown }[] = [
    { key: "ad.showPersonalizedRecs", value: next.showPersonalizedRecs },
    { key: "ad.showDisplayAds", value: next.showDisplayAds },
    { key: "ad.personalizedTargeting", value: next.personalizedTargeting },
    { key: "ad.frequencyCap", value: next.frequencyCap },
    { key: "ad.consentAcceptedAt", value: next.consentAcceptedAt },
    { key: "ad.welcomeDismissed", value: next.welcomeDismissed },
  ]
  for (const u of updates) {
    await prisma.userSetting.upsert({
      where: { userId_key: { userId, key: u.key } },
      update: { value: { value: u.value } as object as object },
      create: { userId, key: u.key, value: { value: u.value } as object as object },
    })
  }
  return next
}

export async function dismissWelcome(userId: number): Promise<void> {
  await setUserConsent(userId, { welcomeDismissed: true, consentAcceptedAt: new Date().toISOString() })
}
