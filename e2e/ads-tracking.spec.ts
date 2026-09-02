import { test, expect } from "@playwright/test"

test.describe("Ad Tracking Infrastructure", () => {
  test("POST /api/ads/impression records successfully", async ({ request }) => {
    const res = await request.post("/api/ads/impression", {
      data: {
        slotId: "test-slot-1",
        position: "in-content",
        page: "/investments",
        provider: "mock",
      },
    })
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(body.ok).toBe(true)
  })

  test("POST /api/ads/click records successfully", async ({ request }) => {
    const res = await request.post("/api/ads/click", {
      data: {
        slotId: "test-slot-1",
        position: "in-content",
        page: "/investments",
        provider: "affiliate",
        targetUrl: "https://example.com/test",
      },
    })
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(body.ok).toBe(true)
  })

  test("impression on non-ad-enabled page is skipped", async ({ request }) => {
    const res = await request.post("/api/ads/impression", {
      data: {
        slotId: "test-slot-2",
        position: "in-content",
        page: "/expenses",
        provider: "mock",
      },
    })
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(body.skipped).toBe(true)
  })

  test("click on non-ad-enabled page is skipped", async ({ request }) => {
    const res = await request.post("/api/ads/click", {
      data: {
        slotId: "test-slot-2",
        position: "in-content",
        page: "/expenses",
        provider: "affiliate",
        targetUrl: "https://example.com",
      },
    })
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(body.skipped).toBe(true)
  })

  test("missing fields returns 400", async ({ request }) => {
    const res = await request.post("/api/ads/impression", {
      data: { slotId: "x" },
    })
    expect(res.status()).toBe(400)
  })

  test("GET /api/user/ad-preferences requires auth", async ({ request }) => {
    const res = await request.get("/api/user/ad-preferences")
    expect(res.status()).toBe(401)
  })

  test("PUT /api/user/ad-preferences requires auth", async ({ request }) => {
    const res = await request.put("/api/user/ad-preferences", {
      data: { showDisplayAds: false },
    })
    expect(res.status()).toBe(401)
  })

  test("POST /api/user/dismiss-welcome requires auth", async ({ request }) => {
    const res = await request.post("/api/user/dismiss-welcome", {
      data: { accepted: true },
    })
    expect(res.status()).toBe(401)
  })
})
