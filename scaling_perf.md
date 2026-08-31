# Scaling & Performance — Analysis & Roadmap

> Status: **PLANNED** — this document captures the current state, the known
> bottlenecks, and a phased proposal for scaling (DB, queries, caching, APIs,
> E2E/perf) as the app grows to thousands of vendors, lakhs of expenses, many
> users, and many profiles.
>
> Last reviewed: 2026-08-16

---

## 1. Current Architecture (as of writing)

### Stack
- **Web**: Next.js (App Router, `src/`), runs on port 3005 (dev) / `next start` (prod).
- **Mobile**: Expo / React Native (`mobile/`), talks to the SAME REST API routes
  (`/api/*`) — so API performance affects both platforms identically.
- **DB**: PostgreSQL via Prisma ORM (single datasource `DATABASE_URL`; separate
  `TEST_DATABASE_URL` for vitest). Prisma client is a lazy proxy keyed by
  "production"|"test" mode (`src/lib/prisma.ts`).
- **Auth**: NextAuth v5 (JWT strategy, A256CBC-HS512 encrypted session cookie) +
  Credentials/Google providers. `getAuthContext()` in `src/lib/with-auth.ts`.
- **Infra (current)**: single Node server + single Postgres on localhost.
  No load balancer, no read replicas, no cache layer, no CDN config beyond
  Next.js defaults.

### Data model facts relevant to scale
- `Expense` — the largest table by far. Indexes:
  `[date]`, `[categoryId]`, `[vendor]`, `[person]`, `[importSessionId]`,
  `[profileId]`, `[profileId, subCategory]`, `[profileId, person]`,
  `[profileId, deletedAt]`. (The last three were added 2026-08-16 to support the
  mapping-retrofit query.)
- `VendorMapping` — per-user; unique `[userId, vendorKey]`, index `[userId]`.
- Every query is scoped by `userId` / `profileId` → **multi-tenancy is
  structurally sound**; one user's operation never scans another's data.
  Scaling concern is *per-user volume* (a single user with lakhs of rows), not
  the user count itself.
- Categories are GLOBAL (shared across all users), not per-user.

---

## 2. Known Bottlenecks Today (verified)

| # | Area | Issue | Severity |
|---|------|-------|----------|
| B1 | `GET /api/expenses` | List page fetches a full page of expenses **plus** distinct sub-categories/persons and totals. As rows grow to lakhs, the distinct/aggregate subqueries get heavy. Needs server-side pagination + aggregates already done, but no caching. | Medium |
| B2 | `GET /api/vendors/unmapped` | Loads **ALL** the user's expenses (`findMany` vendor+amount+categoryId), groups in Node, then queries VendorMapping in 50-batch loop. O(user's expenses) on every page load — will be slow at lakhs. | High |
| B3 | `GET /api/vendors/all` + `latest-timestamp` | Full mapping dump per load. | Low-Med |
| B4 | Mapping retrofit (`POST /api/vendors/apply-mappings`) | Now **set-based + index-assisted** (only fetches incomplete rows; batched `updateMany`). Scoped per-user. Scales well, but still a full scan of a user's *incomplete* rows — fine today, revisit only if incomplete set grows huge. | Low |
| B5 | Import routes (`/api/import`, `/api/import/bank-csv`, `/api/import/bank-pdf`, `/api/import/kcexpenses`) | N+1 per-row `findFirst`/`create` for dedup + categorize. At lakhs of rows per import, this becomes slow. Needs batching. | High |
| B6 | `getVendorMappingMap` / `getExistingVendorKeys` | In-memory cache keyed by userId — invalidated on writes (good), but it is a plain `Map` in the server process → **not shared** across server instances/restarts, and grows unbounded. | Medium |
| B7 | `getCatId` / `autoCategorize` | Module-level `catCache` — same concerns as B6. | Medium |
| B8 | GPay Drive polling | Client-side 15s polling hits `/api/drive/list` repeatedly; each call queries the Drive API + 4 Drive queries. Not DB-heavy but chatty. | Low |
| B9 | No caching layer anywhere | Every page/API re-derives totals, aggregates, sub-categories, unmapped counts from DB. | High |
| B10 | Reports / Insights / Net-worth / Health-score / What-if | Likely recompute aggregates from raw expenses on each request (verify each route). At lakhs of rows these get expensive. | High |
| B11 | Receipt uploads / file serving | Files served via `/api/files/*`. No CDN/object storage. | Medium |

---

## 3. Multi-User / Multi-Profile (n users × n profiles)

**Current guarantees (verified):**
- All expense reads/writes filter by `profileId`; all mapping reads/writes filter
  by `userId`.
- `getAuthContext()` resolves the caller's default profile → cross-user leakage
  is not possible at the query layer.
- `apply-mappings` iterates only the caller's mappings + profiles.

**What must hold as n grows:**
1. **No cross-user joins in hot paths** — keep `WHERE userId = ?` / `profileId IN (...)`.
2. **Per-user caches must be keyed by userId** and invalidated on the user's writes
   (already the pattern in `vendor-mapping.ts`), but move to a shared store (Redis)
   once >1 server instance exists.
3. **Connection pooling** — single Prisma client per process is fine; if multiple
   instances, ensure pool sizing per instance (Prisma default pool = `num_cpus*2+1`).
4. **Admin endpoints** (`/api/admin/*`) must paginate/aggregate in SQL, never
   `findMany()` all users' rows.

---

## 4. Proposed Phases (roadmap)

### Phase 1 — Database & query hardening (no infra change)
- [x] Composite indexes on `Expense` for retrofit query (`[profileId, subCategory]`,
      `[profileId, person]`, `[profileId, deletedAt]`). *(done 2026-08-16)*
- [ ] Add composite indexes for the most common list filters:
      `[profileId, date, deletedAt]`, `[profileId, categoryId, date]`,
      `[profileId, vendor, date]`.
- [ ] Convert import routes (B5) to **batch upserts** (`createMany` + in-memory
      dedup set, or `INSERT ... ON CONFLICT DO NOTHING` via raw SQL). Target: one
      DB write batch per ~500-1000 rows instead of per-row `create` + `findFirst`.
- [ ] Rewrite `GET /api/vendors/unmapped` (B2) as a **single SQL aggregation**
      (`GROUP BY lower(vendor)` with `LEFT JOIN` on VendorMapping / dismissed
      setting) instead of loading all expenses into Node.
- [ ] Audit `reports`/`insights`/`net-worth`/`health-score`/`what-if` routes (B10):
      ensure they compute aggregates in SQL (Prisma `aggregate`/`groupBy`) rather
      than fetching raw rows.
- [ ] `Expense` table: consider partitioning by `profileId` (or archive) at very
      large scale; at minimum keep hard-delete/archive hygiene so `deletedAt`
      filtering stays cheap.

### Phase 2 — Caching (middle ground, big win)
- [ ] Introduce a shared cache (Redis) OR in-process TTL cache with a clear
      invalidation strategy:
  - **Read-through cache** for: unmapped-vendor counts, expense list aggregates
    (totals, distinct sub-categories/persons), report/insight aggregates.
  - **Cache key**: `{userId}:{profileId}:{resource}:{filter-hash}`.
  - **Invalidation**: on any expense/mapping write for that profile/user (single
    invalidation point per write route), plus a short TTL (e.g. 30-60s) for
    safety. This is the single biggest cost reducer.
- [ ] Move `vendor-mapping.ts` / category caches to the shared cache (currently
      process-local `Map`s — see B6/B7).
- [ ] HTTP-level caching for read-only endpoints (SWR/revalidate or
      `Cache-Control` + ETag) on stable data (categories, vendor lists).
- [ ] Client-side: keep existing React state; add SWR/TanStack Query style
      stale-while-revalidate for list/aggregate endpoints to avoid refetch on
      every keystroke.

### Phase 3 — API & traffic
- [ ] Rate limiting / abuse protection on public endpoints (auth, import, upload).
- [ ] Timeouts + streaming for long-running import endpoints (they currently
      block the request for the whole import).
- [ ] Job queue (BullMQ/Redis) for heavy async work (GPay Drive polling,
      large imports, bank-analysis) so HTTP handlers return fast and work is
      idempotent.
- [ ] Paginate `GET /api/vendors/all` (server-side cursor) instead of dumping all
      mappings at once.
- [ ] `GET /api/expenses` — return only the current page + a cached aggregate
      summary (totals/distincts) so the page is fast even at lakhs.

### Phase 4 — Infra & E2E performance
- [ ] Move to multiple server instances behind a load balancer; ensure stateless
      sessions (JWT already stateless) and shared cache (Redis) so any instance
      serves any request.
- [ ] Postgres read replicas for read-heavy aggregate routes (reports, insights,
      unmapped) — write path stays on primary.
- [ ] Connection pooling via PgBouncer if replica/instance count grows.
- [ ] Object storage (S3-compatible) + CDN for receipt uploads instead of DB/disk.
- [ ] Query plan review: run `EXPLAIN ANALYZE` on the hot queries above after
      each Phase-1 change to confirm index usage.
- [ ] Load test with realistic data (e.g. 1 user × 1M expenses, 10k vendors;
      10k users × 1k expenses) using k6 to validate p95 latencies before launch.

---

## 5. E2E (End-to-End) Performance Dimensions

Performance spans the whole path **user → client → network → server → API → DB →
external services (Google Drive/Gmail, Razorpay, brokers) → common infra**.

| Layer | Concern | Current state | Proposal |
|-------|---------|---------------|----------|
| Client (web) | Bundle size, JS parse/exec, water-fall of fetches | Single-page lists refetch on every action | Route-level code splitting, SWR dedupe/cache, skeleton states; audit `next build` bundle |
| Client (mobile) | API chattiness, cold start | Fetches per screen; no offline cache | Query client caching, optimistic updates, offline-first for reads |
| Network | Payload size, compression, latency | JSON via `/api/*`; no explicit gzip config for API | Enable compression on API responses; trim fields returned by list endpoints |
| Server | Response time, concurrency, blocking work | Synchronous imports block the request | Phase 3 job queue + streaming; avoid heavy work in route handlers |
| API | N+1 queries, missing pagination, no cache headers | Several routes do per-row work (B5) or full scans (B2/B3) | Phase 1/2 changes above |
| DB | Indexes, aggregates, connection pooling | Good per-user scoping; some missing composite indexes | Phase 1 indexes + SQL-side aggregates; replicas in Phase 4 |
| External | GPay/Gmail/Drive/bank APIs | GPay Drive polling is chatty (B8); Gmail scan can be long | Backoff, caching of Drive listings, job queue for scans |
| Common infra | Logging, metrics, monitoring, error tracking | Basic `console.error` only | Structured logging, request tracing, APM (e.g. Sentry/OTel), latency SLOs, alerting |

**Expected impact:** If Phase 1 (SQL/index) + Phase 2 (caching) are done, an
estimated **70–80%** of the scale problem is addressed for the hot read paths
(expenses list, unmapped vendors, reports, insights). The remaining 20–30% is
infra (replicas, load balancing, object storage) plus E2E client-side/network
optimization. Items NOT covered by caching (large bulk imports, uploads,
external API latency) need Phase 3/4 work (job queue, streaming, storage).

---

## 6. Quick Wins (do these first)

1. **Indexes** — already added for the retrofit; add the list-filter composite
   indexes (Phase 1).
2. **Rewrite `/api/vendors/unmapped`** as a single SQL aggregate (biggest
   single-page win at scale).
3. **Batch import writes** — eliminates per-row N+1 on the largest write path.
4. **Read-through cache with write-invalidation** — biggest aggregate win across
   expenses/reports/insights/vendors.
5. **Move per-process `Map` caches** (B6/B7) to the shared cache.

---

## 7. Notes / Decisions Log

- 2026-08-16: Added `[profileId, subCategory]`, `[profileId, person]`,
  `[profileId, deletedAt]` indexes on `Expense` + migration file
  `20260816_add_expense_retrofit_indexes`; applied to the live dev DB via raw
  SQL (migration dir created manually because `prisma migrate dev` wanted to
  reset the DB due to pre-existing drift).
- 2026-08-16: `POST /api/vendors/apply-mappings` shipped as a set-based,
  index-assisted retrofit (only touches incomplete rows; batched `updateMany`)
  — see B4.
- 2026-08-16: Fixed Drive GPay import so unmapped transactions no longer land in
  a hardcoded category id 13 (`house-monthly`); now find-or-creates a real
  "Other" category and applies the user's vendor mappings at import time.
- 2026-08-16: Added "Update Expense Page" button (web + mobile) that calls
  `/api/vendors/apply-mappings`.