# MyMoney Production Disaster Recovery (DR) Strategy

> **Current state:** Basic backup system (DB + files + config → R2 + Supabase Storage every 6 hours, admin dashboard at `/admin/backup`).
>
> **This document:** Future-state DR for when we have paying customers, 99.9%+ uptime SLA, and enterprise requirements.

---

## 1. Current Backup System (Phase 1 — Implemented)

| Component | Detail |
|---|---|
| **DB backup** | Prisma-based JSON export (all tables → compressed) |
| **File backup** | Supabase Storage (receipts, tax docs) archived as ZIP (persistent, survives deploys) |
| **Config backup** | Encrypted env vars (AES-256-GCM) |
| **Schema backup** | `schema.prisma` + all migration SQL files |
| **Storage 1** | Cloudflare R2 (10 GB free, no egress) |
| **Storage 2** | Supabase Storage (1 GB free, redundancy) |
| **Schedule** | Every 6 hours (4× per day) |
| **Retention** | Last 30 days |
| **Admin UI** | `/admin/backup` page with manual backup/restore, storage usage, history |
| **RTO** (Restore Time Objective) | 30 min (single admin click) |
| **RPO** (Recovery Point Objective) | 6 hours (max data loss) |

---

## 2. Future Tiers (when we have customers)

### Phase 2: Enhanced Reliability (50-1000 users)

| Improvement | Why | Cost |
|---|---|---|
| **Supabase Pro** | 30-day PITR (point-in-time recovery) | $25/mo |
| **R2 paid plan** | Higher storage limits | Pay-per-use |
| **Hourly backups** (instead of 6h) | Reduce RPO to 1h | Minimal |
| **Backup verification** | Auto-restore a random backup to test DB every week | Free |
| **Backup encryption at rest** | R2 already has this; verify Supabase | Free |
| **Restore drill** | Quarterly fire drill — restore latest backup to staging | Engineering time |
| **Status page** | Public uptime page (e.g., statuspage.io) | Free / $29/mo |
| **Error tracking** (Sentry) | Catch errors before users notice | Free tier |
| **Uptime monitoring** (UptimeRobot) | Alert if app is down | Free tier |

**RTO target:** 15 min · **RPO target:** 1 hour

### Phase 3: High Availability (1000+ users)

| Improvement | Why | Cost |
|---|---|---|
| **Read replicas** (Supabase) | Read traffic off primary DB | Included in Pro |
| **Multi-region deployment** (Vercel) | Serve from US + EU + APAC | Vercel Pro $20/mo per member |
| **Vercel Edge Middleware** | Cache static assets globally | Included |
| **Connection pooling** (PgBouncer / Supabase Pooler) | Handle burst traffic | Included in Supabase |
| **Database failover** (Supabase) | Auto-promote replica if primary fails | Included in Pro |
| **Redis (Upstash) multi-region** | Cache close to users | $0.20 per 100K requests |
| **CDN for uploads** (Cloudflare) | Fast file delivery worldwide | Free tier |
| **Geographic backup** (R2 multi-region) | Backup to different continent | R2 replication |
| **Health checks** + auto-rollback | Detect bad deploys, auto-revert | Engineering time |
| **Canary deployments** | Test new code on 1% of traffic first | Vercel Pro feature |

**RTO target:** 5 min · **RPO target:** 15 min

### Phase 4: Enterprise / Regulated (10K+ users)

| Improvement | Why | Cost |
|---|---|---|
| **Multi-region active-active** | Full HA, no single point of failure | $$$ |
| **Hot standby** (different cloud) | Survive entire cloud provider outage | $$$ |
| **Backup to multiple cloud providers** | R2 + S3 + GCS | $ |
| **GDPR data residency** | Pin data to specific region | $ |
| **SOC 2 Type II compliance** | Enterprise sales requirement | $30K+ |
| **Backup immutability** (WORM storage) | Can't be deleted by attacker | $ |
| **Backup air-gapped** (offline copy) | Ransomware protection | $ |
| **DR runbook tested monthly** | Regular fire drills | Engineering time |
| **Incident response team** | 24/7 on-call | $ |
| **Customer-facing DR status** | Transparent communication | $ |

**RTO target:** <1 min · **RPO target:** <5 min

---

## 3. Backup Schedule (Future)

| Frequency | What | Why |
|---|---|---|
| Every 1 hour | DB only (incremental) | Low RPO |
| Every 6 hours | Full backup (DB + files + config) | Current implementation |
| Daily | Full backup + offsite copy to 2nd cloud | Redundancy |
| Weekly | Archive to cold storage (Glacier / R2 IA) | Long-term retention |
| Monthly | Compliance archive (7-year retention) | Tax/audit requirements |

---

## 4. File Storage Strategy (Current and Planned)

**Current state (local dev and early production):**  
File uploads (receipts, tax docs) are stored in the local filesystem (`public/uploads/` and `data/uploads/`). These are included in backups via archiving the directories. On Vercel, the local filesystem is ephemeral — files are lost on every redeploy.

**Planned improvement (for production persistence):**  
Move all uploads to **Supabase Storage** (persistent object storage). This ensures files survive deploys and are naturally included in backups (since backups archive the Supabase Storage contents via the Supabase Storage backup module).

| Action | Effort | Owner |
|---|---|---|
| Create `receipts` and `tax-docs` buckets in Supabase Storage | 30 min | TBD |
| Migrate existing `public/uploads/` → Supabase Storage | 2 hrs | TBD |
| Update `src/app/api/receipt/upload/route.ts` to upload to Supabase | 1 hr | TBD |
| Update `src/app/api/tax/documents/route.ts` to upload to Supabase | 1 hr | TBD |
| Update file-serving routes to use Supabase signed URLs | 2 hrs | TBD |
| Test upload + download flow | 2 hrs | TBD |
| **Total** | **~1 day** | |

After migration, backups will archive Supabase Storage contents automatically, ensuring file persistence across deploys.

**Backup inclusion:** Regardless of storage location (local filesystem or Supabase Storage), the backup system archives the appropriate directory (`public/uploads/` or the Supabase Storage bucket contents) and includes that archive in the backup ZIP uploaded to selected destinations (R2, Supabase Storage, local, Google Drive).

---

## 5. Monitoring & Alerting (Future)

| Tool | Purpose | Cost |
|---|---|---|
| **Sentry** | Error tracking, source maps | Free tier |
| **UptimeRobot** | Uptime monitoring (HTTP ping) | Free (50 monitors) |
| **Vercel Analytics** | Web Vitals, traffic | Included |
| **Supabase Logs** | DB query performance | Included |
| **Cloudflare Analytics** | R2 usage, cache hit rate | Included |
| **PagerDuty / Opsgenie** | Alerting (when on-call team exists) | $ |

Alerts to set up:
- Backup failed (no success in 6h+)
- Storage >80% full
- DB connection pool exhausted
- Error rate >1%
- Response time p95 >2s
- Uptime check fails from any region

---

## 6. Load Balancing (Future)

When traffic exceeds single-server capacity:

| Layer | Solution | Cost |
|---|---|---|
| **App tier** | Vercel auto-scales serverless | Included |
| **DB tier** | Supabase read replicas + connection pooler | Included in Pro |
| **Cache tier** | Upstash Redis (multi-region) | $0.20 per 100K req |
| **File tier** | Cloudflare CDN in front of Supabase Storage | Free |
| **DNS** | Cloudflare Load Balancer (geo-routing) | $5/mo |

**Auto-scaling targets:**
- App: 100 → 10,000 concurrent users (Vercel handles)
- DB: 100 → 10,000 QPS (Supabase Pro + replicas)
- Cache: 99% hit rate at 100K req/min

---

## 7. Compliance & Audit (Future)

When we need SOC 2 / GDPR / HIPAA:

| Requirement | How |
|---|---|
| **Data encryption at rest** | Supabase + R2 (both default) |
| **Data encryption in transit** | TLS 1.3 everywhere (Vercel default) |
| **Audit logs** | All admin actions logged in `auditLog` table |
| **Backup retention** | 7 years for tax data (IRS requirement) |
| **Right to be forgotten** | GDPR delete user + all data cascade |
| **Data export** | User can request full data export (already built) |
| **Penetration testing** | Annual third-party pen test |
| **SOC 2 Type II** | 12-month audit window |

---

## 8. Incident Response Plan (Future)

When something breaks:

| Severity | Response | Example |
|---|---|---|
| **SEV1** (all users down) | Page on-call, status page update in 5 min, war room | DB down, auth broken |
| **SEV2** (feature broken) | Status page update in 30 min, fix in 4 hrs | Insights broken, imports failing |
| **SEV3** (single user) | Ticket, fix in 24 hrs | Specific user data issue |
| **SEV4** (cosmetic) | Backlog, fix in sprint | UI bug |

**Runbook location:** `docs/RUNBOOK.md` (already exists)

---

## 9. When to Trigger Each Phase

| Signal | Action |
|---|---|
| 100+ active users | Move to Phase 2 (Supabase Pro, hourly backups) |
| 1000+ users or paying customers | Move to Phase 3 (HA, multi-region) |
| Enterprise customer requirement | Move to Phase 4 (SOC 2, compliance) |
| Single cloud outage in 12 months | Move to Phase 4 sooner |

---

## 10. Cost Projection by Phase

| Phase | Users | Monthly Infra Cost | Backup Cost |
|---|---|---|---|
| 1 (now) | 0-50 | $0 (free tiers) | $0 |
| 2 | 50-1000 | ~$50/mo (Supabase Pro + Vercel) | ~$5/mo |
| 3 | 1000-10K | ~$500/mo | ~$20/mo |
| 4 | 10K+ | ~$5000+/mo | ~$100+/mo |

---

**Owner:** TBD
**Review cadence:** Quarterly
**Last updated:** 2026-09-07
