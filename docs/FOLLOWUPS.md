# MyMoney Follow-up Tracker

This file tracks all work identified during the enterprise-readiness
audit and current development cycle. Items are prioritized by impact
and grouped by when they should be done.

**Status legend**:
- 🔴 = blocker (production-affecting, must do before public launch)
- 🟡 = important (do within 2-4 weeks of launch)
- 🟢 = nice-to-have (do as you grow)
- ⏸️ = deferred (will revisit when scale/need dictates)

**Effort legend**:
- XS = < 1 hour
- S = 1-4 hours
- M = 1-3 days
- L = 1-2 weeks
- XL = 1+ month

---

## P0: Before public launch (🔴 blockers)

| # | Item | Effort | Source | Why |
|---|---|---|---|---|
| 1 | **Sign up for UptimeRobot (free)** and point at `/api/health` | XS | PRODUCTION_READINESS | Need to know when site goes down |
| 2 | **Sign up for Sentry (free tier)** and set `NEXT_PUBLIC_SENTRY_DSN` env var | S | PRODUCTION_READINESS | Need error tracking before users hit bugs |
| 3 | **Schedule `scripts/backup-db.sh` via cron** on production server | XS | PRODUCTION_READINESS | Database backups are critical |
| 4 | **Sign up for InMobi/Adgebra** OR verify AdSense account is approved | S | AD-REVENUE PR#2 | Ads not actually earning yet |
| 5 | **Replace placeholder affiliate IDs** in `src/lib/affiliate-links.ts` with your real Kuvera/Groww/Zerodha/BankBazaar IDs | S | AD-REVENUE PR#1 | Affiliate links not earning yet |
| 6 | **Apply for Google AdSense** (still pending per docs) | S | User | Required to show real AdSense ads |
| 7 | **Configure Vercel env vars** for production: `DATABASE_URL` (with `?pgbouncer=true`), `AUTH_SECRET`, `AUTH_URL`, `NEXT_PUBLIC_BASE_URL` | S | CLOUD_DEPLOYMENT | Some already set, verify all |
| 8 | **Disable Vercel auto-deploy** (already done via vercel.json) | ✓ | Done | Completed in PR #62 |
| 9 | **Test deploy manually** via GitHub Actions "Deploy to Production" workflow | S | CLOUD_DEPLOYMENT | Verify manual deploy path works |

---

## P1: Within 2-4 weeks of launch (🟡 important)

### Observability
| # | Item | Effort | Source |
|---|---|---|---|
| 10 | Replace all `console.log` with `logger.info/warn/error` in API routes | M | PRODUCTION_READINESS |
| 11 | Add request-id middleware (propagate unique ID through logs) | S | PRODUCTION_READINESS |
| 12 | Add Vercel Analytics or PostHog for product analytics | S | PRODUCTION_READINESS |
| 13 | Set up Better Stack or Axiom (free tier) for log aggregation | S | PRODUCTION_READINESS |
| 14 | Add uptime alert to Slack channel | XS | PRODUCTION_READINESS |
| 15 | Add `/api/metrics` Prometheus-format endpoint | S | PRODUCTION_READINESS |

### Security
| # | Item | Effort | Source |
|---|---|---|---|
| 16 | Add 2FA for admin accounts (TOTP via otpauth) | M | PRODUCTION_READINESS |
| 17 | Add per-IP rate limiting (not just per-user) | S | PRODUCTION_READINESS |
| 18 | Add CAPTCHA on /api/auth/signin after 3 failed attempts | S | PRODUCTION_READINESS |
| 19 | Run `npm audit` + Snyk in CI | S | PRODUCTION_READINESS |
| 20 | Add Security.txt at `/.well-known/security.txt` | XS | PRODUCTION_READINESS |
| 21 | Set up CSP report-uri endpoint | S | PRODUCTION_READINESS |

### Reliability
| # | Item | Effort | Source |
|---|---|---|---|
| 22 | Add staging environment (Vercel project for `develop` branch) | S | PRODUCTION_READINESS |
| 23 | Add smoke tests in CI deploy workflow | S | PRODUCTION_READINESS |
| 24 | Wire up `vercel.json` build output indicator for rollback | XS | PRODUCTION_READINESS |

### GDPR/Privacy
| # | Item | Effort | Source |
|---|---|---|---|
| 25 | Add cookie consent banner (already done in PR #2!) | ✓ | Done |
| 26 | Add Terms of Service page | S | PRODUCTION_READINESS |
| 27 | Add Service Level Agreement (SLA) page | S | PRODUCTION_READINESS |
| 28 | Add Data Processing Agreement (DPA) template for enterprise customers | S | PRODUCTION_READINESS |
| 29 | Add `last login` timestamp to User model + display in settings | S | User privacy |
| 30 | Add "active sessions" management (list/revoke other devices) | M | User security |

### Code quality
| # | Item | Effort | Source |
|---|---|---|---|
| 31 | Add `console.log` → `logger` migration to entire codebase (one-time) | M | PRODUCTION_READINESS |
| 32 | Add `prefersReducedMotion` accessibility support | S | UX |
| 33 | Add proper HTTP cache headers to GET /api/* (Cache-Control + ETag) | M | PERFORMANCE |

---

## P2: Month 1-3 (🟢 growth features)

### Multi-environment
| # | Item | Effort | Source |
|---|---|---|---|
| 34 | Add staging deploy on PR creation (Vercel preview + Supabase staging DB) | S | PRODUCTION_READINESS |
| 35 | Add E2E tests against staging URL post-deploy | M | PRODUCTION_READINESS |

### Observability v2
| # | Item | Effort | Source |
|---|---|---|---|
| 36 | Migrate from Sentry free to Pro (when you hit 50K events/mo) | S | PRODUCTION_READINESS |
| 37 | Add distributed tracing (OpenTelemetry) | L | PRODUCTION_READINESS |
| 38 | Add custom business metrics dashboard (expenses/day, AI usage, etc.) | M | PRODUCTION_READINESS |
| 39 | Add Prometheus + Grafana for self-hosted metrics | L | PRODUCTION_READINESS |

### Code refactors (when scale demands)
| # | Item | Effort | Source |
|---|---|---|---|
| 40 | **Refactor file uploads to Cloudflare R2** (replaces local `public/uploads/`) | M | FULL_FEATURE_DEPLOYMENT |
| 41 | **Refactor GPay job store to Redis or DB** (replaces local `data/gpay-jobs.json`) | M | FULL_FEATURE_DEPLOYMENT |
| 42 | **Refactor rate-limit store to Upstash Redis** (replaces local `data/rate-limit.json`) | S | FULL_FEATURE_DEPLOYMENT |
| 43 | **Refactor DB mode config to env var** (replaces local `.db-mode.json`) | XS | FULL_FEATURE_DEPLOYMENT |
| 44 | **Refactor drive import error log to DB** (replaces local log file) | S | FULL_FEATURE_DEPLOYMENT |

### User-facing improvements
| # | Item | Effort | Source |
|---|---|---|---|
| 45 | Add "Active Sessions" page (list/revoke devices) | M | Security |
| 46 | Add "Login History" page (show last 10 logins with location) | M | Security |
| 47 | Add "Export to CSV" button for expenses (alongside JSON export) | XS | User feedback |
| 48 | Add bulk edit to expenses table (multi-select, edit categories at once) | M | UX |
| 49 | Add "Smart Import" suggestions during bank CSV upload (auto-categorize) | M | User feedback |
| 50 | Add receipt auto-attach to expenses (link receipt to expense) | L | User feedback |

---

## P3: When you scale (⏸️ deferred)

### Scaling at 1000+ users
| # | Item | Effort | Source |
|---|---|---|---|
| 51 | Multi-region deployment (Vercel Edge + regional DB replicas) | XL | PRODUCTION_READINESS |
| 52 | Canary deployments (deploy to 5% of traffic, monitor, promote) | L | PRODUCTION_READINESS |
| 53 | Feature flags (Statsig or LaunchDarkly) | L | PRODUCTION_READINESS |
| 54 | Customer SSO (SAML, OIDC) for enterprise plans | L | PRODUCTION_READINESS |
| 55 | Audit log streaming to S3 for compliance | M | PRODUCTION_READINESS |
| 56 | Per-tenant encryption (if you add multi-tenant B2B) | XL | PRODUCTION_READINESS |
| 57 | Mobile app code-signing certificate + Play Store / App Store | L | Mobile |

### Enterprise (10000+ users)
| # | Item | Effort | Source |
|---|---|---|---|
| 58 | SOC 2 Type II certification | XL | PRODUCTION_READINESS |
| 59 | On-call rotation + PagerDuty | L | PRODUCTION_READINESS |
| 60 | Chaos engineering (kill DB randomly to test resilience) | L | PRODUCTION_READINESS |
| 61 | Dedicated SRE team | XL | PRODUCTION_READINESS |
| 62 | Self-hosted Grafana + Loki + Tempo for full observability | L | PRODUCTION_READINESS |
| 63 | CDN-level rate limiting (Cloudflare or Vercel Edge Config) | M | PRODUCTION_READINESS |
| 64 | Multi-region DB with read replicas (Supabase Pro or self-hosted) | L | PRODUCTION_READINESS |
| 65 | Custom SLA tier with financial credits for downtime | L | PRODUCTION_READINESS |

---

## Bug fixes (from current session)

| # | Item | Status | Source |
|---|---|---|---|
| 66 | Mobile "Manual export" link in GPay flow should open Google Takeout (not refresh-gpay) | Not started | GPay serverless PR |
| 67 | When GPay job starts serverless, the spinner is misleading — show "preparing" then check status | Not started | GPay serverless PR |
| 68 | Email notification on important events (GPay export ready, budget exceeded) | Not started | User feedback |

---

## Documentation gaps

| # | Item | Effort | Source |
|---|---|---|---|
| 69 | Add user-facing FAQ / Help Center (public docs site) | L | PRODUCTION_READINESS |
| 70 | Add Postmortem template (`docs/POSTMORTEM_TEMPLATE.md`) | XS | RUNBOOK |
| 71 | Add Architecture diagram (`docs/ARCHITECTURE.md`) | M | Onboarding |
| 72 | Add Data flow diagram (PII handling, audit log) | S | Compliance |
| 73 | Add `CONTRIBUTING.md` for external contributors | S | Open source |
| 74 | Add `docs/COST_MODEL.md` showing cost per 100/1000/10000 users | S | Planning |

---

## P1 from this session's work (refactors)

| # | Item | Effort | Source |
|---|---|---|---|
| 75 | Migrate GPay job store from JSON file to DB (table `gpay_jobs`) | S | GPay serverless PR |
| 76 | Migrate rate-limit store from JSON file to Upstash Redis | S | FULL_FEATURE_DEPLOYMENT |
| 77 | Migrate DB mode config from `.db-mode.json` to env var `DB_MODE` | XS | FULL_FEATURE_DEPLOYMENT |
| 78 | Migrate drive import error log from file to DB | S | FULL_FEATURE_DEPLOYMENT |
| 79 | Auto-categorize: should this be admin-only? (User said "fine as admin-only for now" — revisit later) | — | User confirmation |

---

## "We can do this later" items user said

These are items the user explicitly said can be deferred. Re-evaluate
when business requires them.

| # | Item | Why deferred |
|---|---|---|
| 80 | Full Playwright-based GPay automation on Vercel | Not technically possible (size limits). Use self-hosted worker instead. |
| 81 | Google AdSense integration | Requires AdSense account approval (1-2 weeks) |
| 82 | Kuvera/Groww/Zerodha affiliate live links | Requires signing up for each program |
| 83 | Premium tier (Pro/Family) paywall | User said "not sure what to do" — needs pricing strategy |
| 84 | Razorpay payment integration | Premium tier prerequisite |
| 85 | Open-sourcing the repo | Business decision |
| 86 | 2FA for non-admin users | "Optional" per user |
| 87 | Penetration testing | Expensive; do when budget allows |
| 88 | SOC 2 certification | Enterprise customers prerequisite |
| 89 | Multi-region deployment | Scale-dependent (>10K users) |

---

## Reminder for the assistant

When you or the user returns to this project, before doing new work:
1. Check this file for any P0/P1 items that should be done first
2. Update statuses as items are completed
3. Move completed items to a "Done" section below
4. Add new follow-ups as they arise

## Done (recently completed)

- [x] Version system (semver + build number) — PR #70
- [x] AI chat data-driven responses (no LLM needed) — PR #69
- [x] Google OAuth safety (hide button when env vars missing) — PR #67
- [x] Settings page admin gating — PR #67
- [x] GPay serverless fix (manual export instructions) — PR #67
- [x] Admin user auth method management — PR #67
- [x] Production readiness infrastructure (logger, health checks, error tracking) — PR #72
- [x] RUNBOOK + PRODUCTION_READINESS + STATUS_PAGE_SETUP docs — PR #72
- [x] PR #1-3: Ad revenue foundation (Kuvera/Groww affiliates, sponsored cards, admin dashboard)
- [x] PR #64: Vercel auto-deploy disabled
- [x] PR #60: Manual deploy workflow
- [x] PR #65: AdSense placeholders + cookie consent
- [x] PR #66: Admin ad revenue dashboard
- [x] PR #67: User-reported issues fixed
- [x] PR #68: GPay automation options doc
- [x] PR #69: AI chat data-driven engine
- [x] PR #70: Product version + build number
- [x] PR #71: Full feature deployment options
- [x] PR #72: Enterprise-readiness (observability, health, error tracking, account deletion)
