// ── Structured JSON Logger ──────────────────────────────────────────────
// Lightweight pino-style logger. Emits JSON to stdout for easy parsing
// by log aggregators (Loki, Axiom, Better Stack, CloudWatch).
//
// PII is automatically redacted: passwords, tokens, cookies, auth headers.

type Level = "trace" | "debug" | "info" | "warn" | "error" | "fatal"

interface LogContext {
  [key: string]: unknown
}

const LEVEL_RANK: Record<Level, number> = {
  trace: 10, debug: 20, info: 30, warn: 40, error: 50, fatal: 60,
}

const ENV_LEVEL: Level = (() => {
  const l = (process.env.LOG_LEVEL || "info").toLowerCase() as Level
  return l in LEVEL_RANK ? l : "info"
})()

const SERVICE = "mymoney"
const REDACT_KEYS = new Set([
  "password", "hashedPassword", "token", "access_token", "refresh_token",
  "id_token", "authorization", "cookie", "set-cookie", "secret", "apiKey", "api_key",
])
const REDACT_VALUE_RE = /(?:password|token|secret|api[_-]?key|authorization|cookie)/i

function redactValue(v: unknown): unknown {
  if (v == null) return v
  if (typeof v === "string") {
    if (v.length > 100) return v.slice(0, 30) + "...[TRUNCATED]"
    return v
  }
  return v
}

function redactCtx(ctx: LogContext): LogContext {
  const out: LogContext = {}
  for (const [k, v] of Object.entries(ctx)) {
    if (REDACT_KEYS.has(k)) {
      out[k] = "[REDACTED]"
    } else if (REDACT_VALUE_RE.test(k) && typeof v === "string") {
      out[k] = "[REDACTED]"
    } else {
      out[k] = redactValue(v)
    }
  }
  return out
}

function emit(level: Level, ctx: LogContext, msg: string) {
  if (LEVEL_RANK[level] < LEVEL_RANK[ENV_LEVEL]) return
  const record = {
    level,
    time: new Date().toISOString(),
    service: SERVICE,
    env: process.env.NODE_ENV || "development",
    msg,
    ...redactCtx(ctx),
  }
  const line = JSON.stringify(record)
  if (level === "error" || level === "fatal") {
    console.error(line)
  } else if (level === "warn") {
    console.warn(line)
  } else {
    console.log(line)
  }
}

interface Logger {
  trace: (ctx: LogContext, msg: string) => void
  debug: (ctx: LogContext, msg: string) => void
  info: (ctx: LogContext, msg: string) => void
  warn: (ctx: LogContext, msg: string) => void
  error: (ctx: LogContext, msg: string) => void
  fatal: (ctx: LogContext, msg: string) => void
  child: (bindings: LogContext) => Logger
}

function makeLogger(bindings: LogContext = {}): Logger {
  return {
    trace: (ctx, msg) => emit("trace", { ...bindings, ...ctx }, msg),
    debug: (ctx, msg) => emit("debug", { ...bindings, ...ctx }, msg),
    info: (ctx, msg) => emit("info", { ...bindings, ...ctx }, msg),
    warn: (ctx, msg) => emit("warn", { ...bindings, ...ctx }, msg),
    error: (ctx, msg) => emit("error", { ...bindings, ...ctx }, msg),
    fatal: (ctx, msg) => emit("fatal", { ...bindings, ...ctx }, msg),
    child: (b) => makeLogger({ ...bindings, ...b }),
  }
}

export const logger: Logger = makeLogger({ service: SERVICE, env: process.env.NODE_ENV })

// Helper: time an async operation and log the result
export async function timed<T>(label: string, fn: () => Promise<T>, extra: LogContext = {}): Promise<T> {
  const start = Date.now()
  try {
    const result = await fn()
    logger.info({ ...extra, label, durationMs: Date.now() - start }, `${label} ok`)
    return result
  } catch (e) {
    logger.error({ ...extra, label, durationMs: Date.now() - start, err: String(e) }, `${label} failed`)
    throw e
  }
}
