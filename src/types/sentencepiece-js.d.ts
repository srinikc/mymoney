// Type declarations for sentencepiece-js (no official types shipped).
// We only use SentencePieceProcessor.load / encodePieces, which return plain
// JS values — no `any` leaks into the app.
declare module "sentencepiece-js" {
  export class SentencePieceProcessor {
    load(path: string): Promise<boolean>
    /** Encode text to BPE piece strings (e.g. ["▁HE","Y",...]) */
    encodePieces(text: string): string[]
    /** Encode text to piece IDs */
    encodeIds(text: string): number[]
  }
}