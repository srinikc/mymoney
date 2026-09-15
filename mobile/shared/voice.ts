export interface SupportedLanguage {
  code: string
  name: string
  label: string
}

export const SUPPORTED_LANGUAGES: SupportedLanguage[] = [
  { code: "en-IN", name: "English", label: "English" },
  { code: "hi-IN", name: "Hindi", label: "हिन्दी" },
  { code: "kn-IN", name: "Kannada", label: "ಕನ್ನಡ" },
  { code: "ta-IN", name: "Tamil", label: "தமிழ்" },
  { code: "te-IN", name: "Telugu", label: "తెలుగు" },
  { code: "bn-IN", name: "Bengali", label: "বাংলা" },
  { code: "mr-IN", name: "Marathi", label: "मराठी" },
  { code: "ur-IN", name: "Urdu", label: "اردو" },
  { code: "ml-IN", name: "Malayalam", label: "മലയാളം" },
  { code: "gu-IN", name: "Gujarati", label: "ગુજરાતી" },
  { code: "pa-IN", name: "Punjabi", label: "ਪੰਜਾਬੀ" },
  { code: "or-IN", name: "Odia", label: "ଓଡ଼ିଆ" },
]

export function isSupportedLanguage(code: string): boolean {
  return SUPPORTED_LANGUAGES.some((l) => l.code === code)
}
