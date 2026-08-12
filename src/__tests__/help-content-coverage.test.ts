import { describe, it, expect, test } from "vitest"
import { helpContent, getHelpForPath } from "@/components/help/help-content"

const knownRoutes = [
  "/",
  "/assets",
  "/audit-log",
  "/auto-link",
  "/bank-accounts",
  "/budgets",
  "/deals",
  "/expenses",
  "/expenses/import",
  "/expenses/merchants",
  "/expenses/review-duplicates",
  "/expenses/archive",
  "/family",
  "/gmail-import",
  "/goals",
  "/guide",
  "/health",
  "/income",
  "/insights",
  "/insurance",
  "/investments",
  "/loans",
  "/login",
  "/net-worth",
  "/plans",
  "/privacy",
  "/reminders",
  "/reports",
  "/risk-profile",
  "/settings",
  "/settings/api-keys",
  "/settings/bank-accounts",
  "/settings/environment",
  "/settings/gmail-parser",
  "/settings/integrations",
  "/settings/session-link",
  "/setup",
  "/subscriptions",
  "/tax",
  "/what-if",
  "/admin/users",
  "/admin/profiles",
  "/admin/features",
  "/admin/audit-log",
]

describe("Help content coverage", () => {
  test.each(knownRoutes)("route %s has dedicated help content entry", (route: string) => {
    expect(helpContent[route]).toBeDefined()
  })

  it("getHelpForPath returns non-null for every known route", () => {
    for (const route of knownRoutes) {
      const section = getHelpForPath(route)
      expect(section, `getHelpForPath("${route}") returned null`).not.toBeNull()
    }
  })
})
