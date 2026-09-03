# Full-Feature Deployment Options

This document covers what breaks on Vercel serverless, why, and the
deployment options that give you the **full local experience** in
production.

## TL;DR

| Option | Cost | Effort | Full features? | Best for |
|---|---|---|---|---|
| **A. Self-host on a VPS (recommended)** | $5-20/mo | 1 day | ✅ Yes | Production with all features |
| **B. Refactor to cloud-native (Vercel + storage)** | $5-15/mo | 2-3 weeks | ✅ Yes | Long-term, scalable |
| **C. Hybrid: Vercel web + VPS worker** | $5-10/mo | 2-3 days | ✅ Yes | Quick full-feature without big refactor |

**Recommendation: Start with C (hybrid), then move to B as you grow.**

---

## What breaks on Vercel serverless

Vercel functions are **stateless** and have a **read-only filesystem**
(except `/tmp`, which is ephemeral and not shared between invocations).
The following features write to local disk and will throw `EROFS:
read-only file system` errors on Vercel:

| Feature | File | Vercel status | Workaround |
|---|---|---|---|
| **Receipt upload** | `src/app/api/receipt/upload/route.ts` | ❌ Fails | S3/R2 |
| **Tax document upload** | `src/app/api/tax/documents/route.ts` | ❌ Fails | S3/R2 |
| **File downloads** | `src/app/api/files/[id]/route.ts`, `receipt/[name]` | ❌ Fails | S3/R2 + signed URLs |
| **GPay job store** | `src/lib/gpay-job-store.ts` | ❌ Lost between requests | Redis or DB |
| **Rate limit store** | `src/shared/middleware/rate-limit.ts` | ❌ Reset on each deploy | Redis or DB |
| **DB mode config** | `src/lib/db-config.ts` | ❌ Fails | Admin env or DB |
| **Drive import error log** | `src/app/api/drive/import/route.ts` | ❌ Fails | DB or stderr |
| **GPay automation** | `scripts/refresh-gpay.mjs` | ❌ No Playwright | Already handled |
| **PDF generation** | `src/app/api/health-report/pdf/route.ts` | ⚠️ Works but slow | Move to worker |

Total: **8-9 features** affected by serverless limits.

---

## Option A: Self-host on a VPS (full local parity, fastest)

Run MyMoney on a single VPS with Docker or PM2. No code changes needed
for 95% of features.

### Recommended hosts

| Provider | Plan | Specs | Cost |
|---|---|---|---|
| **Hetzner** | CX22 | 2 vCPU, 4GB RAM, 40GB SSD | €4.5/mo |
| **DigitalOcean** | Basic Droplet | 1 vCPU, 2GB RAM, 50GB SSD | $6/mo |
| **Vultr** | Regular | 1 vCPU, 2GB RAM, 55GB SSD | $5/mo |
| **AWS Lightsail** | 1 GB | 1 vCPU, 1GB RAM, 40GB SSD | $5/mo |
| **Oracle Cloud** | Always Free ARM | 4 vCPU, 24GB RAM | Free |

For ~10-1000 users, the 2GB RAM tier is sufficient. Go to 4GB+ at 1000+ users.

### Deployment steps

1. **Provision VPS** (Ubuntu 22.04 LTS recommended)

2. **Install Docker + Node 20**:
   ```bash
   curl -fsSL https://get.docker.com | sh
   curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
   apt install -y nodejs
   apt install -y postgresql-client
   ```

3. **Set up PostgreSQL** (or use Supabase free tier — your choice):
   ```bash
   # Option 1: Local Postgres
   docker run -d --name postgres -p 5432:5432 \
     -e POSTGRES_USER=mymoney \
     -e POSTGRES_PASSWORD=<strong-pass> \
     -e POSTGRES_DB=mymoney \
     -v pgdata:/var/lib/postgresql/data \
     postgres:16-alpine

   # Option 2: Use Supabase (free 500MB) — set DATABASE_URL to Supabase pooler
   ```

4. **Clone the repo and configure**:
   ```bash
   git clone https://github.com/srinikc/mymoney.git /opt/mymoney
   cd /opt/mymoney
   cp .env.template .env
   # Fill in DATABASE_URL, AUTH_SECRET, etc.
   ```

5. **Set up Playwright** (only needed for GPay auto-refresh):
   ```bash
   npx playwright install --with-deps chromium
   ```

6. **Build and run with Docker Compose**:
   ```bash
   docker compose -f docker-compose.prod.yml up -d
   ```
   OR with PM2:
   ```bash
   npm ci
   npx prisma db push
   npm run build
   pm2 start npm --name mymoney -- start
   pm2 save
   pm2 startup
   ```

7. **Set up reverse proxy + SSL** (Caddy is easiest):
   ```bash
   apt install -y caddy
   # /etc/caddy/Caddyfile
   mymoney.yourdomain.com {
       reverse_proxy localhost:3005
   }
   systemctl restart caddy
   ```

8. **Set up cron** for the AI fund scoring (daily):
   ```bash
   crontab -e
   # Add: 0 6 * * * cd /opt/mymoney && npm run cron:funds
   ```

### Pros
- ✅ **100% feature parity** with local
- ✅ No code changes required
- ✅ Full Playwright + persistent Chrome profile
- ✅ Local filesystem for uploads
- ✅ One process to manage

### Cons
- ❌ You manage OS updates, security patches
- ❌ You manage database backups
- ❌ No auto-scaling (fixed capacity)
- ❌ You set up SSL certs
- ❌ Single point of failure (unless you add redundancy)

### Time: 1 day. Cost: $5-20/month.

---

## Option B: Refactor to cloud-native (Vercel + storage)

Keep Vercel for the web app, but refactor storage and state to use
cloud services. End state is most scalable.

### Required refactors (2-3 weeks)

1. **File uploads → Cloudflare R2 or AWS S3** (1-2 days):
   ```typescript
   // src/lib/storage.ts
   import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3"

   const s3 = new S3Client({
     region: "auto",
     endpoint: process.env.R2_ENDPOINT,
     credentials: {
       accessKeyId: process.env.R2_ACCESS_KEY!,
       secretAccessKey: process.env.R2_SECRET_KEY!,
     },
   })

   export async function uploadFile(key: string, buffer: Buffer, contentType: string) {
     await s3.send(new PutObjectCommand({
       Bucket: process.env.R2_BUCKET!,
       Key: key,
       Body: buffer,
       ContentType: contentType,
     }))
   }
   ```
   - R2 cost: $0.015/GB storage, $0.01/GB egress (10GB free)
   - Update `src/app/api/receipt/upload`, `tax/documents`, `files/*` to use this

2. **GPay job store + rate limit → Upstash Redis** (1-2 days):
   ```typescript
   // src/lib/redis.ts
   import { Redis } from "@upstash/redis"

   export const redis = Redis.fromEnv()  // Uses UPSTASH_REDIS_REST_URL/TOKEN
   ```
   - Update `gpay-job-store.ts` to use Redis hash + TTL
   - Update `rate-limit.ts` to use Redis sorted set (sliding window)
   - Upstash free tier: 10K commands/day, 256MB

3. **DB mode config → environment variable** (1 hour):
   - Replace `data/.db-mode.json` with `process.env.DB_MODE`
   - Admin sets via Vercel env var

4. **Drive import error log → DB table** (2-4 hours):
   - Add a simple `ErrorLog` Prisma model
   - Insert errors instead of writing to file

5. **GPay automation → Render/Railway worker** (1 day):
   - Move `scripts/refresh-gpay.mjs` to a separate worker service
   - Deploy to Render.com free tier or Railway (both support Playwright)
   - Vercel web app calls worker via webhook

### Pros
- ✅ Scales automatically
- ✅ Serverless (pay per use)
- ✅ Files persist across deployments
- ✅ Multi-region capable
- ✅ No infrastructure to maintain

### Cons
- ❌ 2-3 weeks of refactoring + testing
- ❌ More moving parts
- ❌ Slightly higher cost at scale
- ❌ Locked into cloud storage vendor

### Cost (at 100 users, 10GB files): $5-15/month
- Vercel: $0-20/mo (Pro if needed for team features)
- R2: $0-1/mo
- Upstash: $0/mo (free tier)
- Worker (Render): $7/mo

### Time: 2-3 weeks. Cost: $5-15/month.

---

## Option C: Hybrid (Vercel web + Render/Railway worker)

Keep Vercel for the web frontend/API (instant deploys, CDN), and add a
single worker service on Render/Railway for:
- GPay automation (Playwright + Chrome)
- File uploads (worker stores in R2, returns URL)
- Background jobs

The worker is small and cheap. The web stays serverless.

### Architecture

```
┌──────────────────────┐   API    ┌──────────────────────┐
│  Vercel (Next.js)    │ ──────► │  Render/Railway      │
│  - Web UI             │         │  - Playwright/Chrome  │
│  - Most APIs          │         │  - File processing    │
│  - Static content     │         │  - GPay refresh       │
└──────────────────────┘         └──────────────────────┘
        │                                  │
        │ Cloudflare R2                    │ Cloudflare R2
        ▼                                  ▼
   ┌──────────────────────────────────────────┐
   │   Cloudflare R2 (or S3) — file storage    │
   └──────────────────────────────────────────┘
        │
        │ Supabase (PostgreSQL)
        ▼
   ┌──────────────────────────────────────────┐
   │   Supabase (PostgreSQL + Auth)             │
   └──────────────────────────────────────────┘
```

### Steps

1. **Keep Vercel for the web app** (no changes)
2. **Deploy a worker on Render.com** (1 hour):
   - Create a new Render Web Service
   - Connect to the same GitHub repo
   - Build command: `npm install && npx playwright install --with-deps chromium`
   - Start command: `npm run worker:start`
   - Add new `npm run worker:start` script that runs `scripts/worker-server.ts`

3. **Move file uploads to R2** (1 day):
   - Same as Option B
   - The web app uploads via signed URL to R2 directly
   - No need for worker unless you need image processing

4. **Move GPay job state to a shared DB or Redis** (1 day):
   - Option: Use Supabase for both web and worker (shared DB)
   - Or: Use Upstash Redis

5. **Add a small `scripts/worker-server.ts`** (1-2 days):
   ```typescript
   // /api/cron/gpay-refresh — called by Vercel Cron
   // /api/cron/gpay-status — query job status
   // The web calls the worker for long-running ops
   ```

### Pros
- ✅ Most features work in 2-3 days
- ✅ Web stays on Vercel (fast deploys, CDN)
- ✅ Worker handles Playwright (where it's cheap to keep running)
- ✅ Files in R2 (cheap, persistent)
- ✅ Scales each layer independently

### Cons
- ❌ Two services to manage
- ❌ Need shared DB or Redis for state
- ❌ Slight latency for cross-service calls

### Time: 2-3 days. Cost: $5-10/month
- Vercel: $0 (Hobby) or $20/mo (Pro)
- Render worker: $0-7/mo (free tier, then $7/mo)
- R2: $0-1/mo
- Upstash: $0/mo (free tier)

---

## Comparison matrix

| Feature | Local | A. VPS | B. Full Cloud | C. Hybrid |
|---|---|---|---|---|
| Dashboard, expenses, budgets, goals | ✅ | ✅ | ✅ | ✅ |
| AI Chat (data-driven) | ✅ | ✅ | ✅ | ✅ |
| AI Chat (LLM) | ✅ | ✅ | ✅ | ✅ |
| Investments, taxes, insurance | ✅ | ✅ | ✅ | ✅ |
| Receipt upload | ✅ | ✅ | ⚠️ Need R2 refactor | ⚠️ Need R2 refactor |
| Tax document upload | ✅ | ✅ | ⚠️ Need R2 refactor | ⚠️ Need R2 refactor |
| File download | ✅ | ✅ | ⚠️ Need signed URLs | ⚠️ Need signed URLs |
| GPay auto-refresh | ✅ | ✅ | ⚠️ Need worker | ✅ Worker on Render |
| GPay job persistence | ✅ | ✅ | ⚠️ Need Redis/DB | ⚠️ Need Redis/DB |
| Rate limiting | ✅ | ✅ | ⚠️ Need Redis | ⚠️ Need Redis |
| Drive import error log | ✅ | ✅ | ⚠️ Need DB | ⚠️ Need DB |
| PDF generation | ✅ | ✅ | ✅ | ✅ |
| Admin dashboard | ✅ | ✅ | ✅ | ✅ |
| E2E tests | ✅ | ✅ | ✅ | ✅ |
| Auto-scaling | ❌ | ❌ | ✅ | ✅ |
| One-click deploy | ❌ | ❌ | ✅ | ⚠️ Two clicks |

**Legend**: ✅ Works out-of-the-box · ⚠️ Needs refactor · ❌ Not supported

---

## Recommendation

**Start with Option C (Hybrid)** because:
- 2-3 days of work gets you 95% parity
- Vercel web stays as-is (no deploy workflow change)
- Single small worker handles the Playwright / file storage gap
- Cost: $5-10/month total

**Then migrate to Option B (Full Cloud)** as you grow to thousands of
users, since the refactor cost is worth it for:
- Auto-scaling (no capacity planning)
- Multi-region (faster for global users)
- Zero infrastructure maintenance

**Use Option A (VPS only)** if:
- You want the absolute simplest path
- You're OK managing a single server
- You have <500 users

---

## Quick start: Option C (recommended)

```bash
# 1. Sign up for Cloudflare R2 (free 10GB)
#    Create bucket: mymoney-uploads
#    Get R2_ENDPOINT, R2_ACCESS_KEY, R2_SECRET_KEY

# 2. Sign up for Render.com (free tier)
#    Create new Web Service from GitHub repo
#    Root: scripts/worker-server.ts (we'll add this)
#    Build: npm install && npx playwright install --with-deps chromium
#    Start: node scripts/worker-server.js
#    Environment: All the same vars as Vercel

# 3. Add env vars to Vercel:
#    R2_ENDPOINT, R2_ACCESS_KEY, R2_SECRET_KEY, R2_BUCKET
#    WORKER_URL=https://mymoney-worker.onrender.com
#    WORKER_SECRET=<random-shared-secret>

# 4. Deploy web to Vercel as normal
# 5. Worker runs on Render, processes GPay + file ops
```

We can implement this over the next 1-2 PRs:
- PR 1: Add R2/S3 storage abstraction + refactor file uploads (2 days)
- PR 2: Add Redis abstraction + refactor GPay jobs + rate limit (2 days)
- PR 3: Add Render worker + move GPay automation there (1 day)

**Or do Option A (VPS) in 1 day** and add cloud features later as needed.
