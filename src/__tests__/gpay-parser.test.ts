import { describe, it, expect } from "vitest"
import { parseGpayTakeoutEntry, parseGpayTakeoutHtml } from "@/shared/gpay-parser"

describe("parseGpayTakeoutEntry", () => {
  it("imports successful paid/sent transactions", () => {
    const r = parseGpayTakeoutEntry({
      status: "success",
      amount: { value: 300 },
      transactionDate: "2026-07-08",
      merchant: { name: "ONE8" },
    })
    expect(r).not.toBeNull()
    expect(r!.amount).toBe(300)
    expect(r!.vendor).toBe("ONE8")
  })

  it("drops failed transactions", () => {
    const r = parseGpayTakeoutEntry({
      status: "failed",
      amount: { value: 50 },
      transactionDate: "2026-07-08",
      merchant: { name: "Metro" },
    })
    expect(r).toBeNull()
  })

  it("drops declined transactions", () => {
    const r = parseGpayTakeoutEntry({
      status: "declined",
      amount: { value: 200 },
      transactionDate: "2026-07-09",
      merchant: { name: "Test" },
    })
    expect(r).toBeNull()
  })

  it("drops transactions whose description starts with Received (income, not expense)", () => {
    const r = parseGpayTakeoutEntry({
      status: "success",
      amount: { value: 1000 },
      transactionDate: "2026-07-09",
      description: "Received ₹1000 from Rahul",
    })
    expect(r).toBeNull()
  })

  it("drops transactions whose vendor starts with Received", () => {
    const r = parseGpayTakeoutEntry({
      status: "success",
      amount: { value: 500 },
      transactionDate: "2026-07-10",
      description: "Received ₹500 from Rahul",
    })
    expect(r).toBeNull()
  })

  it("keeps transactions without an explicit status field", () => {
    const r = parseGpayTakeoutEntry({
      transactionDate: "2026-07-11",
      amount: { value: 100 },
      merchant: { name: "Amazon" },
    })
    expect(r).not.toBeNull()
    expect(r!.amount).toBe(100)
  })
})

describe("parseGpayTakeoutHtml", () => {
  const html = `
<html><body>
<div>Paid ₹300 to ONE8 using Bank Account x1234 Jul 8, 2026, 9:02:53 PM IST Completed</div>
<div>Paid ₹50 to Metro using Bank Account x1234 Jul 8, 2026, 5:00:00 PM IST Failed</div>
<div>Received ₹1000 from Rahul using Bank Account x1234 Jul 9, 2026, 10:00:00 AM IST Completed</div>
<div>Received ₹200 from Test using Bank Account x1234 Jul 9, 2026, 11:00:00 AM IST Failed</div>
<div>Sent ₹500 to Friend using Bank Account x1234 Jul 10, 2026, 8:00:00 PM IST Completed</div>
<div>Paid ₹100 using Bank Account x1234 Jul 11, 2026, 12:00:00 PM IST Completed</div>
</body></html>
`

  it("imports completed paid/sent transactions, skips failed and received", () => {
    const results = parseGpayTakeoutHtml(html)
    expect(results.length).toBe(3)
    const vendors = results.map((r) => r.vendor)
    expect(vendors).toContain("ONE8")
    expect(vendors).toContain("Friend")
    expect(vendors).toContain("")
    // failed paid (Metro) must NOT appear
    expect(vendors).not.toContain("Metro")
    // received transactions (Rahul, Test) must NOT appear
    expect(vendors).not.toContain("Rahul")
    expect(vendors).not.toContain("Test")
  })

  it("drops pending/cancelled transactions", () => {
    const html2 = `
<html><body>
<div>Paid ₹1100 using Bank Account x1234 Aug 17, 2026, 4:23:41 PM IST Products: Google Pay Details: xyz Pending</div>
<div>Paid ₹400 using Bank Account x1234 Aug 17, 2026, 2:59:36 PM IST Products: Google Pay Details: abc Cancelled</div>
<div>Paid ₹45 to MANIKANDAN M using Bank Account x1234 Aug 17, 2026, 2:07:43 PM IST Products: Google Pay Details: def Completed</div>
</body></html>
    `
    const results = parseGpayTakeoutHtml(html2)
    expect(results.length).toBe(1)
    expect(results[0].vendor).toBe("MANIKANDAN M")
  })
})