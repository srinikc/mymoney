# Cloud Deployment Guide — Single-Vendor (Supabase) + Multi-Vendor (Neon+Upstash)

This guide covers **two deployment paths** for MyMoney to a public URL. The recommended path (Supabase) uses one vendor for DB + cache + storage. The alternative (Neon + Upstash) uses separate best-in-class services.

**Time to deploy:** ~30 minutes (mostly waiting for accounts to provision).

---

## Which path should I pick?

| If you... | Use |
|----------|-----|
| Want the simplest possible setup | **Path A: Supabase** ⭐ recommended |
| Want to browse your database in a web SQL editor | **Path A: Supabase** |
| Want file storage for receipts already wired in | **Path A: Supabase** |
| Want to keep components swappable later | Path B: Neon + Upstash |
| Plan to use heavy realtime features (live updates) | **Path A: Supabase** |

**My recommendation: Path A (Supabase).** The free tier is generous, the dashboard is excellent, and having one vendor for the database makes debugging much easier.

---

# Path A: Vercel + Supabase (recommended)

## Architecture

```
┌──────────────────────────────────────────────┐
│  Browser / Mobile                             │
│  https://mymoney-app.vercel.app                │
└──────────────┬───────────────────────────────┘
               │ HTTPS (auto)
               ▼
┌──────────────────────────────────────────────┐
│  Vercel (host)                                │
│  - Next.js app                                 │
│  - Serverless functions                       │
│  - TLS + Brotli compression (auto)            │
└──────────────────┬───────────────────────────────┘
               │
               │ DATABASE_URL
               ▼
┌──────────────────────────────────────────────┐
│  Supabase (database + extras)                 │
│  - Postgres 0.5 GB free                       │
│  - Built-in Redis-compatible cache            │
│  - 1 GB file storage free                     │
│  - SQL editor in dashboard (killer feature)  │
│  - 7-day point-in-time recovery               │
└──────────────────────────────────────────────┘
```

**Accounts needed (2):** Vercel + Supabase. Plus GitHub if you don't have it yet (3 total).

## Step 1 — Provision Supabase

1. Go to https://supabase.com → Sign up with GitHub
2. Click **New project**:
   - **Name:** `mymoney`
   - **Database password:** choose a strong one (save it — you need it for the URL)
   - **Region:** closest to your users (e.g. `Singapore` for India, `South America` for Brazil, `West US` for North America)
   - **Plan:** Free
3. Click **Create new project** — takes ~1 minute to provision
4. Once ready, go to **Settings → Database** and copy the **Connection string** under "Transaction pooler":

   ```
   postgresql://postgres.abcdefghijkl:YOUR-PASSWORD@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres
   ```

   Replace `YOUR-PASSWORD` with the password you set. This is your **`DATABASE_URL`**.

5. (Optional) Go to **Settings → API** to get:
   - `Project URL` — for the Supabase JS client (if you ever want it)
   - `anon public` key — same
   - `service_role` key — server-side only, never expose to browser

> **The transaction pooler URL is critical for Vercel serverless.** Vercel functions are short-lived and can't hold a persistent connection. The pooler multiplexes many short-lived connections over a few real ones. Without `?pgbouncer=true&connection_limit=1`, you'll exhaust the database connection limit on the free tier within minutes.

## Step 2 — Push your code to GitHub

If you haven't already:

```bash
cd "C:\Users\ADMIN\Documents\Srinikc\AI Products\mymoney"
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/mymoney.git
git push -u origin main
```

> **Important:** Verify `.env` is in `.gitignore` so you don't commit secrets.

## Step 3 — Deploy to Vercel

1. Go to https://vercel.com → Sign up with GitHub
2. Click **Add New Project** → Import your `mymoney` repo
3. Vercel auto-detects Next.js. Settings:
   - Framework Preset: **Next.js**
   - Build Command: `npm run build` (default)
   - Install Command: `npm install` (default)
4. Click **Environment Variables** and add:

```env
# REQUIRED — database
DATABASE_URL=postgresql://postgres.abcdefghijkl:YOUR-PASSWORD@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1

# REQUIRED — auth
# Generate: openssl rand -base64 32
NEXTAUTH_SECRET=PASTE_A_RANDOM_32_BYTE_STRING_HERE
NEXTAUTH_URL=https://mymoney-app.vercel.app
NEXT_PUBLIC_BASE_URL=https://mymoney-app.vercel.app
NEXT_PUBLIC_APP_URL=https://mymoney-app.vercel.app

# OPTIONAL — Google OAuth (for "Sign in with Google")
# Get from https://console.cloud.google.com/apis/credentials
AUTH_GOOGLE_ID=
AUTH_GOOGLE_SECRET=

# OPTIONAL — email magic links (Resend free tier = 100/day)
AUTH_RESEND_KEY=
```

> **Set `NEXTAUTH_URL` after first deploy** — Vercel shows you the URL (e.g. `mymoney-app.vercel.app`) and you can edit the env var. You can't set it before the first deploy because you don't know the URL yet.

5. Click **Deploy**. First build takes 3-5 minutes. The build will fail at the Prisma generation step if `DATABASE_URL` is wrong — read the error carefully.

6. Once deployed, you get a URL. **Edit the `NEXTAUTH_URL` env var to match this URL**, then redeploy.

## Step 4 — Run the database migration

After the first successful deploy, the database is empty. Apply the Prisma schema:

```bash
# In your project root, temporarily set the prod DATABASE_URL
$env:DATABASE_URL="postgresql://postgres.abcdefghijkl:YOUR-PASSWORD@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1"
# PowerShell
# or
export DATABASE_URL="..."  # bash

# Apply all migrations
npx prisma migrate deploy
```

That's it. The schema is now live.

> **To see the data in Supabase's SQL editor:** go to your Supabase project → **SQL Editor** → run any query like `SELECT * FROM "Expense" LIMIT 10;`. This is the killer feature of using Supabase over a bare Postgres host.

## Step 5 — Verify

Visit `https://mymoney-app.vercel.app` in your browser:

1. **First user becomes admin** (or use `/setup` if it exists) — sign up at `/login`
2. **Complete profile** at `/settings/profile` — set DOB, income
3. **Try the budget allocation wizard** at `/budgets` → click "Suggest budgets"
4. **Check insights** at `/insights` → should show 7 spending detectors
5. **Verify HTTPS headers:**
   ```bash
   curl -I https://mymoney-app.vercel.app/api/health/redis
   ```
   Should show `strict-transport-security: max-age=63072000; includeSubDomains; preload`
6. **Verify gzip compression:**
   ```bash
   curl -H "Accept-Encoding: gzip" -I https://mymoney-app.vercel.app/api/categories
   ```
   Should show `content-encoding: gzip` and `vary: Accept-Encoding`
7. **Check rate limit config:**
   ```bash
   curl https://mymoney-app.vercel.app/api/health/rate-limit
   ```

---

# Path B: Vercel + Neon + Upstash (alternative)

Use this if you want to keep components swappable, or if you have specific reasons to avoid Supabase.

## Architecture

```
Browser → Vercel → Neon Postgres
                  → Upstash Redis
                  → (Resend for email)
```

**Accounts needed (3):** Vercel + Neon + Upstash. Plus Resend if you want email.

## Steps

1. **Neon:** https://neon.tech → New project → copy `DATABASE_URL` (format: `postgresql://neondb_owner:password@ep-xxx.region.aws.neon.tech/neondb?sslmode=require`)
2. **Upstash:** https://upstash.com → Create Redis database → copy `REDIS_URL` (format: `rediss://default:password@ep-xxx.upstash.io:6379`)
3. **Vercel:** import the project, set:
   ```env
   DATABASE_URL=postgresql://neondb_owner:...  # from Neon
   REDIS_URL=rediss://default:...               # from Upstash
   REDIS_ENABLED=true
   NEXTAUTH_SECRET=<openssl rand -base64 32>
   NEXTAUTH_URL=https://mymoney-app.vercel.app
   NEXT_PUBLIC_BASE_URL=https://mymoney-app.vercel.app
   NEXT_PUBLIC_APP_URL=https://mymoney-app.vercel.app
   ```
4. **Run migration:** `npx prisma migrate deploy` with the Neon `DATABASE_URL`
5. **Done.** Same verification steps as Path A.

---

# What about Redis? (asked about "cahce")

You asked specifically about whether we need cache. Honest answer:

**MyMoney works WITHOUT Redis.** The code already has a fallback to in-process memory cache when `REDIS_URL` is not set:

```typescript
// src/lib/redis.ts (already implemented)
const REDIS_ENABLED = process.env.REDIS_ENABLED !== "false"
// Falls back to a 1000-entry in-memory Map if Redis is unreachable
```

**But Redis is recommended for external deployment because:**
- On Vercel serverless, each function instance has its own in-memory cache. If your request lands on a different instance, it re-fetches everything.
- With 100 req/day, you'd never notice. With 1000+ req/day, you'd see cache-miss latency.

**For your scale (personal finance app, probably < 100 req/day):** skip Redis. Set `REDIS_ENABLED=false` or just don't set the env var. The app works fine with the in-memory fallback.

**If you scale up later:** add Upstash Redis (10k commands/day free, same as Upstash you'd use in Path B). Or use Supabase's Redis-compatible cache (if you picked Path A).

**TL;DR for cache:**
- Skip it for now
- Add it later when you need it (5 min to set up)
- The code already handles both modes

---

# Mobile app pointing to the cloud

Update `mobile/app/api/client.ts` (or wherever the base URL is):

```typescript
// Before (local dev)
const API_BASE = "http://localhost:3005";

// After (Vercel deployment)
const API_BASE = "https://mymoney-app.vercel.app";
```

Then rebuild:
```bash
cd mobile
eas build --platform android --profile production
```

---

# Free-tier limits (both paths)

| Resource | Limit | Enough for... |
|----------|-------|----------------|
| **Vercel** | 100GB bandwidth, 1M invocations, 100 concurrent | ~30k requests/day |
| **Supabase DB** | 0.5GB storage, 5GB egress, auto-pause | 500k expense rows, 1 small DB |
| **Supabase Cache** | Built-in (Deno-style KV, no separate limit at free tier) | Same scale as DB |
| **Supabase Storage** | 1GB | ~1000 receipt images |
| **Supabase Realtime** | 200 concurrent + 2M messages/mo | Personal use unlimited |
| **Neon DB** | 0.5GB, 191 compute hrs/mo | Same as Supabase |
| **Upstash** | 10k Redis commands/day | ~300 reads/day |

**For personal use:** all paths stay at $0/mo forever.

---

# Cost projection when you outgrow free tier

| Scale | Vercel | Supabase/Neon | Upstash (if used) | Total/mo |
|-------|--------|----------------|--------------------|----------|
| Personal (1 user) | $0 | $0 | $0 | **$0** |
| Small family (5 users) | $0 | $0 | $0 | **$0** |
| Heavy personal (1 user, 5K req/day) | $0 | $0–$5 | $0 | **$0–$5** |
| Friends (20 users, 20K req/day) | $0–$20 | $0–$25 (Pro) | $0 | **$0–$45** |
| Public (100+ users) | $20–$200 | $25–$599 (Team) | $0–$10 | **$45–$809** |

For the first three rows, $0/mo. Costs scale linearly.

---

# Single-vendor vs multi-vendor — full comparison

| Concern | Path A (Supabase) | Path B (Neon+Upstash) |
|---------|-------------------|------------------------|
| **Accounts** | 2 (Vercel + Supabase) | 4 (Vercel + Neon + Upstash + Resend) |
| **Setup time** | ~30 min | ~30 min |
| **Dashboards to check** | 2 | 4 |
| **Data debugging** | ✅ SQL editor in browser | ❌ Need separate tool |
| **File storage** | ✅ Built-in | ❌ Need S3/R2 later |
| **Realtime** | ✅ Built-in | ❌ Need separate service |
| **Cache** | ✅ Built-in | ✅ Upstash |
| **Auth alternative** | ✅ Supabase Auth | ❌ Stick with NextAuth |
| **Lock-in** | ❌ Higher | ✅ Lower (standard Postgres) |
| **Performance** | Same | Same |
| **Free tier** | Same | Same |
| **My recommendation** | ⭐ Yes for you | Only if avoiding lock-in |

---

# Quick start: Path A in 10 commands

```bash
# 1. Sign up at vercel.com and supabase.com (browser)

# 2. Create Supabase project, copy connection string

# 3. Push to GitHub
git init && git add . && git commit -m "Initial" && git push origin main

# 4. Install Vercel CLI
npm i -g vercel

# 5. Login to Vercel
vercel login

# 6. Link the project
vercel link

# 7. Set environment variables
vercel env add DATABASE_URL production
# paste: postgresql://postgres.abcdefghijkl:YOUR-PASSWORD@aws-0-xxx.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1

vercel env add NEXTAUTH_SECRET production
# paste: (output of: openssl rand -base64 32)

# 8. Deploy
vercel --prod

# 9. After first deploy, set NEXTAUTH_URL to the actual URL
vercel env add NEXTAUTH_URL production
# paste: https://mymoney-app.vercel.app
vercel env add NEXT_PUBLIC_BASE_URL production  # same
vercel env add NEXT_PUBLIC_APP_URL production   # same
vercel --prod  # redeploy

# 10. Run migration locally against the prod DB
DATABASE_URL="<the-supabase-url>" npx prisma migrate deploy

# 11. Visit https://mymoney-app.vercel.app — done
```

---

# Troubleshooting

### "Can't reach database" on Vercel
- `DATABASE_URL` must include the **transaction pooler** (port 6543, not 5432) for Supabase
- Must include `?pgbouncer=true&connection_limit=1` for Supabase serverless
- For Neon, must include `?sslmode=require`

### "Module not found" on Vercel
- Vercel auto-runs `prisma generate` if `@prisma/client` is in `dependencies`
- If not, add to `package.json`:
  ```json
  { "scripts": { "postinstall": "prisma generate" } }
  ```

### "Invalid NEXTAUTH_URL" error
- Must exactly match the deployed URL (no trailing slash, must be https)
- After first deploy, edit the env var to match the actual Vercel URL

### Google OAuth doesn't work
- The redirect URI in Google Cloud Console must exactly match `<NEXTAUTH_URL>/api/auth/callback/google`
- Add both dev (localhost) and prod URLs to Google Console

### Mobile app login redirects to wrong URL
- The mobile app reads `NEXTAUTH_URL` at build time
- Rebuild after changing the URL: `eas build --platform android --profile production`

### Cold start is slow (1-3 sec first request)
- Normal for Vercel serverless + Supabase auto-pause
- Upgrade to Vercel Pro ($20/mo) for always-warm functions
- Or add a cron job that pings your URL every 5 minutes to keep it warm (Vercel has a "Cron Jobs" feature for this)

---

# Files in your repo this guide touches

- `.env` (local dev) — you have this
- `.env.template` — already has HTTPS section; should add Vercel-specific notes
- `next.config.ts` — has `compress: true` (auto gzip)
- `src/lib/redis.ts` — has in-memory fallback (works without Upstash)
- `src/lib/with-auth.ts` — uses JWT strategy (no DB sessions, works fine serverless)
- `prisma/schema.prisma` — standard Prisma, works with any Postgres
