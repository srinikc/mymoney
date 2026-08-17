import { prisma } from "@/lib/prisma"

const BUSINESS = /\b(medicals|hospital|clinic|pharmacy|chemist|dental|optical|store|mart|bazaar|hotel|restaurant|cafe|bakery|canteen|traders|enterprises|solutions|services|technologies|industries|brothers|sons|agencies|associates|pvt|ltd|corp|limited|salon|spa|gym|academy|institute|temple|church|pharma|diagnostics|lab|garage|workshop|textiles|garments|jewellery|jewelers|travels|tours|finance|insurance|builders|constructions|automobiles|motors|supermarket|hypermarket|communications|electronics|furniture|interiors|provisions|cabs|taxi|logistics|courier|transport|parlour|parlor)\b/i

const cacheByUser = new Map<number, Set<string>>()
const mapCacheByUser = new Map<number, Map<string, { category: string | null; subCategory: string | null; person: string | null }>>()

export async function getExistingVendorKeys(userId: number): Promise<Set<string>> {
  const cached = cacheByUser.get(userId)
  if (cached) return cached
  const mappings = await prisma.vendorMapping.findMany({
    where: { userId },
    select: { vendorKey: true },
  })
  const keys = new Set(mappings.map((m) => m.vendorKey))
  cacheByUser.set(userId, keys)
  return keys
}

export interface VendorMappingInfo {
  category: string | null
  subCategory: string | null
  person: string | null
}

export async function getVendorMappingMap(userId: number): Promise<Map<string, VendorMappingInfo>> {
  const cached = mapCacheByUser.get(userId)
  if (cached) return cached
  const mappings = await prisma.vendorMapping.findMany({
    where: { userId },
    select: { vendorKey: true, category: true, subCategory: true, person: true },
  })
  const map = new Map<string, VendorMappingInfo>()
  for (const m of mappings) {
    map.set(m.vendorKey.toLowerCase().trim(), {
      category: m.category,
      subCategory: m.subCategory,
      person: m.person,
    })
  }
  mapCacheByUser.set(userId, map)
  return map
}

export function shouldAutoMap(vendor: string, desc: string, existingKeys: Set<string>): boolean {
  if (vendor.length < 2 || vendor.length > 40) return false
  if (existingKeys.has(vendor.toLowerCase().trim())) return true
  if (BUSINESS.test(vendor)) return true
  const cameFromDash = desc.includes(" - ") && desc.split(" - ")[0].trim().toLowerCase() === vendor.toLowerCase()
  if (cameFromDash && vendor.includes(" ")) return true
  return false
}

// ── Dismissed vendors ─────────────────────────────────────────────────────
// "Dismiss" simply hides a vendor from the Unmapped review list — it does NOT
// create a mapping. Dismissed keys are stored per-user in UserSetting JSON so
// they stay excluded without polluting the All Mappings list.

const DISMISSED_SETTING_KEY = "dismissed_vendors"

export async function getDismissedVendorKeys(userId: number): Promise<Set<string>> {
  const setting = await prisma.userSetting.findUnique({
    where: { userId_key: { userId, key: DISMISSED_SETTING_KEY } },
  })
  const raw = Array.isArray(setting?.value) ? (setting.value as unknown[]) : []
  return new Set(raw.map((k) => String(k).toLowerCase().trim()).filter(Boolean))
}

export async function addDismissedVendorKeys(userId: number, keys: string[]): Promise<void> {
  const normalized = keys.map((k) => k.toLowerCase().trim()).filter(Boolean)
  if (normalized.length === 0) return
  const existing = await getDismissedVendorKeys(userId)
  for (const k of normalized) existing.add(k)
  await prisma.userSetting.upsert({
    where: { userId_key: { userId, key: DISMISSED_SETTING_KEY } },
    update: { value: [...existing] },
    create: { userId, key: DISMISSED_SETTING_KEY, value: [...existing] },
  })
}

/**
 * All currently-unmapped vendor keys (expense vendors not in VendorMapping and
 * not dismissed), lowercased — used for "Dismiss All".
 */
export async function getUnmappedVendorKeys(userId: number): Promise<string[]> {
  const profiles = await prisma.profile.findMany({ where: { userId }, select: { id: true } })
  const profileIds = profiles.map((p) => p.id)
  const expenses = await prisma.expense.findMany({
    where: { profileId: { in: profileIds }, vendor: { not: null }, deletedAt: null },
    select: { vendor: true },
  })
  const keys = new Set(expenses.map((e) => (e.vendor || "").toLowerCase().trim()).filter((k) => k && k !== "nan"))
  const mappings = await prisma.vendorMapping.findMany({ where: { userId }, select: { vendorKey: true } })
  for (const m of mappings) keys.delete(m.vendorKey)
  const dismissed = await getDismissedVendorKeys(userId)
  for (const k of dismissed) keys.delete(k)
  return [...keys]
}

export function resetVendorKeyCache(userId?: number) {
  if (userId) {
    cacheByUser.delete(userId)
    mapCacheByUser.delete(userId)
  } else {
    cacheByUser.clear()
    mapCacheByUser.clear()
  }
}

export { BUSINESS }
