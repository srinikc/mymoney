// Port of the per-bank description parsers from run_pipeline_v43.py.
// A bank narration returns a (merchant, context) pair where `context` is the
// note the user typed in the GPay app — text the GPay import does not retain.

const SKIP_CTX = new Set(["UPI", "NA", "", "SENT", "STATICQR", "RECEIVED", "NRI", "EXPENSES", "COLLECT", "NAN"])

const OWN_VPAS = new Set(["srinikc", "srinikc-1", "srinikc-2", "srinikc-3"])

const VPA_PERSON_MAP: Record<string, string> = {
  "kishankabadis": "Kishan Kabadi S",
  "vinuthakabadi-1": "Vinutha K",
  "vinuthakabadi-2": "Vinutha K",
  "vinuthakabadi-3": "Vinutha K",
  "vinuthakabadi": "Vinutha K",
  "srinikc-2": "Srinikc",
  "srinikc-3": "Srinikc",
  "srinikc-1": "Srinikc",
  "srinikc": "Srinikc",
}

interface ParsedDesc {
  merchant: string
  context: string
  selfTransfer?: boolean
}

const clean = (text: string, maxLen = 50): string => {
  const t = text.replaceAll(/\b[\dA-Fa-f]{12,}\b/g, "").replaceAll(/\s{2,}/g, " ").trim()
  return t.slice(0, maxLen)
}

const isSelfTransfer = (username: string): boolean => {
  const u = username.toLowerCase().split("@")[0].trim()
  return [...OWN_VPAS].some((own) => u === own || u.startsWith(own + "-"))
}

const vpaToPerson = (vpa: string): string => {
  const u = vpa.toLowerCase().split("@")[0].trim()
  for (const [key, name] of Object.entries(VPA_PERSON_MAP)) {
    if (u === key || u.startsWith(key)) return name
  }
  return vpa.split("@")[0].replaceAll(/[_-]/g, " ").split(/\s+/).map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ")
}

export function buildDescription(merchant: string, context: string): string {
  const m = (merchant || "").trim()
  const c = (context || "").trim()
  if (m && c) return `${m} - ${c}`
  return m || c || ""
}

/** Returns just the merchant part (before the " - " separator) for matching keys. */
export function merchantKeyFromDesc(description: string): string {
  if (!description || String(description).trim() === "") return ""
  return String(description).split(" - ")[0].trim()
}

function title(text: string): string {
  return text.replaceAll(/([\dA-Za-z])([A-Z])/g, "$1 $2").replaceAll(/\s+/g, " ").trim()
}

function skipCtx(context: string): boolean {
  return SKIP_CTX.has(context.toUpperCase()) || /BANK|LIMITED/.test(context.toUpperCase() || "")
}

// Yes Bank narration: "UPI/DR/.../ To:vpa/ context" or IMPS/ACH/NEFT forms.
export function parseYesBankDesc(raw: string): ParsedDesc {
  const text = String(raw).replaceAll(/\s+/g, " ").trim()

  const upi = text.match(/to:([^\s/]+)(?:\/\s*(.+?))?$/i)
  if (upi) {
    const toVpa = upi[1].trim()
    const context = upi[2] ? upi[2].trim().replaceAll(/\s+/g, " ") : ""
    const username = toVpa.split("@")[0].toLowerCase()
    if (isSelfTransfer(username)) return { merchant: "", context: "", selfTransfer: true }
    const merchant = vpaToPerson(toVpa)
    let ctx = title(context)
    if (ctx === "" || SKIP_CTX.has(ctx.toUpperCase()) || /BANK|LIMITED/.test(ctx.toUpperCase())) {
      ctx = ""
    }
    return { merchant, context: ctx }
  }

  const imps = text.match(/imps\/\s*([\d &.a-z]+?)\s*\//i)
  if (imps) return { merchant: title(imps[1]), context: "" }

  const ach = text.match(/ach\s+dr\s+(.+)/i)
  if (ach) {
    const name = ach[1].split(/\d{3,}/)[0].trim()
    return { merchant: title(name), context: "" }
  }

  const neft = text.match(/neft\s+cr-[^-]+-([a-z][^-]+)-/i)
  if (neft) return { merchant: title(neft[1]), context: "" }

  return { merchant: clean(text, 40), context: "" }
}

// Axis narration: "upi/p2a/.../merchant/context", "IMPS/P2M/...".
export function parseAxisDesc(raw: string): ParsedDesc {
  const text = String(raw).replaceAll(/\s+/g, " ").trim()

  const upi = text.match(/^upi\/p2[am]\/(.+)/i)
  if (upi) {
    const parts = text.split("/").map((p) => p.trim())
    const segments = parts.filter(Boolean)
    // Typical: UPI, P2A, <ref>, <merchant>, <context>, ...
    const merchantIdx = 3
    if (segments.length > merchantIdx) {
      const merchant = title(segments[merchantIdx])
      let ctx = segments.length > merchantIdx + 1 ? title(segments[merchantIdx + 1]) : ""
      if (skipCtx(ctx)) ctx = ""
      return { merchant, context: ctx }
    }
  }

  const imps = text.match(/imps\/p2[amr]\/\d+\/([a-z][^/]+)/i)
  if (imps) return { merchant: title(imps[1]), context: "" }

  return { merchant: clean(text, 40), context: "" }
}

// HDFC narration: "UPI-<merchant>-...-<context>" or generic.
export function parseHdfcDesc(raw: string): ParsedDesc {
  const text = String(raw).replaceAll(/\s+/g, " ").trim()

  const upi = text.match(/^upi-(.*)/i)
  if (upi) {
    const parts = text.split("-").map((p) => p.trim())
    if (parts.length >= 2) {
      const merchant = title(parts[1])
      const last = (parts.at(-1) ?? "").trim()
      let ctx = last && !/^[\d+.e]+$/.test(last) && last.length > 2 ? title(last) : ""
      if (SKIP_CTX.has(ctx.toUpperCase())) ctx = ""
      return { merchant, context: ctx }
    }
  }

  return { merchant: clean(text, 40), context: "" }
}

// SBI narration: "UPI/DR/<ref>/merchant/<ref>/ctx AT ..." or POS forms.
export function parseSbiDesc(raw: string): ParsedDesc {
  const text = String(raw).replaceAll(/\s+/g, " ").replaceAll('\n', " ").replaceAll('"', "").trim()

  const upi = text.match(/upi\/dr\/[\d+.e]+\/([^/]+)\/[^/]+\/(\S+)\s*(.*?)(?:\s+[\d.]+\s+at\s|\s+at\s|$)/i)
  if (upi) {
    const merchant = title(upi[1])
    let ctx = title(upi[3] || "")
    ctx = ctx.replace(/\bat\b.*$/i, "").trim()
    if (SKIP_CTX.has(ctx.toUpperCase()) || /^[\d\s.]+$/.test(ctx)) ctx = ""
    return { merchant, context: ctx }
  }

  const pos = text.match(/pos\s+\w+\s+([a-z][\d &.a-z]+)/i)
  if (pos) return { merchant: title(pos[1]), context: "" }

  return { merchant: clean(text, 40), context: "" }
}

export function parseBankDesc(bank: string, narration: string): ParsedDesc {
  switch (bank) {
    case "yesbank": return parseYesBankDesc(narration)
    case "axis": return parseAxisDesc(narration)
    case "hdfc": return parseHdfcDesc(narration)
    case "sbi": return parseSbiDesc(narration)
    default: {
      // Best-effort: try each parser, keep the first that yields a non-blank merchant.
      const candidates = [parseYesBankDesc, parseAxisDesc, parseHdfcDesc, parseSbiDesc].map((fn) => fn(narration))
      const withCtx = candidates.find((c) => c.context && !c.selfTransfer)
      if (withCtx) return withCtx
      const withMerchant = candidates.find((c) => c.merchant && !c.selfTransfer && !/\d{6,}/.test(c.merchant))
      return withMerchant ?? { merchant: clean(narration, 40), context: "" }
    }
  }
}