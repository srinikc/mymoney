// ── Sentry Error Tracking ────────────────────────────────────────────────
// Stub for Sentry integration. To enable:
//   1. npm install @sentry/nextjs
//   2. Run: npx @sentry/wizard@latest
//   3. Set NEXT_PUBLIC_SENTRY_DSN env var
//
// Or use any other error tracking service (Rollbar, Bugsnag, Bugsnag) by
// replacing the body of captureError().
//
// For now, we log to console + a stub local error queue so the rest of
// the app can call captureError() unconditionally.

import { logger } from "./logger"

interface ErrorContext {
  userId?: number
  profileId?: number
  route?: string
  method?: string
  statusCode?: number
  [key: string]: unknown
}

const SENTRY_DSN = process.env.NEXT_PUBLIC_SENTRY_DSN
const SENTRY_ENABLED = Boolean(SENTRY_DSN)

let inMemoryErrorCount = 0
let lastErrorAt: string | null = null

/**
 * Report an error to the configured error tracking service.
 * Falls back to logger.error if Sentry is not configured.
 *
 * In production, set NEXT_PUBLIC_SENTRY_DSN to enable automatic Sentry
 * reporting. Otherwise errors are only logged locally.
 */
export function captureError(error: unknown, context: ErrorContext = {}): void {
  const err = error instanceof Error ? error : new Error(String(error))
  inMemoryErrorCount++
  lastErrorAt = new Date().toISOString()

  logger.error(
    {
      ...context,
      errMessage: err.message,
      errStack: err.stack,
      errName: err.name,
    },
    `error: ${err.message}`,
  )

  // If Sentry is configured, the @sentry/nextjs package will auto-capture
  // unhandled errors. For manual capture, replace this stub:
  // if (SENTRY_ENABLED) {
  //   Sentry.captureException(err, { extra: context })
  // }
}

export function captureMessage(message: string, level: "info" | "warning" | "error" = "info", context: ErrorContext = {}): void {
  logger.info({ ...context, msgLevel: level }, message)
  // if (SENTRY_ENABLED) Sentry.captureMessage(message, level)
}

export function getErrorStats() {
  return {
    sentryEnabled: SENTRY_ENABLED,
    sentryDsn: SENTRY_DSN ? `${SENTRY_DSN.slice(0, 12)}...` : null,
    inMemoryErrorCount,
    lastErrorAt,
  }
}
