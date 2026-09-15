# MyMoney — Enterprise Operations, Customer Engagement & Scaling

> Status: **ANALYSIS** (audit complete; implementation pending)
> Created: 2026-09-12

This document is the single source of truth for turning MyMoney into a true enterprise-grade SaaS product. It covers customer lifecycle management, admin operations, revenue tracking, feedback loops, performance optimization, scaling architecture, and maintenance/patching workflows.

---

## Table of Contents

1. [Current State Assessment](#1-current-state-assessment)
2. [Admin Dashboard — Customer Management](#2-admin-dashboard--customer-management)
3. [Customer Onboarding Workflow](#3-customer-onboarding-workflow)
4. [Subscription & Revenue Management](#4-subscription--revenue-management)
5. [Feedback & Issue Tracking System](#5-feedback--issue-tracking-system)
6. [Performance Monitoring & Observability](#6-performance-monitoring--observability)
7. [Scaling Architecture](#7-scaling-architecture)
8. [Maintenance, Patching & Feature Rollout](#8-maintenance-patching--feature-rollout)
9. [Customer Engagement Lifecycle](#9-customer-engagement-lifecycle)
10. [Implementation Roadmap](#10-implementation-roadmap)

---

## 1. Current State Assessment

### What Exists Today

| Area | Status | Score | Details |
|------|--------|-------|---------|
| User Management | Strong | 8/10 | 50 DB models, multi-profile, roles (user/manager/viewer/admin), tiers (free/pro/premium), OAuth + credentials |
| Admin Panel | Strong | 8/10 | 8 admin pages, 22 API routes — Users, Profiles, Features, Backup, Audit, Ads, Loans, Funds |
| Feature Flags | Strong | 9/10 | 93 flags, tier-gated, per-user overrides, full admin UI with bulk toggle |
| Monitoring | Partial | 5/10 | Structured Pino logger, 4 health endpoints, Redis cache. Missing: APM, tracing, error tracking, alerting |
| Scaling | Planned | 3/10 | Docker + Redis exist. Missing: k8s, load balancer, read replicas, CDN, auto-scaling |
| Feedback/Issues | Missing | 0/10 | No feedback system, no issue tracking |
| Performance | Documented | 4/10 | Thorough docs (caching.md, scaling_perf.md) but none implemented |
| CI/CD | Missing | 0/10 | No GitHub Actions, no automated pipeline |
| Backup/DR | Strong | 8/10 | Multi-destination (Local/R2/Supabase/GDrive), 6-hour schedule, restore with confirmation |
| Auth/Security | Good | 7/10 | RBAC, rate limiting, PII redaction. Missing: CORS policy, brute-force protection |

### Critical Gaps

1. **No CI/CD pipeline** — Zero automation for testing, linting, or deployment
2. **No feedback/issue tracking** — Users have no way to report bugs or request features
3. **No APM/observability** — No Sentry, Datadog, or OpenTelemetry; no request tracing
4. **Caching layer not implemented** — Redis wired but caching plan is "PLANNED"
5. **Performance bottlenecks documented but unfixed** — 90+ query N+1s, 9MB bundles, 7s cold starts
6. **No API versioning** — No `/api/v1/` prefix, no deprecation strategy
7. **No load testing** — No k6/artillery setup

---

## 2. Admin Dashboard — Customer Management

### 2.1 What Exists Today

| Admin Page | URL | Capabilities |
|-----------|-----|-------------|
| Users | `/admin/users` | CRUD users, set roles/tiers, passwords, unlink Google, create users |
| Profiles | `/admin/profiles` | View/manage all profiles, create profiles |
| Features | `/admin/features` | Feature flag CRUD, tier assignment, per-user overrides, bulk toggle |
| Backup | `/admin/backup` | Multi-destination backup/restore, 6-hour schedule |
| Audit Log | `/admin/audit-log` | Paginated audit trail, filter by action/entity/user, CSV export |
| Ads | `/admin/ads` | Ad metrics, impressions/clicks/CTR/revenue, kill switch |
| Loans | `/admin/loans` | Loan product management, AI scoring, affiliate links |
| Funds | `/admin/funds` | Curated mutual fund management, AI analysis triggers |

### 2.2 What's Needed for Enterprise

#### Admin Dashboard v2 (New Pages)

| Page | Purpose | Priority |
|------|---------|----------|
| **Customer Overview** | Total users, active users (DAU/WAU/MAU), growth charts, churn rate | P0 |
| **Revenue Dashboard** | MRR, ARR, revenue per user, churn revenue, expansion revenue | P0 |
| **Subscription Management** | All subscriptions, status, renewal dates, payment failures, dunning | P0 |
| **Health Scoreboard** | Per-user health scores (engagement, feature adoption, payment risk) | P1 |
| **Issue Tracker** | User-reported bugs/features, status, priority, assignment, ETA | P0 |
| **Feedback Center** | User feedback, NPS scores, sentiment analysis, feature requests | P1 |
| **Performance Monitor** | API latency, error rates, DB query performance, cache hit rates | P1 |
| **Customer Journey** | Onboarding funnel, activation metrics, feature adoption timeline | P1 |

#### Admin Dashboard v2 (Enhancements to Existing)

| Existing Page | Enhancement |
|---------------|-------------|
| Users | Add: last login, feature usage heatmap, subscription status, LTV, health score |
| Features | Add: adoption rate per flag, A/B test results, rollout percentage |
| Audit Log | Add: export to CSV/JSON, retention policy, anomaly detection |
| Backup | Add: point-in-time recovery, cross-region replication status |

### 2.3 Admin Dashboard Data Model

```prisma
// New models needed for enterprise admin

model CustomerHealth {
  id              Int      @id @default(autoincrement())
  userId          Int      @unique
  healthScore     Float    @default(100)  // 0-100
  engagementScore Float    @default(0)    // 0-100 (login frequency, feature usage)
  paymentScore    Float    @default(100)  // 0-100 (on-time payments, retry success)
  riskLevel       String   @default("low") // low | medium | high | churn
  lastCalculated  DateTime @default(now())
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
}

model CustomerEvent {
  id          Int      @id @default(autoincrement())
  userId      Int
  eventType   String   // login | feature_use | payment | feedback | support_ticket | upgrade | downgrade
  metadata    Json     // { feature: "voice_input", duration: 120, ... }
  createdAt   DateTime @default(now())
  @@index([userId, eventType])
  @@index([createdAt])
}

model RevenueRecord {
  id              Int      @id @default(autoincrement())
  userId          Int
  amount          Decimal  @db.Decimal(10, 2)
  currency        String   @default("INR")
  type            String   // subscription | one_time | refund | expansion
  razorpayOrderId String?
  razorpayPaymentId String?
  status          String   // pending | captured | failed | refunded
  period          String?  // 2026-09 (monthly) or 2026-Q3 (quarterly)
  createdAt       DateTime @default(now())
  @@index([userId, type])
  @@index([createdAt])
}
```

---

## 3. Customer Onboarding Workflow

### 3.1 Onboarding Funnel

```
User Signs Up
    │
    ├─ Email/Password or Google OAuth
    │
    ▼
Step 1: Profile Setup
    ├─ Name, DOB, currency preference
    ├─ Family members (optional)
    └─ Skip available
    │
    ▼
Step 2: Financial Snapshot (optional, skippable)
    ├─ Bank accounts
    ├─ Income sources
    ├─ Existing investments
    └─ Risk tolerance
    │
    ▼
Step 3: First Action (guided)
    ├─ "Add your first expense" (voice or manual)
    ├─ "Set up a budget"
    ├─ "Import from bank statement"
    └─ "Connect Google Account"
    │
    ▼
Step 4: Feature Discovery
    ├─ Highlight: AI assistant (voice + text)
    ├─ Highlight: Reports & insights
    ├─ Highlight: Investment tracking
    └─ Highlight: Tax planning
    │
    ▼
Activated User
    ├─ Day 3: "How's it going?" prompt
    ├─ Day 7: Feature adoption check
    ├─ Day 14: NPS survey
    └─ Day 30: "Upgrade to Pro?" prompt (if hitting limits)
```

### 3.2 Onboarding Implementation

| Step | Data Captured | Store In | Admin Visibility |
|------|---------------|----------|------------------|
| Sign up | Email, name, provider | User table | Users page |
| Profile setup | DOB, currency | Profile table | Profiles page |
| First expense | Category, amount, vendor | Expense table | Usage metrics |
| Feature discovery | Which features clicked | CustomerEvent | Engagement dashboard |
| Day 7 check | Login count, features used | CustomerHealth | Health scoreboard |
| Day 14 NPS | Score, comment | Feedback table | Feedback center |

### 3.3 Onboarding Email Sequence

| Day | Email | Content |
|-----|-------|---------|
| 0 | Welcome | "Welcome to MyMoney! Here's how to get started" |
| 1 | Tip | "Try voice commands: say 'Hey MyMoney, spent 200 on groceries'" |
| 3 | Check-in | "How's it going? Here are 3 things you might like" |
| 7 | Feature | "Did you know you can import bank statements?" |
| 14 | Survey | "How would you rate MyMoney? (NPS)" |
| 21 | Value | "Your financial snapshot: here's what we've learned about your spending" |
| 30 | Upgrade | "You've tracked ₹X this month! Upgrade for deeper insights" |

---

## 4. Subscription & Revenue Management

### 4.1 Current Subscription Tiers

| Tier | Price (suggested) | Features |
|------|-------------------|----------|
| **Free** | ₹0 | Core tracking, basic reports, 50 expenses/month |
| **Pro** | ₹199/month | Unlimited expenses, investments, imports, advanced reports, family sharing |
| **Premium** | ₹499/month | AI advisor, voice assistant, retirement planning, insurance gap analysis, tax optimization |

### 4.2 Revenue Tracking Dashboard

| Metric | Calculation | Source |
|--------|-------------|--------|
| **MRR** (Monthly Recurring Revenue) | Sum of active subscription amounts | Payment table |
| **ARR** (Annual Recurring Revenue) | MRR × 12 | Payment table |
| **ARPU** (Average Revenue Per User) | MRR / Active paid users | Payment + User tables |
| **LTV** (Lifetime Value) | ARPU × Average lifespan (months) | Payment table |
| **Churn Rate** | (Cancelled / Start of month total) × 100 | User + Payment tables |
| **Expansion Revenue** | Upgrades (free→pro, pro→premium) | Payment table |
| **Failed Payments** | Count of failed + retry status | Payment table |
| **Revenue per Feature** | Revenue attributed to feature-gated upgrades | FeatureFlag + Payment |

### 4.3 Payment Integration (Razorpay)

| Feature | Status | Notes |
|---------|--------|-------|
| One-time payments | ✅ Implemented | Payment model tracks orders |
| Subscriptions | ⚠️ Partial | No recurring billing logic |
| Webhooks | ❌ Missing | No Razorpay webhook handler |
| Dunning | ❌ Missing | No failed payment retry logic |
| Proration | ❌ Missing | No mid-cycle upgrade/downgrade handling |

### 4.4 Revenue Optimization

| Strategy | Implementation |
|----------|---------------|
| **Trial periods** | 14-day Pro trial on signup, auto-convert or downgrade |
| **Usage-based upsell** | "You've used 45/50 expenses — upgrade for unlimited" |
| **Annual discount** | 20% off for annual billing (₹1,910/year vs ₹2,388) |
| **Referral program** | Give 1 month free for each referral |
| **Win-back campaigns** | Email sequence for churned users with discount |

---

## 5. Feedback & Issue Tracking System

### 5.1 Feedback System Design

#### User-Facing Components

| Component | Location | Purpose |
|-----------|----------|---------|
| **Feedback Button** | Fixed position in app | "Report a bug" or "Suggest a feature" |
| **In-App Survey** | After key actions | "How was your experience?" (1-5 stars) |
| **NPS Survey** | Day 14, then quarterly | "How likely are you to recommend MyMoney?" (0-10) |
| **Feature Request Board** | `/feedback/features` | Upvote existing requests or submit new ones |
| **Issue Report Form** | `/feedback/issues` | Category, description, screenshot, device info |

#### Admin-Facing Components

| Component | Location | Purpose |
|-----------|----------|---------|
| **Issue Dashboard** | `/admin/issues` | All issues, status, priority, assignment |
| **Feedback Inbox** | `/admin/feedback` | All feedback, sentiment, categorization |
| **NPS Dashboard** | `/admin/nps` | NPS trend, segment by tier, follow-up |
| **Feature Request Board** | `/admin/features/requests` | Priority by votes, implement/reject/delay |

### 5.2 Data Model

```prisma
model Feedback {
  id          Int      @id @default(autoincrement())
  userId      Int
  type        String   // bug | feature_request | improvement | praise | complaint
  category    String?  // ui | performance | data | billing | other
  title       String
  description String   @db.Text
  screenshotUrl String?
  deviceInfo  Json?    // { os, browser, version, screen }
  status      String   @default("open") // open | acknowledged | in_progress | resolved | closed
  priority    String   @default("medium") // low | medium | high | critical
  assignedTo  Int?
  resolution  String?  @db.Text
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  @@index([status, priority])
  @@index([userId])
}

model FeatureRequest {
  id          Int      @id @default(autoincrement())
  userId      Int
  title       String
  description String   @db.Text
  votes       Int      @default(1)
  status      String   @default("open") // open | under_review | planned | in_progress | shipped | rejected
  adminNote   String?  @db.Text
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  @@index([status, votes])
}

model NpsResponse {
  id          Int      @id @default(autoincrement())
  userId      Int
  score       Int      // 0-10
  comment     String?  @db.Text
  createdAt   DateTime @default(now())
  @@index([score])
}

model UserFeedbackVote {
  id              Int @id @default(autoincrement())
  userId          Int
  featureRequestId Int
  createdAt       DateTime @default(now())
  @@unique([userId, featureRequestId])
}
```

### 5.3 Issue Lifecycle

```
User Reports Issue
    │
    ├─ Auto-capture: device info, OS, browser, screen size, last 5 actions
    │
    ▼
Status: OPEN
    │
    ├─ Admin triages: sets priority (low/medium/high/critical)
    ├─ Admin assigns to team member
    │
    ▼
Status: ACKNOWLEDGED
    │
    ├─ Admin adds ETA
    ├─ User notified: "We're looking into this"
    │
    ▼
Status: IN_PROGRESS
    │
    ├─ Admin updates progress
    ├─ User notified of updates
    │
    ▼
Status: RESOLVED
    │
    ├─ Fix deployed
    ├─ User notified: "This is fixed in v2.1.0"
    ├─ User confirms or reopens
    │
    ▼
Status: CLOSED
    │
    ├─ Follow-up survey: "Is this working now?"
    └─ Feedback linked to issue for metrics
```

---

## 6. Performance Monitoring & Observability

### 6.1 Current State

| Component | Status | Tool |
|-----------|--------|------|
| Structured logging | ✅ Implemented | Pino JSON logger with PII redaction |
| Health checks | ✅ Implemented | `/api/health` (liveness), `/api/health/ready` (readiness) |
| Redis cache | ✅ Implemented | ioredis with in-memory fallback |
| Audit logging | ✅ Implemented | AuditLog model, 199 routes instrumented |
| APM | ❌ Missing | — |
| Error tracking | ❌ Missing | — |
| Request tracing | ❌ Missing | — |
| Latency SLOs | ❌ Missing | — |
| Alerting | ❌ Missing | — |

### 6.2 Target Observability Stack

```
┌──────────────────────────────────────────────────────┐
│                    APPLICATION                         │
│  ┌─────────────┐  ┌──────────────┐  ┌─────────────┐ │
│  │  Pino Logger │  │  OpenTelemetry│  │  Error Bound │ │
│  │  (structured)│  │  (tracing)    │  │  (Sentry)    │ │
│  └──────┬──────┘  └──────┬───────┘  └──────┬──────┘ │
└─────────┼────────────────┼──────────────────┼────────┘
          │                │                  │
          ▼                ▼                  ▼
   ┌──────────┐    ┌───────────┐     ┌──────────────┐
   │  Axiom/  │    │  Grafana  │     │    Sentry     │
   │  Loki    │    │  Tempo    │     │  (errors +    │
   │  (logs)  │    │  (traces) │     │   performance)│
   └──────────┘    └───────────┘     └──────────────┘
          │                │                  │
          └────────────────┼──────────────────┘
                           ▼
                   ┌──────────────┐
                   │   Grafana    │
                   │  Dashboard   │
                   │  + Alerts    │
                   └──────────────┘
```

### 6.3 Metrics to Track

#### Application Metrics

| Metric | Type | Source | Alert Threshold |
|--------|------|--------|-----------------|
| API latency (p50, p95, p99) | Histogram | OpenTelemetry | p99 > 2s |
| Error rate | Counter | Sentry | > 1% of requests |
| Active users | Gauge | CustomerEvent | < 50% of baseline |
| Feature adoption rate | Gauge | FeatureFlag usage | < 10% for new features |
| DB query duration | Histogram | Prisma middleware | p95 > 500ms |
| Cache hit rate | Gauge | Redis metrics | < 60% |

#### Business Metrics

| Metric | Type | Source | Alert Threshold |
|--------|------|--------|-----------------|
| MRR | Gauge | RevenueRecord | < ₹X (churn spike) |
| Churn rate | Gauge | User status changes | > 5% monthly |
| Failed payments | Counter | Payment table | > 3% of active subs |
| NPS score | Gauge | NpsResponse | < 30 |
| Support tickets open | Gauge | Feedback table | > 20 unresolved |

### 6.4 SLO Definitions

| SLO | Target | Measurement |
|-----|--------|-------------|
| API availability | 99.9% (8.7h downtime/year) | Health check uptime |
| API latency (p95) | < 500ms | OpenTelemetry histogram |
| API latency (p99) | < 2s | OpenTelemetry histogram |
| Error rate | < 0.1% | Sentry error count / total requests |
| Data durability | 99.999999% | PostgreSQL + backup |
| Backup success rate | 100% | BackupHistory table |

---

## 7. Scaling Architecture

### 7.1 Current Architecture

```
┌──────────────┐
│   Browser /  │
│   Mobile App │
└──────┬───────┘
       │ HTTPS
       ▼
┌──────────────┐
│   Vercel     │  ← Single serverless platform
│   (Next.js)  │
└──────┬───────┘
       │
       ▼
┌──────────────┐     ┌──────────────┐
│  Supabase    │     │  Upstash     │
│  PostgreSQL  │     │  Redis       │
└──────────────┘     └──────────────┘
```

### 7.2 Target Architecture (Enterprise)

```
┌──────────────────────────────────────────────────────────┐
│                     CDN (Cloudflare)                      │
│              Static assets, edge caching                  │
└──────────────────────┬───────────────────────────────────┘
                       │
┌──────────────────────▼───────────────────────────────────┐
│                   Load Balancer                           │
│            (Vercel / AWS ALB / Nginx)                     │
└──────┬───────────────┬───────────────────────┬───────────┘
       │               │                       │
┌──────▼──────┐ ┌──────▼──────┐ ┌─────────────▼───────────┐
│  App Node 1 │ │  App Node 2 │ │  App Node N             │
│  (Next.js)  │ │  (Next.js)  │ │  (Next.js)              │
└──────┬──────┘ └──────┬──────┘ └─────────────┬───────────┘
       │               │                       │
       └───────────────┼───────────────────────┘
                       │
        ┌──────────────┼──────────────┐
        │              │              │
┌───────▼──────┐ ┌─────▼─────┐ ┌─────▼──────┐
│  PostgreSQL  │ │   Redis   │ │  Object    │
│  (Primary)   │ │  Cluster  │ │  Storage   │
│  + Read      │ │           │ │  (R2/S3)   │
│    Replicas  │ │           │ │            │
└──────────────┘ └───────────┘ └────────────┘
```

### 7.3 Containerization Strategy

#### Docker

| Component | Image | Resources | Replicas |
|-----------|-------|-----------|----------|
| Next.js app | `mymoney:latest` | 512MB RAM, 0.5 CPU | 2-4 (auto-scale) |
| PostgreSQL | `supabase/postgres` | 1GB RAM, 1 CPU | 1 primary + 1 replica |
| Redis | `redis:7-alpine` | 256MB RAM | 1 (or managed) |
| STT/TTS service | `mymoney-stt:latest` | 1GB RAM, 1 CPU | 1-2 (on-demand) |

#### Docker Compose (Development)

```yaml
version: "3.8"
services:
  app:
    build: .
    ports: ["3005:3005"]
    environment:
      - DATABASE_URL=postgresql://postgres:password@db:5432/mymoney
      - REDIS_URL=redis://redis:6379
    depends_on: [db, redis]

  db:
    image: postgres:16-alpine
    volumes: [pgdata:/var/lib/postgresql/data]
    environment:
      POSTGRES_DB: mymoney
      POSTGRES_PASSWORD: password

  redis:
    image: redis:7-alpine
    volumes: [redisdata:/data]

volumes:
  pgdata:
  redisdata:
```

#### Kubernetes (Production Target)

| Resource | Purpose | Scaling |
|----------|---------|---------|
| Deployment | App pods | HPA: CPU > 70%, min 2, max 10 |
| StatefulSet | PostgreSQL | Manual scale (read replicas) |
| StatefulSet | Redis | Manual scale (cluster mode) |
| Service | Load balancing | ClusterIP + Ingress |
| Ingress | TLS termination | Cloudflare / AWS ALB |
| ConfigMap | Environment vars | — |
| Secret | API keys, DB credentials | — |
| PVC | Persistent storage | — |

### 7.4 Auto-Scaling Rules

| Metric | Scale Up | Scale Down | Cooldown |
|--------|----------|------------|----------|
| CPU usage | > 70% → +1 pod | < 30% → -1 pod | 300s |
| Memory usage | > 80% → +1 pod | < 40% → -1 pod | 300s |
| Request queue | > 100 pending → +2 pods | < 10 pending → -1 pod | 120s |
| Error rate | > 5% → +2 pods + alert | — | 300s |

### 7.5 Database Scaling

| Strategy | When | How |
|----------|------|-----|
| **Connection pooling** | Now | PgBouncer (already in Supabase connection string) |
| **Read replicas** | 1000+ users | Supabase read replicas or Neon branching |
| **Query optimization** | Now | Kill N+1s (documented in scaling_perf.md) |
| **Caching** | Now | Redis TTL cache for dashboard queries (planned in caching.md) |
| **Partitioning** | 100K+ expenses | Partition Expense table by date range |
| ** archival** | 1M+ expenses | Move old expenses to cold storage |

---

## 8. Maintenance, Patching & Feature Rollout

### 8.1 Release Versioning

```
MyMoney vMAJOR.MINOR.PATCH

MAJOR — Breaking changes, DB migrations, API deprecations
MINOR — New features, feature flags, non-breaking
PATCH — Bug fixes, security patches, performance improvements

Examples:
  v2.0.0 — Added investment tracking (breaking: new DB schema)
  v2.1.0 — Added voice assistant (feature flag: voice_input)
  v2.1.1 — Fixed voice detection on Safari (bug fix)
```

### 8.2 Patching Mechanism

#### Hotfix (Critical Bug / Security Patch)

```
1. Create branch: hotfix/v2.1.2
2. Fix the issue
3. Run: typecheck + lint + tests
4. Merge to main
5. Auto-deploy to production (CI/CD)
6. Notify affected users: "We fixed [issue]"
7. Post-mortem if security-related
ETA: < 4 hours from discovery to production
```

#### Minor Release (New Feature)

```
1. Create branch: feature/voice-assistant
2. Implement behind feature flag (disabled by default)
3. Merge to develop → staging environment
4. QA testing on staging
5. Enable flag for internal team (dogfooding)
6. Enable flag for 10% of users (canary)
7. Monitor metrics for 48 hours
8. Enable flag for 50% → 100%
9. Update changelog, notify users
ETA: 1-2 weeks
```

#### Major Release (Breaking Changes)

```
1. Create branch: release/v3.0.0
2. Run prisma migrate (non-destructive first)
3. Deploy with backward-compatible code
4. Run data migration scripts
5. Verify all endpoints
6. Enable new features via flags
7. Deprecate old API endpoints (30-day notice)
8. Remove deprecated code in next major
ETA: 2-4 weeks
```

### 8.3 Feature Rollout Strategy

```
Feature Flag State Machine:

  DISABLED → INTERNAL → CANARY → PARTIAL → FULLY_ENABLED
      │           │          │          │           │
      │      0% users   10% users   50% users   100% users
      │      (team only)  (A/B test)  (gradual)   (everyone)
      │           │          │          │           │
      └───────────┴──────────┴──────────┴───────────┘
                          │
                    Rollback at any stage
                    if metrics degrade
```

| Stage | Duration | Criteria to Advance | Rollback Trigger |
|-------|----------|--------------------|--------------------|
| Internal | 3 days | No crashes, basic functionality works | Any crash |
| Canary (10%) | 48 hours | Error rate < baseline, latency < baseline | Error rate > 2× baseline |
| Partial (50%) | 1 week | User engagement ≥ baseline, no regressions | Engagement < 80% of baseline |
| Full (100%) | — | All metrics stable | Any metric degrades > 10% |

### 8.4 Maintenance Windows

| Type | Schedule | Duration | Impact |
|------|----------|----------|--------|
| **Planned maintenance** | Sundays 02:00-06:00 IST | 4 hours | Read-only mode or degraded |
| **Emergency maintenance** | As needed | < 1 hour | Service unavailable |
| **Database maintenance** | Monthly, 1st Sunday | 2 hours | Brief connection drops |
| **Dependency updates** | Bi-weekly | 30 minutes | Zero downtime (rolling) |

### 8.5 Rollback Procedure

```
1. Detect issue (monitoring alert or user report)
2. Assess severity:
   - P0 (service down): Immediate rollback
   - P1 (major feature broken): Rollback within 1 hour
   - P2 (minor issue): Fix forward, rollback if not fixed in 24 hours
   - P3 (cosmetic): Fix forward
3. Execute rollback:
   - Vercel: Instant rollback to previous deployment
   - Docker: `docker-compose pull app:previous && docker-compose up -d`
   - Database: Revert migration if schema change (careful!)
4. Verify rollback resolves issue
5. Notify users if P0/P1
6. Post-mortem within 48 hours
```

---

## 9. Customer Engagement Lifecycle

### 9.1 Full Lifecycle

```
┌─────────────────────────────────────────────────────────────┐
│                    ACQUISITION                               │
│  Marketing → Landing Page → Signup → Email Verification      │
└──────────────────────┬──────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────┐
│                    ONBOARDING                                │
│  Profile Setup → First Expense → Feature Discovery           │
│  Day 0: Welcome email                                       │
│  Day 1: Tip email                                           │
│  Day 3: Check-in email                                      │
└──────────────────────┬──────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────┐
│                    ACTIVATION                                │
│  User performs key action (add expense, set budget, import)  │
│  Health score > 50                                           │
│  Week 1: 3+ sessions, 5+ expenses tracked                   │
└──────────────────────┬──────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────┐
│                    ENGAGEMENT                                │
│  Regular usage (3+ times/week)                               │
│  Feature adoption (reports, insights, investments)           │
│  Health score > 70                                           │
│  Community participation (feature requests, feedback)        │
└──────────────────────┬──────────────────────────────────────┘
                       │
              ┌────────┴────────┐
              │                 │
     ┌────────▼────────┐ ┌─────▼──────────────┐
     │   EXPANSION      │ │   RETENTION         │
     │   Free → Pro     │ │   NPS > 30          │
     │   Pro → Premium  │ │   Renewal on time   │
     │   Referrals      │ │   Feature requests  │
     └────────┬────────┘ └─────┬──────────────┘
              │                 │
              └────────┬────────┘
                       │
┌──────────────────────▼──────────────────────────────────────┐
│                    CHURN PREVENTION                          │
│  Health score < 30 triggers:                                 │
│  - Day 1: "We miss you" email                               │
│  - Day 3: Discount offer (20% off)                          │
│  - Day 7: Personal email from founder                       │
│  - Day 14: "Last chance" + 30% off                          │
│  - Day 30: Mark as churned, survey                          │
└──────────────────────┬──────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────┐
│                    WIN-BACK                                  │
│  Churned users:                                              │
│  - Monthly product updates email                            │
│  - New feature announcements                                │
│  - Seasonal offers (Diwali, New Year)                       │
│  - "We've improved" campaign                                │
└─────────────────────────────────────────────────────────────┘
```

### 9.2 Customer Health Score

| Signal | Weight | Measurement |
|--------|--------|-------------|
| Login frequency | 25% | Sessions per week (target: 3+) |
| Feature adoption | 25% | Features used / total features |
| Data freshness | 20% | Days since last expense added |
| Payment status | 20% | On-time vs failed vs churned |
| Feedback engagement | 10% | Feedback submitted, NPS response |

**Health Score = Σ (signal × weight)**
- **80-100**: Healthy (promote, upsell)
- **50-79**: At risk (engage, survey)
- **30-49**: Churning (intervene, discount)
- **0-29**: Churned (win-back campaign)

### 9.3 Automated Triggers

| Trigger | Condition | Action |
|---------|-----------|--------|
| Welcome | User signs up | Send welcome email, create onboarding tasks |
| Activation check | Day 3, no key action | Send "Try this" email with guided tutorial |
| Feature discovery | User hasn't used feature X | Send "Did you know?" email |
| NPS survey | Day 14, then quarterly | Send NPS survey email |
| Upgrade prompt | User hits free tier limit | Show upgrade modal + email |
| Payment failure | Subscription payment fails | Retry in 3 days, email user, retry again at day 7 |
| Churn risk | Health score < 30 | Trigger churn prevention sequence |
| Churned | Subscription cancelled | Win-back email sequence |
| Anniversary | 1 year on platform | Celebration email + loyalty discount |

---

## 10. Implementation Roadmap

### Phase 1: Foundation (Weeks 1-4)

| Task | Priority | Effort | Status |
|------|----------|--------|--------|
| CI/CD pipeline (GitHub Actions) | P0 | 2 days | ❌ |
| Error tracking (Sentry) | P0 | 1 day | ❌ |
| APM integration (OpenTelemetry) | P1 | 3 days | ❌ |
| Feedback system (DB + UI + API) | P0 | 5 days | ❌ |
| Issue tracking (DB + UI + API) | P0 | 5 days | ❌ |
| Caching layer (implement caching.md) | P0 | 5 days | ❌ |
| N+1 query fixes (scaling_perf.md) | P0 | 3 days | ❌ |

### Phase 2: Admin & Revenue (Weeks 5-8)

| Task | Priority | Effort | Status |
|------|----------|--------|--------|
| Customer overview dashboard | P0 | 3 days | ❌ |
| Revenue dashboard | P0 | 3 days | ❌ |
| Subscription management | P0 | 5 days | ❌ |
| Razorpay webhook handler | P0 | 2 days | ❌ |
| Dunning (failed payment retry) | P1 | 3 days | ❌ |
| Customer health scoring | P1 | 3 days | ❌ |
| Onboarding email sequence | P1 | 3 days | ❌ |

### Phase 3: Scaling & Performance (Weeks 9-12)

| Task | Priority | Effort | Status |
|------|----------|--------|--------|
| Kubernetes deployment configs | P1 | 5 days | ❌ |
| Auto-scaling configuration | P1 | 3 days | ❌ |
| Database read replicas | P1 | 2 days | ❌ |
| CDN for static assets | P1 | 1 day | ❌ |
| Load testing (k6/artillery) | P1 | 3 days | ❌ |
| API versioning (v1/v2) | P2 | 3 days | ❌ |
| OpenAPI spec generation | P2 | 2 days | ❌ |

### Phase 4: Enterprise Features (Weeks 13-16)

| Task | Priority | Effort | Status |
|------|----------|--------|--------|
| Onboarding funnel analytics | P1 | 3 days | ❌ |
| Churn prevention automation | P1 | 5 days | ❌ |
| Feature A/B testing framework | P2 | 5 days | ❌ |
| Multi-region deployment | P2 | 5 days | ❌ |
| Audit log export & retention | P2 | 2 days | ❌ |
| Rate limiting (distributed) | P2 | 3 days | ❌ |

### Success Metrics

| Metric | Current | Target (6 months) |
|--------|---------|-------------------|
| CI/CD deploys per week | 0 (manual) | 10+ (automated) |
| Mean time to deploy | Hours (manual) | < 5 minutes (CI/CD) |
| Error rate | Unknown | < 0.1% |
| API p95 latency | Unknown | < 500ms |
| Cache hit rate | 0% | > 70% |
| NPS score | Unknown | > 40 |
| Customer health (avg) | Unknown | > 70 |
| Monthly churn rate | Unknown | < 3% |
| Time to onboard | Unknown | < 5 minutes |
| Feedback response time | N/A | < 24 hours |

---

## Appendix A: API Endpoints Needed

### New Admin Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/admin/dashboard/overview` | GET | Customer count, active, churned, growth |
| `/api/admin/dashboard/revenue` | GET | MRR, ARR, revenue per tier |
| `/api/admin/dashboard/performance` | GET | API latency, error rate, cache stats |
| `/api/admin/issues` | GET, POST | List/create issues |
| `/api/admin/issues/[id]` | GET, PATCH | Update issue status/priority/assignee |
| `/api/admin/feedback` | GET, POST | List/create feedback |
| `/api/admin/feedback/[id]` | PATCH | Update feedback status |
| `/api/admin/nps` | GET | NPS scores, trend, segments |
| `/api/admin/customers/[id]/health` | GET | Per-user health score breakdown |
| `/api/admin/customers/[id]/journey` | GET | User lifecycle events |
| `/api/admin/revenue/subscriptions` | GET | All subscriptions, status, renewal |
| `/api/admin/revenue/churn` | GET | Churn analysis, at-risk users |

### New User-Facing Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/feedback` | POST | Submit feedback/bug report |
| `/api/feedback/features` | GET | Feature request board |
| `/api/feedback/features/[id]/vote` | POST | Upvote feature request |
| `/api/feedback/nps` | POST | Submit NPS response |

---

## Appendix B: Environment Variables Needed

```env
# === Observability ===
SENTRY_DSN=                    # Sentry error tracking
SENTRY_ENVIRONMENT=production
OTEL_EXPORTER_OTLP_ENDPOINT=   # OpenTelemetry collector URL
OTEL_SERVICE_NAME=mymoney

# === Feature Flags (Runtime) ===
FEATURE_FEEDBACK_ENABLED=true
FEATURE_ISSUE_TRACKING_ENABLED=true
FEATURE_ONBOARDING_EMAILS_ENABLED=true

# === Email (Onboarding/Transactional) ===
RESEND_API_KEY=               # Transactional emails
EMAIL_FROM=noreply@mymoney.app

# === Razorpay Webhooks ===
RAZORPAY_WEBHOOK_SECRET=       # For webhook signature verification

# === Load Testing ===
K6_CLOUD_TOKEN=               # k6 cloud for load testing
```

---

*This document should be reviewed and updated as the product evolves. Implementation follows the phased roadmap in §10, with each phase building on the previous.*
