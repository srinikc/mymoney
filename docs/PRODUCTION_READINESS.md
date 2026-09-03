# Production Readiness Guide

How MyMoney is built to be enterprise-ready, like widely-used customer
products (Stripe, Linear, Notion, Vercel, etc.). This document covers
the patterns and practices in place, and what to add as you grow.

## Industry patterns at a glance

| Concern | How Stripe does it | How Linear does it | How Vercel does it | How MyMoney does it |
|---|---|---|---|---|
| **Deployments** | Canary, instant rollback | Deploy previews per PR | Edge + serverless | Vercel + manual deploys |
| **Observability** | Custom metrics + Datadog | Honeycomb + Sentry | Built-in analytics | Basic health checks |
| **Errors** | Sentry + custom alerting | Sentry + Slack alerts | Sentry | Console logs |
| **Uptime** | 99.999% SLA, multi-region | 99.9% SLA, single region | Edge, multi-region | 99.5%, single region |
| **Backups** | Hourly DB snapshots, 35-day retention | Daily, 30-day retention | N/A (managed) | Supabase auto (7-day PITR) |
| **Incidents** | Public status page, IR runbook | Public status page | Status page | None yet |
| **Security** | SOC 2, PCI DSS, HSM keys | SOC 2, bug bounty | SOC 2, FedRAMP | TLS, JWT, audit log |
| **CI/CD** | 200+ tests per PR, gradual rollout | Visual + e2e, canary | E2E + manual gates | Unit + E2E + build gate |
| **Feature flags** | In-house system | Statsig | Built-in | None yet |
| **Secrets** | Vault, rotated quarterly | 1Password, rotated monthly | Built-in | Vercel env, manual |
| **Data isolation** | Per-tenant encryption | Per-workspace | Per-team | Per-user (profileId) |

MyMoney is a personal finance app for ~10-1000 users, so the
target tier is "growing SaaS" — not Stripe-scale yet, but the patterns
below will get you there.

---

## Architecture principles

### 1. Defense in depth (3+ layers)

```
┌──────────────────────────────────────────────────────────┐
│  Layer 1: Edge (Vercel CDN)                              │
│  - DDoS protection                                        │
│  - HTTPS + HTTP/2 + Brotli                                │
│  - Geo-blocking                                           │
└──────────────────────────────────────────────────────────┘
         ↓
┌──────────────────────────────────────────────────────────┐
│  Layer 2: Application (Vercel Functions)                 │
│  - Middleware: auth, rate limit, CORS, headers           │
│  - Per-route guards: admin only, owner only              │
│  - Input validation (Zod schemas)                        │
│  - SQL injection prevention (Prisma parameterized)        │
│  - XSS prevention (React auto-escapes)                    │
│  - CSRF prevention (NextAuth + SameSite cookies)         │
└──────────────────────────────────────────────────────────┘
         ↓
┌──────────────────────────────────────────────────────────┐
│  Layer 3: Data (Supabase Postgres)                       │
│  - Encryption at rest (Supabase default)                 │
│  - Row-level security (per-user profileId)                │
│  - Daily automated backups (Supabase free tier)           │
│  - Point-in-time recovery (paid tier)                     │
└──────────────────────────────────────────────────────────┘
```

### 2. Zero trust (no implicit trust)

Every request validates:
- Auth: session cookie or admin token
- Authz: user has access to the profileId in the URL
- Input: Zod schema validates every field
- Rate limit: per-tier sliding window
- CSRF: NextAuth + SameSite=Lax cookies
- Output: PII is masked in logs and error responses

### 3. Observable (you can answer any question from logs)

- Structured JSON logs (one event per line)
- Request ID propagated through the stack
- User ID + profile ID in every log line
- Metrics: p50/p95/p99 latency, error rate, RPS
- Distributed tracing: Sentry or OpenTelemetry
- Audit log: every write to user data recorded

### 4. Idempotent (safe to retry)

Every state-changing endpoint:
- Uses POST/PUT/DELETE (not GET)
- Idempotency key in headers (or generates one server-side)
- Returns same result on retry
- Avoids "duplicate expense" or "double charge" bugs

### 5. Resilient (degrades gracefully)

- External API failures: retry with backoff, then cached value, then error
- Database transient errors: retry 3x
- LLM API failures: fall back to local data-driven engine (already done)
- GPay failures: show clear manual instructions (already done)

---

## 1. Observability

### 1.1 Structured logging (what to add)

Replace `console.log` with a structured logger that emits JSON.

**Why**: JSON logs are searchable, queryable, and structured. You can
find all errors for a specific user, request, or feature.

**Implementation**:
```typescript
// src/lib/logger.ts
import pino from "pino"

export const logger = pino({
  level: process.env.LOG_LEVEL || "info",
  base: { service: "mymoney", env: process.env.NODE_ENV },
  formatters: {
    level: (label) => ({ level: label }),
  },
  timestamp: pino.stdTimeFunctions.isoTime,
  redact: {
    paths: ["req.headers.authorization", "req.headers.cookie", "*.password", "*.token"],
    censor: "[REDACTED]",
  },
})
```

Use throughout the codebase:
```typescript
// Instead of: console.log("User logged in:", userId)
logger.info({ userId, action: "login" }, "user logged in")
```

**Tools**:
- **Loki** + **Grafana** — free, self-hosted, great for cloud-native
- **Axiom** — $25/mo, zero-config, query with SQL-like syntax
- **Better Stack** — $0-25/mo, integrates with Vercel natively
- **Datadog** — $0.10/GB, full APM, expensive at scale

### 1.2 Error tracking (Sentry)

Sentry catches unhandled exceptions, errors in async code, and gives
you stack traces + user context + breadcrumbs.

**Setup** (1-2 hours):
```bash
npm install @sentry/nextjs
npx @sentry/wizard@latest
```

```typescript
// sentry.client.config.ts
import * as Sentry from "@sentry/nextjs"
Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 0.1,
  environment: process.env.NODE_ENV,
  beforeSend(event) {
    // Don't send PII to Sentry
    if (event.user) delete event.user.email
    return event
  },
})
```

**Cost**: free tier 5K events/month, $26/mo for 50K events.

### 1.3 Metrics (Prometheus + Grafana, or Vercel Analytics)

Track SLI metrics:
- **Latency**: p50, p95, p99 by route
- **Error rate**: 4xx/5xx per minute
- **Throughput**: requests per second by route
- **Business**: expenses created per day, AI chat usage, GPay refreshes

```typescript
// src/app/api/metrics/route.ts
import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET() {
  // Prometheus format
  const lines: string[] = []
  // ... build metrics
  return new NextResponse(lines.join("\n"), {
    headers: { "Content-Type": "text/plain; version=0.0.4" },
  })
}
```

Scrape with Prometheus, visualize in Grafana. Or use Vercel Analytics
(built-in) for simpler setup.

### 1.4 Health checks (already partially in place)

- `/api/version` — version, build, SHA
- `/api/health/redis` — Redis status
- `/api/health/rate-limit` — rate limit stats
- Need: `/api/health` (composite) and `/api/health/db`

---

## 2. CI/CD pipeline

### 2.1 Current state (good baseline)

- ✅ Lint (`npm run lint`)
- ✅ TypeScript check
- ✅ Unit tests (107 passing)
- ✅ Build check
- ✅ E2E tests (Playwright)
- ✅ Manual merge to main (no auto-deploy)
- ✅ Manual deploy via GitHub Actions

### 2.2 What to add for production

1. **Staging environment** (1-2 days):
   - Every PR deploys to `mymoney-staging.vercel.app`
   - Runs full E2E suite against staging
   - Prevents broken code from reaching main

2. **Smoke tests post-deploy** (1 day):
   ```yaml
   # .github/workflows/deploy.yml
   - name: Deploy to production
     run: npx vercel deploy --prod
   - name: Wait for deployment
     run: sleep 30
   - name: Smoke test
     run: |
       curl -f https://mymoney.com/api/health || exit 1
       curl -f https://mymoney.com/api/version || exit 1
       # Login + load dashboard
   ```

3. **Automatic rollback** (already done via Vercel):
   - Vercel keeps last 5 deployments
   - Click "Promote to Production" to rollback in 5 seconds
   - Or use `vercel rollback`

4. **Database migrations** (need setup):
   - Never run migrations in CI
   - Use `prisma migrate deploy` as a manual step
   - Or use Supabase migrations (separate from app)

5. **Canary deployments** (for 1000+ users):
   - Deploy to 5% of traffic
   - Monitor error rate for 10 minutes
   - Auto-promote if OK, auto-rollback if not
   - Tools: Vercel Edge Config, LaunchDarkly, Statsig

---

## 3. Security hardening

### 3.1 Current state (good baseline)

- ✅ HTTPS only (HSTS preload ready)
- ✅ JWT-based auth (NextAuth)
- ✅ Password hashing (bcrypt, 10 rounds)
- ✅ CSRF protection (NextAuth + SameSite)
- ✅ SQL injection prevention (Prisma)
- ✅ XSS prevention (React)
- ✅ Rate limiting (per-tier sliding window)
- ✅ Audit log (write actions)
- ✅ Security headers (CSP, X-Frame-Options, etc.)

### 3.2 What to add

1. **Secrets management** (1-2 days):
   - Never commit secrets to git (`.env` in `.gitignore` ✓)
   - Use Vercel env vars for production
   - Rotate secrets quarterly (mark in calendar)
   - For high-security: use AWS Secrets Manager + IAM

2. **2FA / TOTP** (1-2 days for users, mandatory for admins):
   - Add TOTP via `otpauth` or `speakeasy`
   - Required for `role=admin` accounts
   - Optional for regular users

3. **API key rotation** (1 day):
   - Allow users to rotate their LLM API keys
   - Auto-rotate broker API keys every 90 days
   - Document rotation procedure in docs/RUNBOOK.md

4. **Penetration testing** (quarterly, $5-15K):
   - Hire a security firm (Cure53, Trail of Bits)
   - Or use HackerOne for bug bounty
   - Run npm audit + Snyk in CI

5. **GDPR / data privacy** (compliance):
   - Cookie consent (already done in PR #2)
   - Data export (already done — `/api/export/my-data`)
   - Account deletion (need to add "right to be forgotten")
   - Privacy policy (already done)

6. **Rate limit hardening** (1 day):
   - Add per-IP rate limit (not just per-user)
   - Add CAPTCHA after N failed login attempts
   - Add rate limit to /api/auth/signin (prevent brute force)

---

## 4. Backup & disaster recovery

### 4.1 Database backups

- **Supabase free tier**: 7-day PITR (point-in-time recovery)
- **Supabase Pro**: 30-day PITR, daily snapshots
- **Manual**: `pg_dump` every 6 hours, store in S3

```bash
# Daily backup cron
0 */6 * * * pg_dump $DATABASE_URL | gzip > /backups/mymoney-$(date +\%Y\%m\%d-\%H\%M).sql.gz
```

### 4.2 Disaster recovery plan

- **RTO** (Recovery Time Objective): 1 hour
- **RPO** (Recovery Point Objective): 6 hours
- **Tested quarterly**: simulate database loss, restore from backup

### 4.3 Document the runbook

Create `docs/RUNBOOK.md` with:
- How to deploy a hotfix
- How to roll back a bad release
- How to restore from backup
- How to rotate secrets
- How to scale up (more replicas)
- On-call contacts and escalation

---

## 5. Multi-environment strategy

| Environment | Branch | URL | Data | Purpose |
|---|---|---|---|---|
| **Local** | any | localhost:3005 | seeded | development |
| **PR Preview** | feature/* | vercel.app/preview-* | seeded | code review |
| **Staging** | develop | mymoney-staging.vercel.app | synthetic | pre-prod testing |
| **Production** | main | mymoney.com | real | live users |

Set up:
1. Vercel project: "mymoney" → main = production
2. Vercel project: "mymoney-staging" → develop
3. Separate Supabase projects: prod + staging
4. Vercel environment variables per environment

---

## 6. Performance & scalability

### 6.1 Database optimization (already partially done)

- ✅ Indexes on hot paths (profileId, date, etc.)
- ✅ Composite indexes (profileId+date)
- ✅ Smart query patterns (avoid N+1)
- ⏳ Read replicas (at 1000+ users)
- ⏳ Connection pooling (PgBouncer or Supabase pooler — already in use)

### 6.2 Caching strategy

- **HTTP cache headers** on read-only API routes
  ```typescript
  return NextResponse.json(data, {
    headers: { "Cache-Control": "public, max-age=60, stale-while-revalidate=300" }
  })
  ```
- **React cache()** for duplicate fetches in same render
- **Redis** for hot data (categories, user preferences)
- **Vercel Edge Cache** (default for GET /api/*)

### 6.3 Rate limiting (already in place)

- Per-user tier-based (free/pro/enterprise)
- Per-route abuse limits
- IP-based limit for unauthenticated requests

---

## 7. Compliance & audit

### 7.1 SOC 2 / ISO 27001 (when you're ready)

For enterprise customers, you need:
- ✅ Audit log (already in place — AuditLog model)
- ✅ Encryption at rest (Supabase default)
- ⏳ Access reviews (quarterly)
- ⏳ Incident response plan (need to write)
- ⏳ Vendor risk assessment (Vercel, Supabase)
- ⏳ Employee security training

### 7.2 GDPR (if you have EU users)

- ✅ Data export (right to data portability)
- ✅ Cookie consent
- ⏳ Data deletion (need to add)
- ✅ Privacy policy
- ⏳ Data processing agreement template (legal)

---

## 8. Customer support tools

### 8.1 Help documentation

- ✅ User Guide page (/guide)
- ✅ Help drawer on every page
- ✅ Setup guide
- ⏳ Public docs site (e.g., mintlify.com for `/docs`)

### 8.2 In-app feedback

Add a "Send feedback" button that opens email or a form:
```typescript
<Button onClick={() => window.location.href = "mailto:support@mymoney.com?subject=Feedback"}>
  Send feedback
</Button>
```

Or use a tool like Canny (free tier for up to 100 users).

### 8.3 Status page

Use Instatus (free) or Better Status to show:
- API uptime
- Known issues
- Scheduled maintenance

This is **essential for enterprise** — they won't use a product without a
status page.

---

## 9. Compliance checklist (what to do this week)

**Quick wins (1 day each)**:
- [ ] Add Sentry error tracking
- [ ] Add structured logging
- [ ] Add status page (Instatus free)
- [ ] Add feedback button
- [ ] Add `last_known_good` deployment marker in Vercel
- [ ] Add automated smoke tests in CI
- [ ] Add DB backup cron
- [ ] Write `docs/RUNBOOK.md` (incident response)
- [ ] Add `last login` to audit log
- [ ] Add account deletion flow

**Medium effort (1-2 weeks)**:
- [ ] Add staging environment
- [ ] Add 2FA for admins
- [ ] Add per-IP rate limit
- [ ] Add CAPTCHA on failed logins
- [ ] Add performance monitoring
- [ ] Add uptime monitoring (UptimeRobot or Better Uptime)
- [ ] Penetration test (or run Snyk + npm audit in CI)
- [ ] Write SLA and ToS

**Long-term (months)**:
- [ ] SOC 2 Type II certification
- [ ] Multi-region deployment
- [ ] Canary releases
- [ ] Feature flags
- [ ] Customer SSO (SAML, OIDC)
- [ ] Audit log streaming (to S3 for compliance)

---

## 10. Comparison to industry leaders

| Practice | Stripe | Linear | Vercel | MyMoney (target) |
|---|---|---|---|---|
| Errors → Sentry | ✓ | ✓ | ✓ | 1 day to add |
| Structured logs | ✓ | ✓ | ✓ | 1 day to add |
| Metrics dashboard | ✓ | ✓ | ✓ | 1-2 days |
| Status page | ✓ | ✓ | ✓ | 1 day (free) |
| Runbook | ✓ | ✓ | ✓ | 1 day to write |
| Backup cron | ✓ | ✓ | N/A | 1 day |
| Uptime monitor | ✓ | ✓ | ✓ | 1 day (free) |
| 2FA for admins | ✓ | ✓ | ✓ | 1-2 days |
| Penetration test | ✓ | ✓ | ✓ | when budget allows |
| SOC 2 | ✓ | ✓ | ✓ | when enterprise customers ask |

**Realistic timeline to enterprise-ready**: 2-4 weeks of focused work
+ ongoing maintenance. The patterns above aren't expensive individually;
it's the consistency and discipline across the whole stack.

---

## Quick wins to add this week (priority order)

1. **Status page** (Instatus free) — 30 minutes
2. **Uptime monitor** (UptimeRobot free) — 30 minutes
3. **Sentry** error tracking — 1 hour
4. **Structured logging** (pino) — 1-2 hours
5. **Smoke tests** in CI — 1 hour
6. **DB backup cron** (Supabase has this built-in, just enable) — 15 minutes
7. **RUNBOOK.md** (incident response) — 2 hours
8. **Account deletion** (GDPR right to be forgotten) — 1 day

Total: **2-3 days to be production-grade at 100-user scale**.

At 1000+ users, add: canary deploys, multi-region, PagerDuty, SOC 2.

At 10,000+ users, add: dedicated SRE team, chaos engineering, on-call rotation.
