// ── Sherpa-ONNX Web KWS Wrapper ─────────────────────────────────────────
// Wraps Sherpa-ONNX WASM for keyword spotting in the browser.
// Initialization order:
//   1. Load sherpa-onnx-wasm-combined.js → creates Module, loads WASM binary
//   2. Wait for Module.calledRun (WASM runtime ready)
//   3. Load sherpa-onnx-combined.js → loads all JS modules (core, kws, etc.)
//   4. Wait for onSherpaOnnxReady callback
//   5. Use SherpaOnnx.KWS.loadModel() then createKeywordSpotter()

"use client"

let initialized = false
let initPromise: Promise<boolean> | null = null

/**
 * Initialize Sherpa-ONNX WASM (one-time, ~13MB binary + JS modules).
 * Returns true when the WASM runtime and all JS modules are ready.
 */
export async function initSherpaWasm(): Promise<boolean> {
  if (initialized) return true
  if (initPromise) return initPromise

  initPromise = new Promise<boolean>((resolve) => {
    const onReady = (ready: boolean) => {
      initialized = ready
      resolve(ready)
    }

    // Pre-seed the Emscripten Module with a locateFile hook BEFORE the wasm
    // glue script runs. The glue computes scriptDirectory from an async-injected
    // <script> tag as "" and would otherwise fetch "sherpa-onnx-wasm-combined.wasm"
    // relative to the page URL (a 404). Pointing locateFile at /wasm/ makes the
    // 13MB binary resolve correctly.
    const preExistingModule = (window as unknown as Record<string, unknown>).Module as Record<string, unknown> | undefined
    const baseModule = preExistingModule ?? {}
    baseModule.locateFile = (path: string) => `/wasm/${path}`
    ;(window as unknown as Record<string, unknown>).Module = baseModule

    let combinedLoaded = false

    // Load sherpa-onnx-combined.js, which loads the per-feature JS modules
    // (core, kws, ...) and finally invokes window.onSherpaOnnxReady(boolean).
    const loadCombinedModules = () => {
      if (combinedLoaded) return
      combinedLoaded = true

      // combined.js takes its "onRuntimeInitialized defined" branch and wraps
      // the hook. We replace the hook with a no-op first so that when we invoke
      // it after combined.js loads, it only runs initialize() — without chaining
      // back into this loader (which previously caused an infinite reload loop).
      const mod = (window as unknown as Record<string, unknown>).Module as
        | { onRuntimeInitialized?: () => void }
        | undefined
      if (mod) mod.onRuntimeInitialized = () => {}

      ;(window as unknown as Record<string, unknown>).onSherpaOnnxReady = (ready: boolean) => {
        onReady(ready)
      }

      const combinedScript = document.createElement("script")
      combinedScript.src = "/wasm/sherpa-onnx-combined.js"
      combinedScript.async = true
      combinedScript.addEventListener("load", () => {
        // combined.js has now wrapped Module.onRuntimeInitialized so that it
        // calls initialize(). Invoke it once to start loading the JS modules.
        try {
          const m = (window as unknown as Record<string, unknown>).Module as
            | { onRuntimeInitialized?: () => void }
            | undefined
          if (m && typeof m.onRuntimeInitialized === "function") {
            m.onRuntimeInitialized()
          } else {
            onReady(false)
          }
        } catch {
          onReady(false)
        }
      })
      combinedScript.addEventListener("error", () => onReady(false))
      document.head.append(combinedScript)
    }

    // Step 1: Load the WASM JS glue (creates Module, fetches .wasm binary)
    const wasmScript = document.createElement("script")
    wasmScript.src = "/wasm/sherpa-onnx-wasm-combined.js"
    wasmScript.async = true

    // The Emscripten glue sets Module.calledRun=true once the binary is
    // instantiated. Poll for that, then load the combined JS modules.
    const waitForModule = () => {
      let attempts = 0
      const poll = setInterval(() => {
        attempts++
        const m = (window as unknown as Record<string, unknown>).Module as
          | { calledRun?: boolean }
          | undefined
        if (m && m.calledRun) {
          clearInterval(poll)
          loadCombinedModules()
        } else if (attempts > 150) {
          // 15 seconds max for the ~13MB binary
          clearInterval(poll)
          onReady(false)
        }
      }, 100)
    }

    wasmScript.addEventListener("load", waitForModule)
    wasmScript.addEventListener("error", () => onReady(false))
    document.head.append(wasmScript)

    // Hard timeout — WASM download is ~13MB, give it 30s
    setTimeout(() => {
      if (!initialized) onReady(false)
    }, 30000)
  })

  return initPromise
}

export interface KwsInstance {
  processAudio: (samples: Float32Array) => string | null
  destroy: () => void
}

// ── Native object shapes ────────────────────────────────────────────────
// `sherpa-onnx-kws.js` defines these as non-strict IIFE constructors whose
// methods rely on `this`. They MUST be invoked as methods (`stream.accept(
// ...)`, `kws.isReady(stream)`) — destructuring a method into a local
// variable and calling it unbound silently binds `this` to the global object,
// making `this.handle` undefined (0). Every native call then uses handle 0,
// the stream never becomes ready, and wake word detection never fires.

interface KwsResult {
  keyword?: string
  [k: string]: unknown
}

interface KwsStream {
  handle: number
  acceptWaveform: (sampleRate: number, samples: Float32Array) => void
  inputFinished: () => void
  free: () => void
}

interface KwsSpotter {
  handle: number
  createStream: () => KwsStream
  isReady: (stream: KwsStream) => boolean
  decode: (stream: KwsStream) => void
  getResult: (stream: KwsStream) => KwsResult
  reset: (stream: KwsStream) => void
  free: () => void
}

/**
 * Create a KWS instance for wake word detection.
 * All model files are fetched from /kws-models/ and written to WASM virtual filesystem.
 *
 * @param keywordsFile - URL path to the keywords file (e.g. "/kws-models/.../mymoney_keywords.txt")
 * @param keywordsContent - Optional inline BPE token content. If provided, written to WASM FS
 *                          instead of fetching from keywordsFile URL. Format: "▁TO K E N S @label"
 */
export async function createKwsInstance(
  keywordsFile: string,
  keywordsContent?: string,
): Promise<KwsInstance | null> {
  const ready = await initSherpaWasm()
  if (!ready) return null

  const SherpaOnnx = (window as unknown as Record<string, unknown>).SherpaOnnx as Record<string, unknown> | undefined
  if (!SherpaOnnx) return null

  const kwsNamespace = SherpaOnnx.KWS as Record<string, unknown> | undefined
  if (!kwsNamespace) return null

  try {
    const MODEL_BASE = "/kws-models/sherpa-onnx-kws-zipformer-gigaspeech-3.3M-2024-01-01"

    // loadModel fetches files to WASM FS, returns paths for createKeywordSpotter.
    // The keywords file is only passed to loadModel when using the static file.
    // Dynamic (admin-configured) keywords are passed via options.keywords below,
    // which createKeywordSpotter writes into the WASM FS itself.
    const loadedModel = await (kwsNamespace.loadModel as (cfg: Record<string, unknown>) => Promise<Record<string, unknown>>)({
      // Single-level directory in the WASM virtual FS. The Emscripten FS cannot
      // create nested paths whose parents don't exist, so avoid mirroring the
      // /kws-models/<model>/ hierarchy here. Files are fetched from the full
      // MODEL_BASE URLs below and written to this flat directory.
      modelDir: "mymoney-kws",
      encoder: `${MODEL_BASE}/encoder-epoch-12-avg-2-chunk-16-left-64.int8.onnx`,
      decoder: `${MODEL_BASE}/decoder-epoch-12-avg-2-chunk-16-left-64.onnx`,
      joiner: `${MODEL_BASE}/joiner-epoch-12-avg-2-chunk-16-left-64.int8.onnx`,
      tokens: `${MODEL_BASE}/tokens.txt`,
      ...(keywordsContent ? {} : { keywordsFile }),
      debug: false,
    })

    const kws = (kwsNamespace.createKeywordSpotter as (model: Record<string, unknown>, opts?: Record<string, unknown>) => unknown)(loadedModel, {
      sampleRate: 16000,
      featureDim: 80,
      maxActivePaths: 4,
      keywordsScore: 1,
      keywordsThreshold: 0.25,
      numThreads: 1,
      debug: false,
      ...(keywordsContent ? { keywords: keywordsContent } : {}),
    }) as KwsSpotter

    const stream = kws.createStream()

    return {
      processAudio: (samples: Float32Array): string | null => {
        try {
          // Feed audio to the stream. Calls are bound to their objects so the
          // native methods see the correct `this` (and therefore handles).
          stream.acceptWaveform(16000, samples)

          while (kws.isReady(stream)) {
            kws.decode(stream)
          }

          const result = kws.getResult(stream)
          const keyword = result.keyword
          if (keyword) {
            kws.reset(stream)
            return keyword
          }
          return null
        } catch {
          return null
        }
      },
      destroy: () => {
        try {
          stream.free()
          kws.free()
        } catch { /* ignore */ }
      },
    }
  } catch (err) {
    console.error("Failed to create KWS instance:", err)
    return null
  }
}

let warmupPromise: Promise<void> | null = null

/**
 * Warm the browser cache for the wake-word WASM runtime + KWS model so the
 * first "enable wake word" is fast. Idempotent; safe to call repeatedly.
 */
export function warmupWakeWord(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve()
  if (warmupPromise) return warmupPromise
  warmupPromise = (async () => {
    const ready = await initSherpaWasm()
    if (!ready) return
    const base = "/kws-models/sherpa-onnx-kws-zipformer-gigaspeech-3.3M-2024-01-01"
    const files = [
      "encoder-epoch-12-avg-2-chunk-16-left-64.int8.onnx",
      "decoder-epoch-12-avg-2-chunk-16-left-64.onnx",
      "joiner-epoch-12-avg-2-chunk-16-left-64.int8.onnx",
      "tokens.txt",
    ]
    await Promise.allSettled(files.map((f) => fetch(`${base}/${f}`, { cache: "force-cache" })))
  })().catch(() => {
    // best-effort warmup
  })
  return warmupPromise
}
