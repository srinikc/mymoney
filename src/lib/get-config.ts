import { prisma } from "./prisma"

export type ConfigKey =
  | "OPENAI_API_KEY"
  | "ANTHROPIC_API_KEY"
  | "OPENCODE_API_KEY"
  | "LLM_PROVIDER"
  | "LLM_MODEL"
  | "LLM_BASE_URL"
  | "LOCAL_LLM_ENDPOINT"
  | "AUTH_RESEND_KEY"
  | "ZERODHA_API_KEY"
  | "ZERODHA_API_SECRET"
  | "SHAREKHAN_API_KEY"
  | "SHAREKHAN_API_SECRET"
  | "NEXT_PUBLIC_BASE_URL"
  | "AUTH_GOOGLE_ID"
  | "AUTH_GOOGLE_SECRET"
  | "DATABASE_URL"
  | "AUTH_SECRET"

const ENV_FALLBACK: Record<string, string | undefined> = {
  OPENAI_API_KEY: process.env.OPENAI_API_KEY,
  ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
  OPENCODE_API_KEY: process.env.OPENCODE_API_KEY,
  LLM_PROVIDER: process.env.LLM_PROVIDER || "openai",
  LLM_MODEL: process.env.LLM_MODEL,
  LLM_BASE_URL: process.env.LLM_BASE_URL,
  LOCAL_LLM_ENDPOINT: process.env.LOCAL_LLM_ENDPOINT,
  AUTH_RESEND_KEY: process.env.AUTH_RESEND_KEY,
  ZERODHA_API_KEY: process.env.ZERODHA_API_KEY,
  ZERODHA_API_SECRET: process.env.ZERODHA_API_SECRET,
  SHAREKHAN_API_KEY: process.env.SHAREKHAN_API_KEY,
  SHAREKHAN_API_SECRET: process.env.SHAREKHAN_API_SECRET,
  NEXT_PUBLIC_BASE_URL: process.env.NEXT_PUBLIC_BASE_URL || process.env.NEXT_PUBLIC_APP_URL,
  AUTH_GOOGLE_ID: process.env.AUTH_GOOGLE_ID || process.env.GOOGLE_CLIENT_ID,
  AUTH_GOOGLE_SECRET: process.env.AUTH_GOOGLE_SECRET || process.env.GOOGLE_CLIENT_SECRET,
}

export async function getConfig(key: ConfigKey, userId?: number): Promise<string | undefined> {
  // Try DB first if userId is provided
  if (userId) {
    try {
      const setting = await prisma.userSetting.findUnique({
        where: { userId_key: { userId, key: `config_${key}` } },
        select: { value: true },
      })
      if (setting?.value && typeof setting.value === "string") {
        return setting.value
      }
    } catch {
      // DB unavailable, fall through
    }
  }

  // Fall back to env
  return ENV_FALLBACK[key]
}

export async function getAllConfig(userId: number): Promise<Record<string, string | undefined>> {
  const keys: ConfigKey[] = [
    "OPENAI_API_KEY", "ANTHROPIC_API_KEY", "OPENCODE_API_KEY", "LLM_PROVIDER", "LLM_MODEL", "LLM_BASE_URL", "LOCAL_LLM_ENDPOINT",
    "AUTH_RESEND_KEY",
    "ZERODHA_API_KEY", "ZERODHA_API_SECRET",
    "SHAREKHAN_API_KEY", "SHAREKHAN_API_SECRET",
    "NEXT_PUBLIC_BASE_URL", "AUTH_GOOGLE_ID", "AUTH_GOOGLE_SECRET",
  ]

  // Load DB settings
  const dbSettings = await prisma.userSetting.findMany({
    where: { userId, key: { startsWith: "config_" } },
    select: { key: true, value: true },
  })

  const dbMap: Record<string, string> = {}
  for (const s of dbSettings) {
    const k = s.key.replace("config_", "")
    if (typeof s.value === "string") dbMap[k] = s.value
  }

  const result: Record<string, string | undefined> = {}
  for (const key of keys) {
    result[key] = dbMap[key] || ENV_FALLBACK[key]
  }
  return result
}

export async function setConfig(userId: number, key: ConfigKey, value: string): Promise<void> {
  await prisma.userSetting.upsert({
    where: { userId_key: { userId, key: `config_${key}` } },
    create: { userId, key: `config_${key}`, value },
    update: { value },
  })
}

export const BOOT_CONFIG_KEYS: { key: string; label: string; sensitive: boolean; editable: boolean; description: string }[] = [
  { key: "DATABASE_URL", label: "Database URL", sensitive: true, editable: false, description: "PostgreSQL connection string. Set via .env only." },
  { key: "AUTH_SECRET", label: "Auth Secret", sensitive: true, editable: false, description: "NextAuth JWT signing secret. Set via .env only." },
  { key: "NEXT_PUBLIC_BASE_URL", label: "App URL", sensitive: false, editable: true, description: "Public URL for OAuth redirects. Can be overridden here." },
  { key: "AUTH_GOOGLE_ID", label: "Google Client ID", sensitive: true, editable: true, description: "Google OAuth client ID. Can be overridden here." },
  { key: "AUTH_GOOGLE_SECRET", label: "Google Client Secret", sensitive: true, editable: true, description: "Google OAuth client secret. Can be overridden here." },
]
