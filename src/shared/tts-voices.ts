// ── Natural TTS voices (Microsoft Edge, server-side) ────────────────────
// Free, natural-sounding neural voices used by /api/tts. Shared by the server
// route and the client voice picker.

export interface EdgeVoice {
  id: string
  label: string
  lang: string
}

export const EDGE_VOICES: EdgeVoice[] = [
  { id: "en-IN-NeerjaNeural", label: "Neerja (English India, female)", lang: "en-IN" },
  { id: "en-IN-PrabhatNeural", label: "Prabhat (English India, male)", lang: "en-IN" },
  { id: "en-US-AriaNeural", label: "Aria (English US, female)", lang: "en-US" },
  { id: "en-GB-SoniaNeural", label: "Sonia (English UK, female)", lang: "en-GB" },
  { id: "hi-IN-SwaraNeural", label: "Swara (Hindi, female)", lang: "hi-IN" },
  { id: "hi-IN-MadhurNeural", label: "Madhur (Hindi, male)", lang: "hi-IN" },
  { id: "kn-IN-SapnaNeural", label: "Sapna (Kannada, female)", lang: "kn-IN" },
  { id: "ta-IN-PallaviNeural", label: "Pallavi (Tamil, female)", lang: "ta-IN" },
  { id: "te-IN-ShrutiNeural", label: "Shruti (Telugu, female)", lang: "te-IN" },
  { id: "bn-IN-TanishaaNeural", label: "Tanishaa (Bengali, female)", lang: "bn-IN" },
  { id: "mr-IN-AarohiNeural", label: "Aarohi (Marathi, female)", lang: "mr-IN" },
  { id: "gu-IN-DhwaniNeural", label: "Dhwani (Gujarati, female)", lang: "gu-IN" },
  { id: "ml-IN-SobhanaNeural", label: "Sobhana (Malayalam, female)", lang: "ml-IN" },
  { id: "ur-IN-GulNeural", label: "Gul (Urdu, female)", lang: "ur-IN" },
]

const DEFAULT_BY_LANG: Record<string, string> = {
  "en-IN": "en-IN-NeerjaNeural",
  en: "en-IN-NeerjaNeural",
  "en-US": "en-US-AriaNeural",
  "en-GB": "en-GB-SoniaNeural",
  "hi-IN": "hi-IN-SwaraNeural",
  "kn-IN": "kn-IN-SapnaNeural",
  "ta-IN": "ta-IN-PallaviNeural",
  "te-IN": "te-IN-ShrutiNeural",
  "bn-IN": "bn-IN-TanishaaNeural",
  "mr-IN": "mr-IN-AarohiNeural",
  "gu-IN": "gu-IN-DhwaniNeural",
  "ml-IN": "ml-IN-SobhanaNeural",
  "ur-IN": "ur-IN-GulNeural",
}

export const EDGE_VOICE_IDS = new Set(EDGE_VOICES.map((v) => v.id))

/** The default natural voice for a language code. */
export function defaultEdgeVoice(lang: string): string {
  return DEFAULT_BY_LANG[lang] ?? DEFAULT_BY_LANG[lang.slice(0, 2)] ?? "en-IN-NeerjaNeural"
}
