import { test, expect } from "@playwright/test"
import path from "node:path"

// End-to-end wake word detection: Chromium's fake microphone plays a WAV that
// contains the wake word, exercising the real microphone → AudioContext →
// AudioWorklet → Sherpa-ONNX KWS path. No application test hooks are used.
const WAKE_WORD_WAV = path.resolve(
  process.cwd(),
  "public/kws-models/sherpa-onnx-kws-zipformer-gigaspeech-3.3M-2024-01-01/test_wavs/0.wav",
)

// "0.wav" from the model's test set speaks "LIGHT UP".
const AUDIO_PHRASE = "LIGHT UP"
const DEFAULT_PHRASE = "Hey MyMoney"

test.use({
  permissions: ["microphone"],
  launchOptions: {
    args: [
      "--use-fake-ui-for-media-stream",
      "--use-fake-device-for-media-stream",
      `--use-file-for-fake-audio-capture=${WAKE_WORD_WAV}`,
      "--autoplay-policy=no-user-gesture-required",
    ],
  },
})

test.describe("Wake word", () => {
  test("wake word API validates and persists the phrase", async ({ request }) => {
    const invalid = await request.put("/api/admin/wake-word", { data: { phrase: "###" } })
    expect(invalid.status()).toBe(400)

    const valid = await request.put("/api/admin/wake-word", { data: { phrase: DEFAULT_PHRASE } })
    expect(valid.ok()).toBeTruthy()
    const body = await valid.json()
    expect(body.phrase).toBe(DEFAULT_PHRASE)
    expect(body.bpeTokens).toBe("▁HE Y ▁MY M ONE Y")

    const get = await request.get("/api/admin/wake-word")
    expect(get.ok()).toBeTruthy()
    expect((await get.json()).phrase).toBe(DEFAULT_PHRASE)
  })

  test("detects the configured wake word from microphone audio and opens the assistant", async ({ page, request }) => {
    test.setTimeout(180_000)

    // Match the wake word to the spoken audio in the fake microphone file.
    const configure = await request.put("/api/admin/wake-word", { data: { phrase: AUDIO_PHRASE } })
    expect(configure.ok()).toBeTruthy()

    try {
      await page.goto("/", { waitUntil: "load", timeout: 30_000 })
      await page.evaluate(() => localStorage.setItem("mymoney-tutorial-shown", "true"))
      await page.waitForTimeout(2_000)
      await page.reload({ waitUntil: "load" })

      const enable = page.locator("button[title*='Enable wake word']").first()
      await enable.waitFor({ timeout: 30_000 })
      await enable.click()

      // WASM + 3.3M model download on first run can take a while.
      await page.locator("button[title*='Wake word active']").first().waitFor({ timeout: 120_000 })

      // The fake microphone loops 0.wav, so the wake word is heard repeatedly.
      // The panel has two "MyMoney Assistant" headings (header + welcome).
      await expect(page.getByRole("heading", { name: "MyMoney Assistant" }).first()).toBeVisible({ timeout: 90_000 })
    } finally {
      await request.put("/api/admin/wake-word", { data: { phrase: DEFAULT_PHRASE } })
    }
  })
})
