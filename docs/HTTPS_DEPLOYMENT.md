# HTTPS Deployment Guide

MyMoney is HTTPS-ready out of the box. The HSTS, X-Frame-Options, CSP, X-Content-Type-Options, and Referrer-Policy headers are already configured in `next.config.ts`, so you only need to obtain a certificate and decide **how** you want TLS to terminate.

This guide covers three deployment models, from simplest to most flexible.

---

## Quick decision matrix

| Model | Time to HTTPS | Best for | Certificate management |
|-------|---------------|----------|------------------------|
| **A. Reverse proxy** (Caddy / nginx / Cloudflare) | ~30 min | Self-hosted VPS, on-prem, Docker | Automatic (Caddy) or Let's Encrypt + certbot |
| **B. Native HTTPS in Next.js** (custom server.js) | ~2 hours | Bare Node deployment without a proxy | Manual — you bring your own certs |
| **C. Platform TLS** (Vercel / Railway / Render / Fly.io / Cloud Run) | ~10 min | Cloud deployments, fastest path | Fully automatic |

**Recommendation**: If unsure, go with **Model C** (a platform). It provisions TLS for you, auto-renews, and you ship HTTPS in under 10 minutes. MyMoney works with zero code changes on all major platforms.

---

## What's already done in the code

You do **not** need to write any HTTPS code. These are already in place:

1. **Security headers** (`next.config.ts`):
   - `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload` (HSTS for 2 years)
   - `X-Frame-Options: DENY` (clickjacking protection)
   - `X-Content-Type-Options: nosniff` (MIME sniffing protection)
   - `Referrer-Policy: strict-origin-when-cross-origin`
   - `Content-Security-Policy` (CSP) — allows Razorpay, Google OAuth, and Expo
   - `Permissions-Policy: camera=(), microphone=(), geolocation=()`

2. **JWT session strategy** (`src/lib/auth.ts`): the app uses JWT (not database session cookies), so there is **no `__Secure-` cookie prefix to worry about**. The session is in a stateless signed token.

3. **Env template** (`.env.template`): `NEXTAUTH_URL`, `NEXT_PUBLIC_BASE_URL`, and `NEXT_PUBLIC_APP_URL` are documented and ready to flip from `http://` to `https://` for production.

---

## Model A — Reverse proxy (recommended for self-hosted)

A reverse proxy terminates TLS and forwards plain HTTP to your Next.js server. MyMoney needs no code changes — just configure the proxy.

### A1. Caddy (easiest, auto-renews Let's Encrypt)

Install Caddy on your server. Then drop a `Caddyfile` next to your app:

```caddy
# /etc/caddy/Caddyfile  (or wherever you prefer)
mymoney.example.com {
    reverse_proxy localhost:3005
}
```

That's it. Caddy automatically:
- Obtains a Let's Encrypt certificate
- Renews it before expiry
- Forces HTTP → HTTPS
- Sets HSTS (in addition to what Next.js sets)

Restart Caddy: `sudo systemctl restart caddy`. Done.

### A2. nginx + certbot (most common on Ubuntu/Debian)

```bash
sudo apt install -y nginx certbot python3-certbot-nginx
```

Create `/etc/nginx/sites-available/mymoney`:

```nginx
server {
    listen 80;
    server_name mymoney.example.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name mymoney.example.com;

    ssl_certificate /etc/letsencrypt/live/mymoney.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/mymoney.example.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;

    # Optional: gzip responses at the proxy layer (saves bandwidth)
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/javascript application/xml;
    gzip_min_length 1024;

    location / {
        proxy_pass http://localhost:3005;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/mymoney /etc/nginx/sites-enabled/
sudo certbot --nginx -d mymoney.example.com
sudo nginx -t && sudo systemctl reload nginx
```

certbot edits the file in place to add the certificate paths and the HTTP→HTTPS redirect.

### A3. Cloudflare (zero infra, free tier works)

If you point your domain's nameservers to Cloudflare:
1. Add your origin server IP in **DNS** as an `A` record (proxy enabled)
2. Go to **SSL/TLS → Overview** → set mode to **Full (Strict)**
3. Optional: **SSL/TLS → Edge Certificates → Always Use HTTPS** → ON

Cloudflare handles TLS termination at the edge. Your Next.js server runs plain HTTP on localhost:3005.

### What to change in MyMoney `.env` (all Model A variants)

```env
NEXTAUTH_URL="https://mymoney.example.com"
NEXT_PUBLIC_BASE_URL="https://mymoney.example.com"
NEXT_PUBLIC_APP_URL="https://mymoney.example.com"
DATABASE_URL="postgresql://user:pass@localhost:5432/mymoney?sslmode=require"  # if Postgres is on the same host
```

Restart Next.js. Done.

---

## Model B — Native HTTPS in Next.js (no proxy)

Use this only if you cannot run a reverse proxy. Slightly more complex; you manage certs yourself.

### B1. Obtain a certificate

Easiest path: use **Let's Encrypt via certbot** in webroot or standalone mode.

```bash
sudo certbot certonly --standalone -d mymoney.example.com
```

This creates:
- `/etc/letsencrypt/live/mymoney.example.com/fullchain.pem`
- `/etc/letsencrypt/live/mymoney.example.com/privkey.pem`

Add a cron job to renew:
```bash
0 3 * * * certbot renew --quiet --post-hook "systemctl restart mymoney"
```

### B2. Create a custom `server.js`

Create `server.js` at the project root:

```js
const { createServer } = require("https");
const { parse } = require("url");
const next = require("next");
const fs = require("fs");

const dev = process.env.NODE_ENV !== "production";
const port = Number(process.env.HTTPS_PORT) || 443;
const hostname = process.env.HOSTNAME || "0.0.0.0";

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  createServer(
    {
      key: fs.readFileSync(process.env.SSL_KEY_PATH),
      cert: fs.readFileSync(process.env.SSL_CERT_PATH),
    },
    (req, res) => handle(req, res, parse(req.url, true))
  ).listen(port, hostname, (err) => {
    if (err) throw err;
    console.log(`> MyMoney ready on https://${hostname}:${port}`);
  });
});
```

### B3. Update `package.json`

Change the start script from `next start` to `node server.js`:

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "NODE_ENV=production node server.js"
  }
}
```

### B4. Add the cert paths to `.env`

```env
SSL_KEY_PATH=/etc/letsencrypt/live/mymoney.example.com/privkey.pem
SSL_CERT_PATH=/etc/letsencrypt/live/mymoney.example.com/fullchain.pem
HTTPS_PORT=443
NEXTAUTH_URL="https://mymoney.example.com"
NEXT_PUBLIC_BASE_URL="https://mymoney.example.com"
NEXT_PUBLIC_APP_URL="https://mymoney.example.com"
```

### B5. Add the cert files to `.gitignore`

```gitignore
*.pem
.env.local
```

### B6. (Optional) Add a process manager

For production, run with `pm2`:

```bash
pm2 start server.js --name mymoney
pm2 save
pm2 startup
```

---

## Model C — Platform TLS (fastest, zero infra)

This is the **recommended** path if you're not sure about deployment. Every major platform provisions TLS for you.

### C1. Vercel

```bash
npm i -g vercel
vercel
```

In the Vercel dashboard, set environment variables:
- `NEXTAUTH_URL=https://mymoney.vercel.app` (or your custom domain)
- `NEXT_PUBLIC_BASE_URL=https://mymoney.vercel.app`
- `NEXT_PUBLIC_APP_URL=https://mymoney.vercel.app`
- `DATABASE_URL=<your managed Postgres URL>` (use Neon, Supabase, or Vercel Postgres)
- `REDIS_URL=<your managed Redis URL>` (use Upstash)

Vercel auto-provisions a `*.vercel.app` TLS certificate. To use your own domain, add it in **Settings → Domains** and Vercel handles Let's Encrypt provisioning.

### C2. Railway

```bash
# Install Railway CLI
npm i -g @railway/cli
railway login
railway init
railway up
```

In the Railway dashboard:
- Add a Postgres plugin
- Add a Redis plugin
- Set env vars (same as Vercel)
- Add a custom domain in **Settings → Networking**

Railway auto-provisions TLS for custom domains via Caddy internally.

### C3. Render

Connect your GitHub repo at render.com → New Web Service → select repo.
- Build command: `npm run build`
- Start command: `npm start`
- Add a managed Postgres + Redis from the Render marketplace
- Set env vars
- Add custom domain in **Settings → Custom Domains** — Render provisions Let's Encrypt automatically

### C4. Fly.io

```bash
fly launch
fly postgres create
fly redis create
fly secrets set NEXTAUTH_URL=https://mymoney.fly.dev DATABASE_URL=... REDIS_URL=...
fly deploy
```

Fly auto-issues Let's Encrypt certificates.

### C5. Google Cloud Run

```bash
gcloud run deploy mymoney \
  --source . \
  --platform managed \
  --region asia-south1 \
  --set-env-vars NEXTAUTH_URL=https://mymoney.run.app
```

Cloud Run provisions a managed TLS certificate via Google Certificate Authority automatically when you map a custom domain.

---

## What to update in your app for HTTPS (all models)

After flipping to HTTPS, do these once:

### 1. Google OAuth redirect URI

In [Google Cloud Console](https://console.cloud.google.com/apis/credentials):
- Go to **APIs & Services → Credentials**
- Edit your OAuth 2.0 Client
- Add to **Authorized redirect URIs**:
  - `https://mymoney.example.com/api/auth/callback/google`
- Remove any `http://` URIs

### 2. Database SSL (only if Postgres is on the same host)

```env
DATABASE_URL="postgresql://user:pass@localhost:5432/mymoney?sslmode=require"
```

If you use a managed Postgres (Neon, Supabase, RDS), the connection URL already includes `?sslmode=require`. No change needed.

### 3. Razorpay webhook (if you use Razorpay)

In Razorpay Dashboard → Settings → Webhooks:
- Update your webhook URL to `https://mymoney.example.com/api/razorpay/webhook`
- Re-enter the webhook secret in `.env`

### 4. Mobile app base URL

`mobile/app/(tabs)/index.tsx` and other mobile files reference the API base URL. Update:

```ts
// mobile/app/api/client.ts  (or wherever the base URL is set)
const API_BASE = "https://mymoney.example.com";
```

Or read it from env at build time.

### 5. Test your deployment

After flipping to HTTPS, verify:

```bash
# 1. Redirect from HTTP to HTTPS works
curl -I http://mymoney.example.com
# Expect: 301/308 to https://...

# 2. TLS certificate is valid
curl -vI https://mymoney.example.com 2>&1 | grep -E "subject:|expire date:"

# 3. HSTS header is set
curl -I https://mymoney.example.com | grep -i "strict-transport"

# 4. Google OAuth works (sign in with Google, verify callback)

# 5. Mobile app can reach the API
# (open the app, sign in, verify data loads)
```

---

## HSTS preload (optional, advanced)

If you want your domain on the [HSTS Preload List](https://hstspreload.org/) (browsers will refuse to connect over HTTP for your domain, even on first visit):

1. Verify HSTS header includes `preload`: already set in `next.config.ts` ✅
2. Submit at https://hstspreload.org/
3. Wait for inclusion (a few weeks)

The current header is:
```
Strict-Transport-Security: max-age=63072000; includeSubDomains; preload
```

This is the correct format. You're preload-ready.

---

## Troubleshooting

### "Mixed content" warnings in the browser

Means your page is loaded over HTTPS but is requesting resources (images, scripts) over HTTP. Check:
- All `src=` and `href=` in your HTML use `https://` or are relative
- Your CDN / image host supports HTTPS
- Your `<base>` tag (if any) uses `https://`

### NextAuth callback URL mismatch

If Google OAuth fails with `redirect_uri_mismatch`:
- The redirect URI in Google Cloud Console must match `NEXTAUTH_URL` exactly
- Trailing slashes matter: `https://example.com/` ≠ `https://example.com`
- Update `NEXTAUTH_URL` in `.env` and redeploy

### Cookies not persisting after HTTPS switch

If you migrated from `__Secure-next-auth.session-token` (old name) to a new cookie name, users will be signed out. This is expected. Either:
- Keep the same cookie name across HTTP and HTTPS
- Or clear cookies on the user's next visit (handled by the browser)

For JWT strategy (which MyMoney uses), this is rare — the cookie is signed but not encrypted in the cookie name.

### "This site's security certificate is not trusted"

Your cert chain is incomplete. With Let's Encrypt via Caddy/certbot, this is usually automatic. If you used a self-signed cert for testing, browsers will reject it. For production, always use a CA-signed cert (Let's Encrypt is free).

---

## Summary

| What | Effort | Where |
|------|--------|-------|
| Security headers | ✅ Done | `next.config.ts` |
| JWT session strategy | ✅ Done | `src/lib/auth.ts` |
| HTTPS env template | ✅ Done | `.env.template` |
| Deployment guide | ✅ Done | this file |
| TLS termination | ❌ You do this | Model A / B / C above |
| Cert provisioning | ❌ You do this | Caddy / certbot / platform |
| Update Google OAuth | ❌ You do this | Google Cloud Console |
| Update Razorpay webhook | ❌ If you use it | Razorpay Dashboard |

**MyMoney is HTTPS-ready.** Pick a model, set the env vars, and you're live in 30 minutes to 2 hours depending on the model.
