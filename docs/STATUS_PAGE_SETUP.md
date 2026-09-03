# Status Page Setup

MyMoney exposes three endpoints that work with any uptime monitoring
service. Pick one of the options below and point it at `/api/health`.

## Endpoints

| Endpoint | Purpose | Returns |
|---|---|---|
| `GET /api/health` | Liveness + composite health | 200 if all OK, 503 if down |
| `GET /api/health/ready` | Readiness probe (k8s) | 200 if DB reachable |
| `GET /api/status` | Uptime-monitor compatible | 200 with JSON status |

**Authentication**: All endpoints are public (anyone can poll them).
They don't expose sensitive data — only service names and latencies.

**Rate limit**: Not rate-limited (uptime monitors need to poll frequently).
If abused, add basic rate limiting later.

---

## Option 1: UptimeRobot (free, easiest)

1. Sign up at https://uptimerobot.com (free tier = 50 monitors)
2. Click "Add New Monitor"
3. Type: HTTP(s)
4. Friendly name: "MyMoney Production"
5. URL: `https://mymoney.com/api/health`
6. Monitoring interval: 5 minutes
7. Timeout: 30 seconds
8. Alert contacts: your email/Slack
9. Save

**Result**: Email/Slack alert when the endpoint returns 503.

---

## Option 2: Better Uptime (free, better UI)

1. Sign up at https://betteruptime.com (free tier = 10 monitors)
2. Click "Add monitor"
3. Type: HTTP
4. URL: `https://mymoney.com/api/health`
5. Method: GET
6. Expected status code: 200
7. Check frequency: 1 minute
8. Add alert policy (Slack, email, SMS, PagerDuty)
9. Save

**Result**: Public status page (auto-generated), incident tracking, post-mortems.

---

## Option 3: Instatus (free, public status page)

1. Sign up at https://instatus.com (free tier = 1 public status page)
2. Create a new status page
3. Add components:
   - "API" → URL: `https://mymoney.com/api/health`
   - "Authentication" → URL: `https://mymoney.com/api/auth/status`
   - "Database" → URL: `https://mymoney.com/api/health/ready`
4. Publish the page → get public URL like `mymoney.instatus.com`
5. Add the URL to your site footer: `Status: operational`

**Result**: Customer-facing status page, incident scheduling, post-mortems.

---

## Option 4: Statuspage (free for open source / paid)

By Atlassian. Most popular for enterprise products. Paid plans from
$29/mo. Comes with:
- Custom domain (status.mymoney.com)
- Component-level status
- Incident management
- Subscriber notifications (email/SMS)
- Postmortems

Setup: https://manage.statuspage.io

---

## Recommended setup

| Stage | Tool |
|---|---|
| Now (1 user) | UptimeRobot free |
| 100 users | Better Uptime free + status page |
| 1,000 users | Instatus or Statuspage |
| 10,000+ users | Statuspage (Pro) + PagerDuty |

Add a "Status" link to your site footer once you have one set up.
Customers expect it.
