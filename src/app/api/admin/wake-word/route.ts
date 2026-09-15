import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { requireRole, type AuthUser } from "@/lib/roles"
import { getConfig, setConfig } from "@/lib/get-config"
import { loadSentencePiece, phraseToBpeTokens, loadVocabulary, validateTokens } from "@/lib/bpe-tokenizer"
import path from "node:path"

const MODEL_DIR = path.join(process.cwd(), "public", "kws-models", "sherpa-onnx-kws-zipformer-gigaspeech-3.3M-2024-01-01")
const DEFAULT_PHRASE = "Hey My Money"

export async function GET() {
  try {
    // Anyone authenticated can read the current wake word (needed for client-side detection)
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 })
    }

    const userId = Number(session.user.id)
    const phrase = (await getConfig("WAKE_WORD_PHRASE", userId)) || DEFAULT_PHRASE

    // Generate BPE tokens for the client
    const sp = await loadSentencePiece(MODEL_DIR)
    const bpeTokens = await phraseToBpeTokens(phrase, sp)

    return NextResponse.json({
      phrase,
      bpeTokens: bpeTokens || undefined,
    })
  } catch {
    return NextResponse.json({ phrase: DEFAULT_PHRASE })
  }
}

export async function PUT(req: Request) {
  const session = await auth()
  const forbid = requireRole(session?.user as AuthUser, "admin")
  if (forbid) return forbid

  try {
    const body = await req.json()
    const phrase = typeof body.phrase === "string" ? body.phrase.trim() : ""

    if (!phrase) {
      return NextResponse.json({ error: "Phrase is required" }, { status: 400 })
    }

    if (phrase.length > 50) {
      return NextResponse.json({ error: "Phrase must be 50 characters or fewer" }, { status: 400 })
    }

    // Validate phrase only contains supported characters (letters, spaces, numbers)
    if (!/^[\d\sA-Za-z]+$/.test(phrase)) {
      return NextResponse.json({ error: "Phrase can only contain letters, numbers, and spaces" }, { status: 400 })
    }

    // Tokenize the phrase using the model's SentencePiece BPE
    const sp = await loadSentencePiece(MODEL_DIR)
    const bpeTokens = await phraseToBpeTokens(phrase, sp)

    if (!bpeTokens) {
      return NextResponse.json({
        error: "Could not tokenize this phrase. Try a simpler phrase with common English words.",
      }, { status: 400 })
    }

    // Validate all tokens exist in the vocabulary
    const vocab = await loadVocabulary(MODEL_DIR)
    const tokenArray = bpeTokens.split(" ")
    const validation = validateTokens(tokenArray, vocab)
    if (!validation.valid) {
      return NextResponse.json({
        error: `Some words cannot be recognized by the speech model: ${validation.invalidTokens.join(", ")}. Try a different phrase.`,
        bpeTokens,
      }, { status: 400 })
    }

    // Save to DB
    const userId = Number(session!.user!.id)
    await setConfig(userId, "WAKE_WORD_PHRASE", phrase)

    return NextResponse.json({
      ok: true,
      phrase,
      bpeTokens,
      message: "Wake word updated. All users will use this phrase on their next page load.",
    })
  } catch (e) {
    console.error("wake-word PUT error:", e)
    return NextResponse.json({ error: "internal error" }, { status: 500 })
  }
}
