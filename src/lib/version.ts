// ── MyMoney Version ──────────────────────────────────────────────────────
// Industry standard Semantic Versioning (semver 2.0.0):
//   MAJOR.MINOR.PATCH
//     - MAJOR: breaking changes, schema migrations
//     - MINOR: new features, new API routes (backward-compatible)
//     - PATCH: bug fixes, small improvements
//
// Build number is SEPARATE from version — it's the git commit count and
// always increments per build. Not part of the version string itself.
//
// Examples:
//   Version:    "1.2.3"  (manual, bumped when releasing)
//   Build:      "47"     (auto = git rev-list --count HEAD)
//   Display:    "v1.2.3 · build 47 · a1b2c3d"
//
// In dev: build number from local git count.
// In Vercel: VERCEL_GIT_COMMIT_SHA is auto-injected; we use that for SHA.

import packageInfo from "../../package.json"

// Fallback order: NEXT_PUBLIC_* (from script) → VERCEL_* (auto in Vercel)
const COMMIT_COUNT_ENV = process.env.NEXT_PUBLIC_COMMIT_COUNT
const COMMIT_SHA_ENV =
  process.env.NEXT_PUBLIC_COMMIT_SHA || process.env.VERCEL_GIT_COMMIT_SHA || ""
const BUILD_TIME_ENV =
  process.env.NEXT_PUBLIC_BUILD_TIME || process.env.VERCEL_BUILD_TIME || ""
const BRANCH_ENV = process.env.NEXT_PUBLIC_BUILD_BRANCH || process.env.VERCEL_GIT_COMMIT_REF || ""
const NODE_ENV = process.env.NODE_ENV || "development"

export const APP_VERSION: string = packageInfo.version

// Parse semver "MAJOR.MINOR.PATCH[-prerelease][+build]"
// Returns null on parse failure (defensive — package.json should be valid)
export interface SemVer {
  major: number
  minor: number
  patch: number
  prerelease: string | null
  buildMeta: string | null
  raw: string
}

export function parseSemVer(v: string): SemVer | null {
  const match = v.match(/^(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z-.]+))?(?:\+([0-9A-Za-z-.]+))?$/)
  if (!match) return null
  return {
    major: Number(match[1]),
    minor: Number(match[2]),
    patch: Number(match[3]),
    prerelease: match[4] ?? null,
    buildMeta: match[5] ?? null,
    raw: v,
  }
}

export const SEMVER: SemVer | null = parseSemVer(APP_VERSION)

/** Build number = git commit count. Auto-generated. */
export const BUILD_NUMBER: string = COMMIT_COUNT_ENV || "0"

/** Short commit SHA (first 7 chars), e.g. "a1b2c3d" */
export const BUILD_SHA: string = COMMIT_SHA_ENV
  ? COMMIT_SHA_ENV.slice(0, 7)
  : "dev"

/** ISO timestamp of when the build was produced. */
export const BUILD_TIME: string = BUILD_TIME_ENV || ""

/** Branch / ref name (e.g. "main", "develop") */
export const BUILD_BRANCH: string = BRANCH_ENV || ""

/** Environment (production / preview / development) */
export const BUILD_ENV: string = NODE_ENV

/** Combined build id, e.g. "47.a1b2c3d" */
export const BUILD_ID: string = `${BUILD_NUMBER}.${BUILD_SHA}`

/** Full version id, e.g. "1.2.3+47.a1b2c3d" — semver with build metadata */
export const FULL_VERSION: string = `${APP_VERSION}+${BUILD_ID}`

/** Git tag that would represent this build (without build metadata) */
export const VERSION_TAG: string = `v${APP_VERSION}`

export function getVersionString(opts?: { includeTime?: boolean; includeEnv?: boolean; includeBranch?: boolean }): string {
  const parts: string[] = [VERSION_TAG, `build ${BUILD_ID}`]
  if (opts?.includeBranch && BUILD_BRANCH) parts.push(BUILD_BRANCH)
  if (opts?.includeEnv && BUILD_ENV !== "production") parts.push(`(${BUILD_ENV})`)
  if (opts?.includeTime && BUILD_TIME) parts.push(`built ${BUILD_TIME}`)
  return parts.join(" · ")
}

export interface VersionInfo {
  // Semver components
  version: string
  major: number | null
  minor: number | null
  patch: number | null
  prerelease: string | null

  // Build metadata (separate from version)
  buildNumber: string
  buildSha: string
  buildTime: string
  buildEnv: string
  buildBranch: string
  isVercel: boolean

  // Combined
  buildId: string
  fullVersion: string
  versionTag: string

  // Display
  display: string
  nodeEnv: string
}

export function getVersionInfo(): VersionInfo {
  const sv = SEMVER
  return {
    version: APP_VERSION,
    major: sv?.major ?? null,
    minor: sv?.minor ?? null,
    patch: sv?.patch ?? null,
    prerelease: sv?.prerelease ?? null,
    buildNumber: BUILD_NUMBER,
    buildSha: BUILD_SHA,
    buildTime: BUILD_TIME,
    buildEnv: BUILD_ENV,
    buildBranch: BUILD_BRANCH,
    isVercel: Boolean(process.env.VERCEL),
    buildId: BUILD_ID,
    fullVersion: FULL_VERSION,
    versionTag: VERSION_TAG,
    display: getVersionString({ includeTime: true, includeEnv: true, includeBranch: true }),
    nodeEnv: NODE_ENV,
  }
}
