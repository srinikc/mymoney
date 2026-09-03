import { describe, it, expect } from "vitest"
import { parseSemVer, getVersionString } from "../lib/version"

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
    expect(sv?.patch).toBe(0) // patch is reset when bumping to 2.1
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
})

describe("version display", () => {
  it("formats build info with build number and sha", () => {
    const s = getVersionString({ includeEnv: false, includeTime: false })
    // Should contain version tag like "v1.0.0" and "build N.xxx"
    expect(s).toMatch(/^v\d+\.\d+\.\d+/)
    expect(s).toContain("build")
  })
})
