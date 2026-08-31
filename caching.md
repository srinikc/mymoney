# MyMoney — Industry-Standard Caching & Performance Plan

> Status: **PLANNED** (audit complete; not yet implemented)
> Last updated: 2026-08-15

This document is the single source of truth for the caching/performance work.
It captures the current-state audit, the industry-standard target architecture,
the exact changes to make, the expected benefits, and how to measure them.

---

## 1. Why this matters (measured today)

Every page-load re-fetches everything from the database with **no cache at any
layer**. The dashboard alone fires **4 API calls per visit** (`/api/expenses/years`,
`/api/health-score`, `/api/insights`, `/api/insights/deep`) and several of those
are N+1 queries.

### Measured current-state facts

| Metric | Value |
|---|---|
| Expenses in DB | **11,297** |
| Expense categories | **86** |
| API route handlers (`src/app/api/**/route.ts`) | **135** |
| Web client `fetch("/api/...")` call sites | **~141** |
| Mobile client API call sites (axios) | **~204** |
| Home page client bundle (`/`) | **9.1 MB** raw (pulls full recharts) |
| Root layout client bundle | **4.8 MB** raw |
| `main-app.js` (app shell) | **7.2 MB** raw |
| `/api/insights/deep` DB queries per request | **≈ 86–100** (per-category loops) |
| `/api/health-score` DB queries per request | **≈ 90+** (per-category loop) |
| `/api/expenses/years` rows scanned | **all 11,297** (to derive years) |
| First-load API latency (dev server log) | **7.1 s / 7.7 s** on cold first-hit |
| Pages using recharts | 3 (`/`, `/insights`, `/reports`) |
| Service worker registered | **No** (only a trivial pass-through `sw.js`, unregistered) |

---

## 2. Caching audit — what exists vs. industry standard

| Layer | Today | Industry standard | Gap |
|---|---|---|---|
| **Database** | Prisma singleton (reused connection) ✅; indexes on `Expense(date, categoryId, vendor, person, profileId)` ✅ | Connection reuse + proper indexes + no N+1 | **N+1 queries** in insights/health-score; `years` scans all rows |
| **Server query cache** | ❌ None — every request re-hits DB | In-process TTL cache (per user + params) via `unstable_cache` / memoized query layer | **Missing entirely** |
| **HTTP / CDN** | ❌ Only receipts have `Cache-Control`. All other APIs bare | `Cache-Control: private, max-age=…, stale-while-revalidate` on GETs; `no-store` on mutations; user financial data is per-user → never shared/CDN | **Missing entirely** |
| **Client data** | ❌ Bare `fetch` in `useEffect` everywhere — no dedup, no cache, re-fetch on every mount/back-nav | TanStack Query (`@tanstack/react-query`): query keys, dedup, `staleTime`, `gcTime`, background refetch | **Missing entirely** |
| **PWA / Service Worker** | ❌ `sw.js` trivial pass-through, **not registered** | Register SW; precache app shell; cache-first hashed chunks; network-first navigations; stale-while-revalidate GET APIs; network-only mutations | **Missing entirely** |
| **Static assets** | No long cache headers on `/icons/*` | `Cache-Control: public, max-age=31536000, immutable` for hashed chunks + icons; `manifest.json` short/no-cache | **Missing** |
| **Bundles** | Home 9.1 MB / layout 4.8 MB / shell 7.2 MB raw | Dynamic-import heavy libs (recharts), audit root providers | **recharts bundled into home page** |
| **Build** | Dev on-demand compile → cold first-hit 7 s | Production build (`next build`) removes per-route compile | Not the prod path; still needed for prod sizing |

---

## 3. Target architecture (industry-standard, per layer)

### Layer 1 — Database
- **Keep**: Prisma singleton, existing indexes.
- **Add**: Kill N+1 patterns (see Phase B). Add a composite index if profiling shows
  a hot query (`profileId, date` is a strong candidate for dashboard aggregates).

### Layer 2 — Server-side query cache
- Wrap expensive/dashboard reads in a per-user, time-limited cache:
  `cacheKey = userId + endpoint + params`.
- TTL **~30 s** for dashboard aggregates (fresh enough for a finance app, cuts
  DB load massively on back-nav/rapid reloads).
- Implementation: a small in-memory `Map` with expiry (single-process dev/small
  deploy) OR Next.js `unstable_cache`/`revalidateTag` (multi-process/Vercel).
- **Only GET, never mutations.** Never cache across users (privacy).

### Layer 3 — HTTP cache headers (correct semantics)
- Auth'd user data → **`private`** (never shared/CDN — it's financial data):
  - Dashboard GETs: `Cache-Control: private, max-age=60, stale-while-revalidate=60`
  - Mutation endpoints (POST/PUT/DELETE): `Cache-Control: no-store`
- Static assets (hashed `_next/static`): `public, max-age=31536000, immutable`
  (Next does this automatically in prod builds).
- `/icons/*`: `public, max-age=31536000, immutable`.
- `manifest.json` / `sw.js`: `no-cache` (must revalidate on updates).

### Layer 4 — Client data layer (TanStack Query)
- Add `@tanstack/react-query`; mount `QueryProvider` in the root layout.
- `useApiQuery(key, url, opts)` hook wrapping `useQuery`:
  - `staleTime: 60_000` (don't refetch data that's <60 s old on remount/back-nav)
  - `gcTime: 5 min`, `retry: 2`, `refetchOnWindowFocus: false`
  - Query key = `[method, path, sortedParams]` → **automatic dedup** of concurrent
    calls (dashboard fires 4 calls; shared keys merge).
- Migrate the high-traffic screens first: `/` (4 calls), `/expenses`,
  `/expenses/merchants`, `/insights`, `/reports`.
- Keep mutations (create/update/delete) issuing direct POST/PUT/DELETE and then
  `invalidateQueries`/`setQueryData` on the affected keys (optimistic updates).

### Layer 5 — PWA / Service Worker
- **Register** the SW on the client (currently not registered at all).
- Upgrade `sw.js`:
  - `install`: precache app shell + `/manifest.json` + icons.
  - `activate`: claim clients, clean old caches.
  - `fetch` strategy:
    - Navigations → **network-first**, fallback to cached shell (offline).
    - `/_next/static/*` (hashed) → **cache-first** (immutable).
    - `/icons/*`, `/manifest.json` → cache-first.
    - `GET /api/*` → **stale-while-revalidate** (serve cache, refresh in bg).
    - `POST/PUT/DELETE` → network-only (never cache mutations).
- Note: financial privacy — API GET cache in the SW is browser-local only.

### Layer 6 — Bundles
- `next/dynamic` (ssr: false) for recharts-based chart components in `/`,
  `/insights`, `/reports` so non-chart-first loads don't pay 9 MB.
- Audit root layout providers (FloatingChat/motion is the largest per-page cost).

### Layer 7 — Production build
- Run `next build` to eliminate dev on-demand compile; size & verify bundles.

---

## 4. Changes to make (implementation checklist)

### Phase A — Client data layer (highest user-visible win)
- [ ] Add `@tanstack/react-query` to `package.json` (web). (Mobile: mirror with
      `@tanstack/react-query` + axios adapters if cross-platform rule applies.)
- [ ] Create `QueryProvider` and mount in `src/app/layout.tsx`.
- [ ] Create `useApiQuery` hook (defaults above).
- [ ] Migrate `/` dashboard fetches (4 calls) → `useApiQuery`.
- [ ] Migrate `/expenses`, `/expenses/merchants`, `/insights`, `/reports`.
- [ ] Add mutation + invalidate helpers for the main CRUD flows.

### Phase B — Server-side query cache + kill N+1
- [ ] `/api/insights/deep`: replace per-category loops with single
      `groupBy(["categoryId"])` + `_sum`/`_count`, and one `groupBy(["categoryId","subCategory"])`.
- [ ] `/api/health-score`: replace per-category loop with one `groupBy`.
- [ ] `/api/expenses/years`: `groupBy` on `date` (or distinct year) instead of loading all rows.
- [ ] Add in-memory TTL cache (per user+params, 30 s) for `/api/insights`,
      `/api/insights/deep`, `/api/health-score`, `/api/expenses/years`.
- [ ] (Optional) composite index `(profileId, date)` if profiling warrants.

### Phase C — HTTP cache headers
- [ ] Add `Cache-Control` to dashboard GET endpoints: `private, max-age=60, stale-while-revalidate=60`.
- [ ] Ensure mutation endpoints return `no-store`.
- [ ] `next.config.ts` headers for `/icons/*` (immutable), `/manifest.json` (no-cache), `/sw.js` (no-cache).

### Phase D — PWA / Service Worker
- [ ] Register SW on client (`navigator.serviceWorker.register("/sw.js")`).
- [ ] Rewrite `sw.js` with the layered strategy above.
- [ ] Verify offline app-shell + offline navigation.

### Phase E — Bundles
- [ ] Dynamic-import recharts components in `/`, `/insights`, `/reports`.
- [ ] Rebuild and record new bundle sizes.

### Phase F — Verification (per AGENTS.md 9-step)
- [ ] `next build` production build.
- [ ] Measure cold + warm first-load per page (before/after).
- [ ] Confirm dashboard numbers identical (no data change).
- [ ] Typecheck + lint (web and mobile).
- [ ] Confirm auth/401 behavior unchanged; no cross-user data leaks from cache.
- [ ] Confirm mutations invalidate the right query keys.

---

## 5. Expected benefits (with stats)

### Latency — client & server
- **Home page repeat visits**: today re-fetches 4 endpoints every load
  (incl. an ~90-query `insights/deep`). With TanStack `staleTime: 60s`, returning
  to `/` within 60 s = **~0 API calls** (instant paint from cache), and >60 s =
  1 background refresh instead of 4 blocking calls.
  - **Expected: 2–5× faster repeat page loads** (client-side, no network).
- **Server DB load on dashboard**: `insights/deep` drops from **~86–100 queries →
  4 queries** (2 groupBys + monthly trend + YoY), `health-score` **~90+ → ~5**,
  `years` **11,297-row scan → 1 grouped query**.
  - **Expected: ~90–95% fewer DB queries** for the dashboard; the ~30 s server
    TTL cache removes repeat computation entirely for back-nav/rapid reloads.
- **First hit (dev)**: 7.1 s / 7.7 s today is mostly dev on-demand compile; a
  production build removes it (route handlers precompiled). Server TTL + client
  cache make subsequent hits <100 ms of compute.

### Bandwidth
- **Bundle**: home page 9.1 MB → dynamic recharts cuts the initial JS by roughly
  the recharts payload (**~500 KB–1 MB gzipped** depending on tree-shaking).
- **Repeat navigation**: cached chunks + SW cache-first static = **zero repeat
  network transfer** for unchanged JS/CSS/icons.

### CDN / privacy correctness
- Financial data stays `private` (never cached in shared/CDN caches) — no new
  privacy exposure. Browser-local caching only.

### Reliability / offline
- SW upgrade gives **offline app-shell navigation** and resilient static assets;
  previously the trivial `sw.js` was neither registered nor useful.

---

## 6. Risks & guardrails

- **Stale data**: 60 s `staleTime` + 30 s server TTL means a mutation may show
  stale for ≤60 s. Mitigate by invalidating query keys after every mutation
  (Phase A) — then data is fresh immediately after any write.
- **Cross-user leakage**: cache keys MUST include `userId`/`profileId`; all cached
  layers are per-user and private. Never use `public` on user data.
- **Dev vs prod**: dev on-demand compile skews timing; always measure against
  `next build` output.
- **Mobile parity**: per repo rule, mirror client caching in the mobile app
  (`@tanstack/react-query` works with axios; ~204 call sites — do in a dedicated
  pass, not mixed with web).

---

## 7. How to measure before/after

1. **Bundle sizes**: `next build` prints per-route sizes; also
   `Get-Item .next/static/chunks/**` total per page.
2. **API latency**: `next dev` request log (`GET /api/... in Nms`) and
   browser DevTools Network (per-request timing, count of requests per load).
3. **DB query count**: run each endpoint with `PRISMA_LOG=...` or instrument
   `prisma.$on("query")` (dev log already includes warn/error; enable `query`).
4. **Perceived load**: DevTools Performance — Time to Interactive on cold vs
   warm navigation; repeat-navigation network request count.

---

*To implement, follow this doc's Phase A → F order, then update the stats table
in §1 with before/after numbers and flip `Status` to IMPLEMENTED.*
