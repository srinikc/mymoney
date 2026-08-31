import { z } from "zod"

export const SUPPORTED_LANGUAGES = [
  { code: "en", label: "English" },
  { code: "hi", label: "हिन्दी (Hindi)" },
  { code: "ta", label: "தமிழ் (Tamil)" },
  { code: "kn", label: "ಕನ್ನಡ (Kannada)" },
  { code: "te", label: "తెలుగు (Telugu)" },
  { code: "gu", label: "ગુજરાતી (Gujarati)" },
] as const

export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number]["code"]

export const OCCUPATIONS = [
  "student",
  "professional",
  "freelancer",
  "business",
  "retired",
  "homemaker",
  "other",
] as const

export const LANGUAGE_CODES = SUPPORTED_LANGUAGES.map((l) => l.code) as [
  SupportedLanguage,
  ...SupportedLanguage[],
]

const monthYear = z
  .object({
    month: z.number().int().min(1).max(12),
    year: z.number().int().min(1900).max(new Date().getFullYear()),
  })
  .nullable()
  .optional()

export const ProfileUpdateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  isDefault: z.boolean().optional(),
  dateOfBirth: monthYear,
  annualIncome: z.number().nonnegative().nullable().optional(),
  occupation: z.enum(OCCUPATIONS).nullable().optional(),
  language: z.enum(LANGUAGE_CODES).optional(),
})

export const ProfilePutSchema = z.object({
  name: z.string().min(1).max(100),
  isDefault: z.boolean().default(false),
  dateOfBirth: monthYear,
  annualIncome: z.number().nonnegative().nullable(),
  occupation: z.enum(OCCUPATIONS).nullable(),
  language: z.enum(LANGUAGE_CODES).default("en"),
})

export const ProfileResponseSchema = z.object({
  id: z.number(),
  name: z.string(),
  userId: z.number(),
  isDefault: z.boolean(),
  dateOfBirth: z.string().nullable(),
  annualIncome: z.number().nullable(),
  monthlyIncome: z.number().nullable(),
  occupation: z.string().nullable(),
  age: z.number().nullable(),
  language: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
})

export type ProfileUpdate = z.infer<typeof ProfileUpdateSchema>
export type ProfilePut = z.infer<typeof ProfilePutSchema>
export type ProfileResponse = z.infer<typeof ProfileResponseSchema>

export function dateOfBirthFromMonthYear(input?: { month: number; year: number } | null): Date | null {
  if (!input) return null
  return new Date(Date.UTC(input.year, input.month - 1, 1, 0, 0, 0))
}

export function monthYearFromDate(d: Date | null | undefined): { month: number; year: number } | null {
  if (!d) return null
  return { month: d.getUTCMonth() + 1, year: d.getUTCFullYear() }
}

export function calculateAge(d: Date | null | undefined): number | null {
  if (!d) return null
  const now = new Date()
  let age = now.getUTCFullYear() - d.getUTCFullYear()
  const monthDiff = now.getUTCMonth() - d.getUTCMonth()
  if (monthDiff < 0 || (monthDiff === 0 && now.getUTCDate() < d.getUTCDate())) {
    age--
  }
  return age >= 0 && age < 150 ? age : null
}
