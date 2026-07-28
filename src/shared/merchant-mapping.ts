import { prisma } from "@/lib/prisma"

const BUSINESS = /\b(medicals|hospital|clinic|pharmacy|chemist|dental|optical|store|mart|bazaar|hotel|restaurant|cafe|bakery|canteen|traders|enterprises|solutions|services|technologies|industries|brothers|sons|agencies|associates|pvt|ltd|corp|limited|salon|spa|gym|academy|institute|temple|church|pharma|diagnostics|lab|garage|workshop|textiles|garments|jewellery|jewelers|travels|tours|finance|insurance|builders|constructions|automobiles|motors|supermarket|hypermarket|communications|electronics|furniture|interiors|provisions|cabs|taxi|logistics|courier|transport|parlour|parlor)\b/i

let existingKeysCache: Set<string> | null = null

export async function getExistingMappingKeys(): Promise<Set<string>> {
  if (!existingKeysCache) {
    const mappings = await prisma.merchantMapping.findMany({ select: { merchantKey: true } })
    existingKeysCache = new Set(mappings.map((m) => m.merchantKey))
  }
  return existingKeysCache
}

export function shouldAutoMap(vendor: string, desc: string, existingKeys: Set<string>): boolean {
  if (vendor.length < 2 || vendor.length > 40) return false
  if (existingKeys.has(vendor.toLowerCase().trim())) return true
  if (BUSINESS.test(vendor)) return true
  const cameFromDash = desc.includes(" - ") && desc.split(" - ")[0].trim().toLowerCase() === vendor.toLowerCase()
  if (cameFromDash && vendor.includes(" ")) return true
  return false
}

export function resetMappingCache() {
  existingKeysCache = null
}

export { BUSINESS }
