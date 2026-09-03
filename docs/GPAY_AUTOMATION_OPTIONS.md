# GPay Automation — Production Options

The current `/api/refresh-gpay` endpoint uses Playwright + Chromium to
automate Google Takeout exports. This works on self-hosted environments
(local machine or VPS) but **cannot** run on Vercel serverless because:

1. **Bundle size**: Vercel serverless functions have a 250 MB unzipped
   deployment size limit. Playwright + Chromium is ~300 MB+ on its own.
2. **State**: Serverless functions are stateless. The GPay automation needs
   a persistent Chrome profile (`.gpay-profile/`) to maintain the logged-in
   Google session between runs. A fresh function invocation has no state.
3. **Display**: A headless browser running on the server can't show a
   window to the user for re-authentication.

This document covers the current "Google Drive connect" workflow plus four
production-ready options for the automated GPay refresh, ordered by effort
and cost.

---

## Current State: Manual + Drive Connect (Already Works)

The user-driven GPay import path is fully functional:

1. User signs in via Google in **Settings → Connect Google Account**
   (or via email + password + manual Google connection in Settings).
2. User opens **Expenses → Refresh GPay** dialog.
3. The dialog shows three paths:
   - **Retry** — re-runs the last operation.
   - **Re-authenticate** — opens a Google OAuth page in the user's browser
     (serverless-friendly), re-grants consent, returns to MyMoney.
   - **Scan Drive** — lists GPay Takeout ZIPs in the user's Drive and
     lets the user pick which one to import.
4. The user can also **manually export** from
   [takeout.google.com](https://takeout.google.com/) and upload the ZIP
   to **Expenses → Import → GPay Takeout** tab.

This is reliable and works on every host. The only friction is that the
user has to manually export every few months.

---

## Option 1: Google Drive Auto-Import (No Server Browser)

**Effort**: Low (1-2 days). **Cost**: Free. **Reliability**: High.

Use the user's existing Google Drive access (already granted via
Settings → Connect Google Account). Periodically scan the user's Drive
for new Google Takeout exports and auto-import them.

### How It Works

1. User has connected Google in Settings (OAuth scope includes
   `drive.readonly`).
2. App stores a long-lived OAuth `refresh_token` in the `Account` table.
3. A scheduled job (Vercel Cron, GitHub Actions, or external) calls
   `GET /api/drive/list?recent=1` every 1-7 days.
4. The endpoint:
   - Uses the user's stored refresh_token to get a fresh access_token.
   - Calls `https://www.googleapis.com/drive/v3/files?q=...` with a
     query for `name contains 'takeout' and modifiedTime > lastSync`.
   - Returns matching files.
5. For each new file, call `POST /api/drive/import` with the file ID.
6. The endpoint downloads, parses, and imports the GPay transactions.

### Steps to Implement

1. **Already done**: `/api/drive/list` and `/api/drive/import` endpoints
   exist in the codebase. They handle the download + parse + import.
2. **Add a "last synced" timestamp** to the user profile:
   ```prisma
   model User {
     // ...existing fields
     gpayLastDriveSyncAt DateTime?
   }
   ```
3. **Add a scheduled endpoint** `GET /api/cron/gpay-drive-sync` (protected
   by `CRON_SECRET` env var) that iterates active users, lists new
   Drive files since `gpayLastDriveSyncAt`, and imports them.
4. **Set up Vercel Cron** in `vercel.json`:
   ```json
   {
     "crons": [
       { "path": "/api/cron/gpay-drive-sync", "schedule": "0 6 * * *" }
     ]
   }
   ```
   (Runs daily at 6 AM UTC.)
5. **User flow**:
   - User connects Google once in Settings (already works).
   - User exports GPay data from takeout.google.com (manual, but they
     only need to do this once per export).
   - Their Drive auto-sync delivers the new ZIP to MyMoney's app folder
     in Drive (or any folder they choose).
   - App finds the file, downloads it, imports transactions, and
     optionally moves the file to a "processed" folder in Drive.

### Trade-offs

- ✅ No server browser needed.
- ✅ No infrastructure beyond Vercel.
- ❌ User must still manually export from takeout.google.com every few
  months (Google caps Takeout exports).
- ❌ Polling interval: typically daily, so up to 24h delay.

---

## Option 2: Self-Hosted Worker on a VPS

**Effort**: Medium (2-3 days). **Cost**: $5-20/month (Hetzner, DigitalOcean
droplet). **Reliability**: Very high.

Run the Playwright automation on a small VPS. The MyMoney web app stays
on Vercel; a separate worker process on the VPS handles GPay refresh.

### Architecture

```
┌──────────────┐    HTTPS    ┌─────────────────┐
│   Vercel     │ ◄─────────► │   VPS (Hetzner) │
│  MyMoney     │             │                 │
│   web app    │             │  GPay Worker    │
│              │             │  (Playwright)   │
└──────────────┘             └─────────────────┘
        │                            │
        │ Google OAuth               │ Google OAuth
        ▼                            ▼
┌──────────────────────────────────────────┐
│            Google Takeout API            │
└──────────────────────────────────────────┘
```

### Steps to Implement

1. **Create a worker app** in a new folder `gpay-worker/`:
   - `Dockerfile` based on `mcr.microsoft.com/playwright:v1.50.0-jammy`
   - `package.json` with `playwright` dependency
   - `worker.ts` that runs `refresh-gpay.mjs` periodically
   - `server.ts` (Express) that exposes:
     - `POST /trigger` — kick a refresh for a specific user
     - `GET /health` — readiness probe
     - `GET /status/:userId` — current job state
2. **Deploy to a VPS**:
   ```bash
   # On Hetzner CX22 (€4/month, 4GB RAM, 2 vCPU):
   docker build -t mymoney-gpay-worker .
   docker run -d --name gpay-worker \
     -p 3100:3100 \
       -e DATABASE_URL=postgresql://... \
       -e AUTH_SECRET=... \
     mymoney-gpay-worker
   ```
3. **Modify `/api/refresh-gpay` route**: detect `VERCEL` env var and
   proxy the request to the worker instead of spawning locally.
4. **Add a "Trigger" button** in the expenses dialog that calls the
   worker directly (so the user can manually trigger).
5. **Set up health monitoring** (UptimeRobot, Betterstack, or a simple
   GitHub Action that pings the worker daily).

### Trade-offs

- ✅ Fully automated — no user clicks.
- ✅ Uses existing `refresh-gpay.mjs` script unchanged.
- ✅ Persistent Chrome profile survives between runs.
- ❌ Extra infrastructure to maintain (OS updates, security patches).
- ❌ Need to handle worker being down (queue requests in the web app).
- ❌ Google might still detect headless browser and block.

---

## Option 3: Browserless.io (Managed Headless Browser)

**Effort**: Low (4-6 hours). **Cost**: $30-50/month (free tier: 6 hours
of browser time). **Reliability**: High.

Use a managed headless browser service instead of running your own.
Browserless provides a Chromium instance via WebSocket or HTTP that you
can drive from serverless code.

### Architecture

```
┌──────────────┐    HTTPS    ┌──────────────────┐
│   Vercel     │ ◄─────────► │  Browserless.io  │
│  MyMoney     │  WebSocket  │  (managed Chrome)│
└──────────────┘             └──────────────────┘
```

### Steps to Implement

1. **Sign up** at [browserless.io](https://www.browserless.io/) — get an
   API token.
2. **Add env var** `BROWSERLESS_TOKEN` in Vercel.
3. **Modify `refresh-gpay.mjs`** to use Browserless via CDP:
   ```typescript
   import { chromium } from "playwright"
   const browser = await chromium.connectOverCDP(
     `wss://chrome.browserless.io?token=${process.env.BROWSERLESS_TOKEN}`
   )
   ```
4. **Add `chrome-aws-lambda` chromium binary** to the Next.js build:
   ```bash
   npm install playwright-chromium chrome-aws-lambda
   ```
   (Or use Browserless's REST API directly without Playwright.)
5. **Add Vercel env var** `BROWSERLESS_TOKEN` with the API token.
6. **Increase Vercel function timeout** to 60s (max) for the refresh
   endpoint.
7. **Use Vercel Cron** to trigger the refresh daily.

### Trade-offs

- ✅ No infrastructure to maintain.
- ✅ Works on Vercel (the heavy lifting happens off-platform).
- ✅ Browserless handles browser detection / fingerprinting.
- ❌ Costs ~$30-50/month for active use.
- ❌ Adds a third-party dependency.
- ❌ Still subject to Google's anti-bot detection.

---

## Option 4: Decapitated Google OAuth (No Browser at All)

**Effort**: High (1-2 weeks). **Cost**: Free. **Reliability**: High.

Skip the browser automation entirely. Use Google OAuth with
`access_type=offline` to get a long-lived `refresh_token`, then call the
Google Takeout API directly to create and download exports. This is the
"headless" approach used by some automation services.

### How It Works

1. User connects Google in Settings (already works).
2. The OAuth flow requests these scopes:
   - `https://www.googleapis.com/auth/takeout` (or equivalent)
   - `https://www.googleapis.com/auth/drive.readonly`
3. App stores the long-lived `refresh_token`.
4. A scheduled job calls Google APIs directly (no browser):
   - `POST https://takeout.googleapis.com/v1/exports` to create a new
     export (if available via API — Google restricts this).
   - `GET https://www.googleapis.com/drive/v3/files?q=...` to find the
     resulting ZIP.
   - Download + parse + import.
5. **Important caveat**: Google Takeout is **mostly browser-based** and
   does not have a fully public programmatic API. The closest is the
   Google Cloud "Cloud Storage Transfer Service" which requires a GCS
   bucket. So in practice this option only works for limited use cases
   (e.g., Gmail exports have APIs; Takeout does not fully).

### Steps to Implement

1. **Verify Takeout API access** for your project (it may require Google
   Cloud partnership).
2. **Extend the OAuth scopes** in `src/lib/oauth.ts` and
   `src/app/api/auth/google/route.ts` to include any new Takeout-related
   scopes.
3. **Add a new route** `POST /api/admin/gpay-request-export` that calls
   the Takeout API (if available) for a specific user.
4. **Polling job** waits for the export to appear in Drive, then
   imports it (same as Option 1).

### Trade-offs

- ✅ No browser, no third-party service.
- ✅ Most reliable (uses official APIs).
- ❌ **Google Takeout does NOT have a full programmatic API** for
  arbitrary exports. This option is theoretical for most use cases.
- ❌ Requires Google Cloud partnership for some scopes.
- ❌ User must still initiate the export in their browser first.

---

## Recommendation: Combine Options 1 + 2

For MyMoney's target audience (~10-1000 users), the best combination is:

- **Default**: Option 1 (Drive auto-import) — Vercel Cron, no infra.
- **Power users**: Option 2 (self-hosted worker) — VPS with Playwright.
  Triggered by a "Premium" tier feature.

The "Drive auto-import" covers 90% of users without any infrastructure
cost. Users who want fully automatic refresh (no manual Takeout
export) can opt in to a Premium tier that triggers a self-hosted worker.

### Phased Rollout

1. **Phase 1 (Now)**: Current state works. Document the manual flow.
2. **Phase 2 (Next)**: Option 1 — Add Vercel Cron + Drive auto-import.
   No infrastructure cost. Covers most users.
3. **Phase 3 (Future)**: Option 2 — Deploy a worker on Hetzner. Offer
   to Pro/Premium users as a differentiator. Worth $5/month tier bump.
4. **Skip**: Options 3 and 4 — not worth the complexity for our scale.

---

## What I Recommend Doing First

Option 1 (Drive auto-import) is the clear winner:

- 1-2 days of work
- Free (uses existing Vercel Cron, 1 call/day = 30 invocations/month)
- Works for all existing users who have connected Google
- Reliable: uses Google's own Drive API
- No new infrastructure

The current `/api/drive/list` and `/api/drive/import` endpoints are
already implemented. We just need:

1. A new endpoint `/api/cron/gpay-drive-sync` that iterates users.
2. Vercel Cron config in `vercel.json`.
3. A "last synced" timestamp column.
4. A small UI in the expenses page showing "Last Drive sync: X hours ago".

Want me to implement Option 1 next?
