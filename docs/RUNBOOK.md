# MyMoney Runbook

What to do when things go wrong in production. Update this whenever
you learn from an incident.

## Severity levels

| Sev | Impact | Response time | Example |
|---|---|---|---|
| **SEV1** | All users affected, data loss risk | 15 min | DB down, login broken, data leak |
| **SEV2** | Major feature broken, some users affected | 1 hour | Expenses can't save, dashboard errors |
| **SEV3** | Minor bug, workaround exists | 4 hours | Cosmetic issue, one page broken |
| **SEV4** | Nice-to-fix | Next sprint | UX improvement, typo |

## On-call basics

1. **Check status page** (Instatus) — is the issue already known?
2. **Check Sentry** — recent errors? Cluster of one route?
3. **Check Vercel logs** — search for the error message
4. **Check Supabase** — DB status, connection limits

---

## Common incidents

### 1. Site is down (SEV1)

**Symptoms**: Users get 500 / 502 / 504 errors, status page shows red.

**First 5 minutes**:
1. Check https://mymoney.com/api/health — does the service respond?
2. If 503: check `checks[].detail` for which subsystem is down
3. Check Vercel dashboard: https://vercel.com/dashboard — any recent failed deploys?
4. Check Supabase dashboard: https://supabase.com/dashboard — DB status

**If bad deploy** (most common):
```bash
# Roll back to last good deployment
vercel rollback
# Or in Vercel UI: Deployments → click previous good → "Promote to Production"
```

**If DB down**:
1. Check Supabase status page
2. Check connection pool: `SELECT count(*) FROM pg_stat_activity;`
3. Restart connection pooler if needed

**If nothing helps**:
1. Enable "Degraded Mode" in admin (disables AI features, sponsored cards)
2. Post status update
3. Escalate to on-call team

### 2. Login broken (SEV1)

**Symptoms**: Users can't sign in, all auth attempts fail.

**First 5 minutes**:
1. Check `/api/auth/status` endpoint
2. Check NextAuth logs: `vercel logs --filter "auth"`
3. Verify `AUTH_SECRET` env var is still set in Vercel
4. Verify database has `User` and `Account` tables (run `prisma db pull` to sync)

**Common causes**:
- `AUTH_SECRET` was rotated in env but not in active sessions → invalid JWT
- Google OAuth env vars missing → Google button broken but email login works
- Database migration dropped `Account` table → NextAuth can't find accounts

**Fix**:
```bash
# If AUTH_SECRET was changed, all existing sessions are invalidated
# Users just need to log in again. No action needed.

# If Account table missing, run:
vercel env pull
npx prisma db push  # or migrate deploy
```

### 3. AI chat returns generic responses (SEV3)

**Symptoms**: AI chat works but only returns the data-driven fallback
instead of LLM responses. Users see "Local data-driven response" notice.

**This is by design** — it means no LLM API key is configured. To fix:

1. Check `Settings → API Keys` page (admin only) to see if any keys are set
2. If not, add OpenAI / Anthropic / OpenCode key in admin settings
3. If keys are set but chat still uses local: check `OPENAI_API_KEY` env var fallback

**No data loss**. The local engine is intentionally used as a fallback.

### 4. GPay refresh fails (SEV3)

**Symptoms**: Users click "Refresh GPay" and get error.

**Self-hosted (VPS)**:
1. Check if Playwright + Chrome still installed: `npx playwright --version`
2. Check `.gpay-profile/` directory exists and is writable
3. Reinstall Chrome: `npx playwright install --with-deps chromium`
4. Reset profile: User → "Reset & Re-authenticate"

**Vercel**:
1. Users see "GPay automation not available" — by design
2. Use the "Manual export" instructions in the dialog

### 5. Database is slow (SEV2)

**Symptoms**: Pages take 5+ seconds to load, timeouts in Sentry.

**First 5 minutes**:
1. Check Supabase metrics: queries/second, connection count
2. Check Vercel function logs: long DB queries
3. Check if a new deploy introduced an N+1 query

**Fix N+1**:
1. Find the bad query: `SELECT * FROM pg_stat_statements ORDER BY mean_exec_time DESC LIMIT 20;`
2. Add an index or use `prisma.findMany({ include: { ... } })` instead of looping
3. Deploy fix

**Scale up**:
1. Upgrade Supabase plan (more connections)
2. Add connection pooler
3. Add read replica

### 6. Disk full on VPS (SEV1)

**Symptoms**: Vercel deploys fail, app crashes with ENOSPC.

**Fix**:
```bash
# Find large files
du -sh /opt/mymoney/* | sort -h | tail -20

# Clear old logs
find /opt/mymoney -name "*.log" -mtime +7 -delete
find /opt/mymoney/.next -type d -name "cache" -exec rm -rf {} +

# Clear GPay profiles if not needed
rm -rf /opt/mymoney/.gpay-profile

# Restart app
pm2 restart mymoney
```

**Prevention**: Add disk space alerts with UptimeRobot or Beszel.

### 7. Secret leaked (SEV1)

**Symptoms**: Sentry alert: "AUTH_SECRET exposed in commit" or similar.

**Immediate (within 1 hour)**:
1. Rotate the secret in Vercel env vars
2. Force-logout all users (invalidate JWTs) by setting new AUTH_SECRET
3. Check Vercel logs for unauthorized access attempts
4. Post security incident

**Follow-up**:
1. Check git history: `git log -p --all -S "secret_value"`
2. Use BFG Repo-Cleaner to remove from history if accidentally committed
3. File GitHub issue / add post-mortem
4. Update secret rotation policy if needed

---

## Deploy hotfix

```bash
# 1. Make the fix on a new branch
git checkout main
git pull
git checkout -b hotfix/fix-description
# ... make changes ...
git add -A
git commit -m "hotfix: brief description"

# 2. Push and create PR (skip E2E if needed)
git push origin hotfix/fix-description
gh pr create --base main --head hotfix/fix-description

# 3. Merge immediately if SEV1
gh pr merge --admin --merge

# 4. Vercel auto-deploys
# 5. Verify with smoke test
curl -f https://mymoney.com/api/health
curl -f https://mymoney.com/api/version
```

## Roll back a release

```bash
# Option A: Vercel UI (recommended)
# Deployments → click previous good deployment → "Promote to Production"

# Option B: CLI
vercel rollback
```

## Restore database from backup

```bash
# 1. Find latest backup
ls -la /backups/mymoney-*.sql.gz | tail -5

# 2. Download from S3 if backed up there
aws s3 cp s3://mymoney-backups/mymoney-20260902-1200.sql.gz /tmp/

# 3. Restore to staging first (always test)
gunzip -c /tmp/mymoney-20260902-1200.sql.gz | psql $STAGING_DATABASE_URL

# 4. Verify staging works
# 5. Restore to production (if staging looks good)
# IMPORTANT: take a fresh backup of current prod first!
pg_dump $PROD_DATABASE_URL | gzip > /backups/pre-restore-$(date +%s).sql.gz
gunzip -c /tmp/mymoney-20260902-1200.sql.gz | psql $PROD_DATABASE_URL
```

## Rotate secrets

**AUTH_SECRET** (every 90 days):
1. Generate new secret: `openssl rand -base64 32`
2. Set in Vercel env (don't change in code)
3. Deploy: this invalidates all existing sessions (users must re-login)
4. Notify users via in-app banner if rotating mid-session

**API keys** (per provider, every 6-12 months):
1. Generate new key in provider dashboard
2. Set in Vercel env (or per-user in /settings/api-keys)
3. Test the new key works
4. Revoke old key in provider dashboard

## Scale up (handle traffic spike)

**Vercel**:
- Auto-scales, no action needed
- If hitting limits, upgrade plan or add edge config

**Supabase**:
- Free: 500MB DB, 2GB egress — upgrade at 80% capacity
- Pro: 8GB DB, 50GB egress — scale up

**Redis (Upstash)**:
- Pay per request, no action needed
- If hitting rate limits, upgrade plan

---

## Post-incident review

After any SEV1 or SEV2, write a post-mortem:
1. What happened (timeline)
2. What was the impact
3. What was the root cause
4. What worked well
5. What to improve (action items)
6. Add action items to this runbook

Template: see `docs/POSTMORTEM_TEMPLATE.md` (TBD).
