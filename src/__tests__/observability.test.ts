import { describe, it, expect } from "vitest"
import { parseSemVer, getVersionString } from "../lib/version"
import { captureError, captureMessage, getErrorStats } from "../lib/error-tracking"

describe("semver parsing", () => {
  it("parses basic MAJOR.MINOR.PATCH", () => {
    const sv = parseSemVer("1.2.3")
    expect(sv).toEqual({
      major: 1, minor: 2, patch: 3,
      prerelease: null, buildMeta: null, raw: "1.2.3",
    })
  })

  it("parses with prerelease (alpha)", () => {
    const sv = parseSemVer("1.0.0-alpha.1")
    expect(sv?.major).toBe(1)
    expect(sv?.minor).toBe(0)
    expect(sv?.patch).toBe(0)
    expect(sv?.prerelease).toBe("alpha.1")
  })

  it("parses with prerelease (rc)", () => {
    const sv = parseSemVer("2.1.0-rc.2")
    expect(sv?.prerelease).toBe("rc.2")
    expect(sv?.patch).toBe(0)
  })

  it("parses with build metadata", () => {
    const sv = parseSemVer("1.0.0+sha.abc123")
    expect(sv?.patch).toBe(0)
    expect(sv?.buildMeta).toBe("sha.abc123")
  })

  it("rejects invalid semver", () => {
    expect(parseSemVer("1.2")).toBe(null)
    expect(parseSemVer("v1.2.3")).toBe(null)
    expect(parseSemVer("abc")).toBe(null)
  })

  it("supports incrementing patch without resetting", () => {
    expect(parseSemVer("1.0.0")?.patch).toBe(0)
    expect(parseSemVer("1.0.5")?.patch).toBe(5)
    expect(parseSemVer("1.0.99")?.patch).toBe(99)
  })
})

describe("version display", () => {
  it("formats build info with build number and sha", () => {
    const s = getVersionString({ includeEnv: false, includeTime: false })
    expect(s).toMatch(/^v\d+\.\d+\.\d+/)
    expect(s).toContain("build")
  })
})

describe("error tracking", () => {
  it("captureError increments counter and records last time", () => {
    const before = getErrorStats().inMemoryErrorCount
    captureError(new Error("test 1"))
    captureError(new Error("test 2"))
    const after = getErrorStats().inMemoryErrorCount
    expect(after).toBe(before + 2)
    expect(getErrorStats().lastErrorAt).toBeTruthy()
  })

  it("captureMessage does not throw", () => {
    expect(() => captureMessage("hello", "info")).not.toThrow()
  })

  it("captureError handles non-Error values", () => {
    expect(() => captureError("string error")).not.toThrow()
    expect(() => captureError({ code: 500 })).not.toThrow()
    expect(() => captureError(null)).not.toThrow()
  })

  it("returns stats", () => {
    const stats = getErrorStats()
    expect(stats).toHaveProperty("sentryEnabled")
    expect(stats).toHaveProperty("inMemoryErrorCount")
    expect(stats).toHaveProperty("lastErrorAt")
  })
})
