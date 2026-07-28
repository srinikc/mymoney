# GPay Takeout Automation Plan — MyMoney

> **Goal**: One-click trigger to get latest GPay transactions from takeout.google.com into mymoney.

## Current Workflow (Manual)

```
1. [Manual] Go to takeout.google.com
2. [Manual] Deselect all → select only Google Pay
3. [Manual] Click "Create export"
4. [Auto]   Google processes export (takes sec/min for GPay-only)
5. [Manual] Download the MyActivity.html file
6. [Manual] Upload/place file in Google Drive
7. [Auto]   mymoney reads from Drive and parses via gpay-parser.ts
```

## Target Workflow (One Click)

```
1. [Click]  User clicks "Refresh GPay" button in mymoney
2. [Auto]   Playwright script (headless) launches
3. [Auto]   Logs into Google (stored session)
4. [Auto]   Navigates to takeout.google.com
5. [Auto]   Deselects all → selects only Google Pay
6. [Auto]   Clicks "Create export"
7. [Auto]   Polls until export is ready (retry every 30s)
8. [Auto]   Downloads MyActivity.html
9. [Auto]   Uploads to Google Drive via Drive API
10. [Auto]  mymoney detects new file in Drive and imports
```

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      MyMoney (Next.js)                           │
│                                                                  │
│  /api/refresh-gpay [POST]                                        │
│       │                                                          │
│       ├──→ 1. Spawns Playwright script (child process)           │
│       │                                                          │
│       ├──→ 2. Script logs into takeout.google.com                │
│       │      (uses saved cookie/session)                         │
│       │                                                          │
│       ├──→ 3. Creates GPay-only export                           │
│       │                                                          │
│       ├──→ 4. Polls for completion → downloads MyActivity.html   │
│       │                                                          │
│       ├──→ 5. Uploads to Drive via Google Drive API              │
│       │                                                          │
│       └──→ 6. Returns { success: true, fileName, size }          │
│                                                                  │
│  Google Drive (already integrated)                               │
│       │                                                          │
│       └──→ mymoney detects file → parses → imports               │
└─────────────────────────────────────────────────────────────────┘
```

## Why This Works

- **GPay-only export is fast** — Google Takeout for just Google Pay data takes seconds to minutes, not hours (unlike full Takeout with all services)
- **Playwright is already installed** — `@playwright/test` is in mymoney's devDependencies
- **Google Drive API is already integrated** — mymoney already has Google OAuth + Drive listing/import
- **Existing parser ready** — `src/shared/gpay-parser.ts` already handles `MyActivity.html`

## Key Challenges & Solutions

### Challenge 1: Google Login (2FA)
- **Solution**: Use saved Chromium user data directory (persistent profile)
- Playwright launches with `--user-data-dir=./gpay-profile` — login once manually, cookie persists
- No need to handle 2FA on subsequent runs
- Fallback: Prompt user to re-authenticate if session expires

### Challenge 2: Export May Take Minutes
- **Solution**: 
  - Playwright script runs asynchronously (background job)
  - API immediately returns 202 Accepted with a job ID
  - Frontend polls `/api/refresh-gpay/status/:jobId` for progress
  - On completion, triggers Drive re-scan

### Challenge 3: Headless Browser on Server
- **Solution**: Playwright can run headless (`chromium.launch({ headless: true })`)
- Chromium binary bundled with Playwright install
- Works locally (for now), can move to VPS later

### Challenge 4: File Naming / Dedup
- **Solution**: Check Drive for existing files before upload
- Name with date: `gpay-takeout-YYYY-MM-DD.html`
- Skip if today's file already exists

## Playwright Script Design

**File**: `scripts/refresh-gpay.mjs` (ESM, runs via `node scripts/refresh-gpay.mjs`)

```typescript
// Pseudocode:
async function refreshGPay() {
  const browser = await chromium.launch({
    headless: true,
    userDataDir: './.gpay-profile',  // persistent session
  })
  const page = await browser.newPage()

  // 1. Navigate to takeout.google.com
  await page.goto('https://takeout.google.com')

  // 2. Check if logged in — if redirected to login, abort
  if (page.url().includes('accounts.google.com')) {
    console.error('Session expired — user must re-login')
    // Notify user: open browser manually
    return { status: 'auth_required' }
  }

  // 3. Deselect all services
  await page.click('[data-tooltip="Deselect all"]')

  // 4. Select only Google Pay
  await page.click('text=Google Pay')

  // 5. Scroll down, click Next step
  await page.click('button:has-text("Next step")')

  // 6. Choose delivery method: "Add to Drive"
  await page.click('text=Add to Drive')
  await page.click('button:has-text("Create export")')

  // 7. Poll for completion (usually 30s-5min for GPay-only)
  let done = false
  while (!done) {
    await page.waitForTimeout(30000)  // 30s
    await page.reload()
    done = await page.$('text=Your export is complete')
  }

  // 8. Download the file
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.click('text=Download'),
  ])
  await download.saveAs(`./data/gpay-takeout-${new Date().toISOString().slice(0,10)}.html`)

  await browser.close()
  return { status: 'success', path: download.path() }
}
```

### Selector Risks
Google's UI changes frequently. Selectors should be maintained:
- Use data-testid or aria labels where possible
- Maintain a selectors config map for easy updates
- The script logs screenshots on failure for debugging

## Integration with MyMoney

### 1. API Route: `POST /api/refresh-gpay`

```typescript
// src/app/api/refresh-gpay/route.ts
export async function POST() {
  // Spawn Playwright as child process
  const jobId = crypto.randomUUID()
  jobs.set(jobId, { status: 'running', startedAt: new Date() })

  spawn('node', ['scripts/refresh-gpay.mjs'], {
    env: { ...process.env, JOB_ID: jobId },
  }).on('exit', (code) => {
    jobs.set(jobId, {
      status: code === 0 ? 'completed' : 'failed',
      completedAt: new Date(),
    })
  })

  return Response.json({ jobId }, { status: 202 })
}
```

### 2. Status Polling: `GET /api/refresh-gpay/status/:jobId`

```typescript
export async function GET(request, { params }) {
  const job = jobs.get(params.jobId)
  if (!job) return Response.json({ error: 'not_found' }, { status: 404 })
  return Response.json(job)
}
```

### 3. Frontend Button

```tsx
// Add to settings page or dashboard header
<Button
  onClick={handleRefreshGPay}
  disabled={loading}
  data-testid="refresh-gpay-btn"
>
  {loading ? <Loader2 className="animate-spin" /> : <RefreshCw />}
  Refresh GPay
</Button>
```

## UI States

| State | What User Sees |
|-------|----------------|
| **Idle** | "Refresh GPay" button |
| **Starting** | Button shows spinner + "Starting browser..." toast |
| **Running** | Progress bar: "Logging in...", "Creating export...", "Waiting for export...", "Downloading..." |
| **Auth Required** | Popup: "Please log into Google in the browser window that opened. Then click Retry." |
| **Success** | Toast: "GPay transactions refreshed! Importing from Drive..." |
| **Failed** | Toast: "Failed. See logs. [Retry]" |

## Implementation Order

| Step | What | Effort | Dependencies |
|------|------|--------|-------------|
| 1 | Install Playwright `chromium` browser (if not already) | 2 min | None |
| 2 | Create initial login script (non-headless, one-time) | 30 min | Step 1 |
| 3 | Build `scripts/refresh-gpay.mjs` (headless with saved session) | 2 hrs | Step 2 |
| 4 | Create `/api/refresh-gpay` route with job system | 1 hr | Step 3 |
| 5 | Add frontend button + progress polling | 2 hrs | Step 4 |
| 6 | Wire to Drive import (auto-scan after download) | 1 hr | Step 5 |
| 7 | Error handling, retry, fallback to manual | 2 hrs | Step 6 |
| 8 | Testing and hardening | 3 hrs | Step 7 |

**Total: ~12 hours**

## Alternative: Simpler Approach

If Playwright on headless proves flaky (due to Google UI changes), fallback to:

### "Remind Me" Approach
- mymoney sends a notification: "Time to refresh GPay — click here to go to takeout.google.com"
- User goes there, downloads, saves to Drive manually (current flow)
- Already works, just adds a reminder

### Drive Poll Approach
- Since you already have a scheduled monthly export landing in Drive
- Add a periodic Drive scan: check for new `MyActivity.html` files
- Only import if newer than last import
- This removes the "upload to Drive" manual step but not the "go to takeout" step

## File to Create
- `scripts/refresh-gpay.mjs` — Playwright automation script
- `src/app/api/refresh-gpay/route.ts` — API endpoint
- `src/app/api/refresh-gpay/status/[jobId]/route.ts` — Status polling

## When to Build
- After any higher-priority mymoney features are done
- Or immediately if you find manual Takeout refreshing annoying enough
  
---

*This document is consolidated in `PRODUCT.md` — refer there for the unified product plan.*

> **Note**: This plan is based on the current Google Takeout UI (2026). If Google changes their UI, the selectors in `refresh-gpay.mjs` will need updating. The script should take screenshots on failure for easy debugging.
