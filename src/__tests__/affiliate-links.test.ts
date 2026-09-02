import { describe, it, expect } from "vitest"
import { buildAffiliateUrl, AFFILIATE_LINKS } from "../lib/affiliate-links"

describe("buildAffiliateUrl", () => {
  it("appends referral param", () => {
    const url = buildAffiliateUrl("kuvera", "/explore", { idKey: "default" })
    expect(url).toContain("ref=")
    expect(url).toContain("utm_source=mymoney")
  })

  it("appends UTM params", () => {
    const url = buildAffiliateUrl("groww", "/mutual-funds", { utmSource: "test" })
    expect(url).toContain("utm_source=mymoney")
    expect(url).toContain("utm_medium=affiliate")
    expect(url).toContain("utm_campaign=test")
  })

  it("handles direct platform without UTM", () => {
    const url = buildAffiliateUrl("direct", "/")
    expect(url).not.toContain("utm_")
  })
})

describe("AFFILIATE_LINKS", () => {
  it("kuveraHome returns kuvera URL", () => {
    const url = AFFILIATE_LINKS.kuveraHome()
    expect(url).toContain("kuvera.in")
    expect(url).toContain("utm_source=mymoney")
  })

  it("growwMutualFunds returns groww URL", () => {
    const url = AFFILIATE_LINKS.growwMutualFunds()
    expect(url).toContain("groww.in")
    expect(url).toContain("/mutual-funds")
  })

  it("bankbazaarHomeLoan returns bankbazaar URL", () => {
    const url = AFFILIATE_LINKS.bankbazaarHomeLoan()
    expect(url).toContain("bankbazaar.com")
    expect(url).toContain("/home-loan")
  })

  it("policybazaarTermInsurance returns policybazaar URL", () => {
    const url = AFFILIATE_LINKS.policybazaarTermInsurance()
    expect(url).toContain("policybazaar.com")
    expect(url).toContain("/term-insurance")
  })
})
