# MyMoney — Product & Architecture Guide (Final)

> **Status**: Final — v1.0
> **Architecture**: Cloud-first SaaS. We host, users access via browser + mobile app.

---

## 1. Customer Personas

### P1: Rahul — The Busy Professional (Primary: Mobile)
- Android/iOS phone 90% of time
- Wants **automatic GPay import** (no manual CSV)
- Not technical, won't manage servers
- Willing to pay ₹99-199/mo
- *Pain*: Google Takeout tedious, wants one-tap

### P2: Priya — The Budget-Conscious Student (Primary: Web)
- Laptop browser for monthly budgeting
- Free tier or low one-time payment
- OK with manual CSV import
- Privacy-conscious
- *Pain*: Spreadsheets are messy

### P3: Suresh — The Tech-Savvy Hobbyist (Primary: Self-host)
- Docker on home server / Raspberry Pi
- Wants ALL features — GPay auto, broker APIs, LLM
- Won't pay subscription, might buy once
- *Pain*: Needs easy Docker deploy

### P4: Vikram — The Family Manager (Multi-device)
- Self + spouse + kids
- Needs multi-profile, shared budgets, sync
- Wife iPhone, he Android + Windows
- Willing to pay ₹299/mo family plan

### P5: Anita — The Financial Advisor (B2B)
- Manages 10-15 client portfolios
- Needs client management, reporting, whitelabel
- Willing to pay ₹999-1999/mo

---

## 2. Platform Architecture

**Decision: Cloud-first SaaS. No native desktop app.**
- "Desktop" = browser on laptop (no install needed)
- GPay automation runs **on our server** (Playwright in cloud)
- Mobile = native app (Android/iOS) → same server API
- Both are thin clients — all processing on server

```
┌──────────────────┐      ┌──────────────────┐
│  BROWSER          │      │  MOBILE APP       │
│  (Any device)     │      │  (Android / iOS)  │
└──────┬───────────┘      └───────┬───────────┘
       │                          │
       └────────────┬─────────────┘
                    │ HTTPS
       ┌────────────▼─────────────┐
       │      OUR SERVER           │
       │  ┌────────────────────┐  │
       │  │ Next.js API + Auth  │  │
       │  │ PostgreSQL (data)   │  │
       │  │ Encrypted at rest   │  │
       │  └────────────────────┘  │
       │  ┌────────────────────┐  │
       │  │ GPay Worker        │  │
       │  │ (Playwright farm)  │  │
       │  └────────────────────┘  │
       │  ┌────────────────────┐  │
       │  │ Gmail Scanner       │  │
       │  │ (Email parsing)    │  │
       │  └────────────────────┘  │
       │  ┌────────────────────┐  │
       │  │ Job Queue (Bull)   │  │
       │  │ Background tasks   │  │
       │  └────────────────────┘  │
       └─────────────────────────┘
```

| Capability | Browser | Mobile App |
|------------|---------|-----------|
| Dashboards | ✅ Full UI | ✅ Optimized |
| GPay auto-import | ✅ Click "Sync" → server does it | ✅ Same |
| Gmail scan | ✅ Same | ✅ Same |
| Upload CSV | ✅ File input | ✅ Share sheet |
| Offline | 🔸 Limited | 🔸 Limited |
| Heavy processing | ❌ All on server | ❌ All on server |

---

## 3. Data & Security Model

### What We Store

| Data Type | How Stored | Who Can Access |
|-----------|-----------|---------------|
| Profile (name, email, currency) | PostgreSQL | App only |
| Financial data (expenses, budgets, goals) | PostgreSQL, AES-256 at rest | App only |
| OAuth tokens (Gmail, Google) | Encrypted DB column | App only (needed for automation) |
| Broker API keys (Zerodha, Sharekhan) | Encrypted DB column | App only (needed for sync) |
| LLM API keys (OpenAI, Claude) | Encrypted DB column | App only |
| Form 16 / IT returns | PostgreSQL, AES-256 | App only |
| Consent logs | PostgreSQL | App only (audit purposes) |

### Who Can Access Production Data?

- **The app (automated system)** — Yes, to function (GPay sync, Gmail scan, broker sync, LLM calls). This is what user signs up for.
- **Us (humans/AI)** — **No.** Production DB credentials are locked. No SSH access. No interactive query tool in production.
- **Other tenants** — **No.** Every DB query is scoped to `organizationId`. Standard multi-tenant isolation.

> **"No human can read your data without your explicit permission. The system runs itself. We built it — we can't look inside."**

### Enterprise / B2B Add-on (Available On Request)

For enterprise customers who need additional guarantees:
- **Per-tenant encryption keys** — each org gets a unique AES key, stored separately
- **Consent-gated support access** — user must click "Grant 24h Access" for us to debug
- **Access audit logs** — every data access attempt logged forever
- **SSO / SAML** — enterprise auth
- **Dedicated instance** — single-tenant deployment

These are **not shown during standard onboarding** (would raise unnecessary doubts). Documented in enterprise contract only.

---

## 4. Onboarding Flow (End-to-End)

All steps except Sign In + Profile are skippable. User can re-run discovery anytime.

```
STEP 0: AUTH ─────────────────────────────────
┌──────────────────────────────────────────┐
│  Sign in with Google                     │
│  (Also accepts Email + Password)         │
│                                          │
│  OAuth scopes requested:                 │
│  • profile + email (basic)              │
│  • gmail.readonly (to scan financial    │
│    emails — optional, skip-able)        │
└──────────────────────────────────────────┘

STEP 1: PROFILE ────────────────────────────
┌──────────────────────────────────────────┐
│  Name: [_______________]                 │
│  Currency: [INR ▼]                      │
│  Default Categories:                     │
│  [Food] [Transport] [Shopping] [Bills].. │
│                                          │
│  [Continue]                              │
└──────────────────────────────────────────┘
  → Editable at /settings/profile

STEP 2: DISCOVERY SCAN ─────────────────────
┌──────────────────────────────────────────┐
│  🔍 Scanning your connected accounts...  │
│                                          │
│  ├─ Gmail: scanning recent emails...    │
│  │  (last 3 months for speed)           │
│  ├─ GPay: checking previous exports...  │
│  └─ Brokers: checking configured APIs.. │
│                                          │
│  ─── Found so far ───                   │
│  ✓ 47 bank transactions (from emails)   │
│  ✓ 12 subscriptions identified          │
│  ✓ 3 mutual fund SIPs                   │
│  ✓ 1 Form 16 (AY 2025-26)              │
│  ⏳ GPay export in progress...          │
│                                          │
│  [Continue to Review]                    │
└──────────────────────────────────────────┘
  → Background: processes remaining emails

STEP 3: REVIEW & IMPORT ────────────────────
┌──────────────────────────────────────────┐
│  What do you want to import?             │
│                                          │
│  ☑ 47 Bank Transactions (₹1.2L total)  │
│     [Review] → shows list to edit        │
│                                          │
│  ☑ 12 Subscriptions (₹2,450/mo)         │
│     Netflix, Spotify, Prime, ...         │
│                                          │
│  ☑ 3 Mutual Funds (₹25K/mo SIPs)         │
│                                          │
│  ☑ Form 16 → Used for tax preview       │
│                                          │
│  ☐ Credit Card Statements               │
│     [Skip — already tracking]           │
│                                          │
│  [Import Selected]          [Skip All]  │
└──────────────────────────────────────────┘
  → Imported items appear in respective sections

STEP 4: CONNECT MORE (OPTIONAL) ────────────
┌──────────────────────────────────────────┐
│  Add more sources (all optional, skip)   │
│                                          │
│  🏦 Zerodha    [API Key + Secret]        │
│  🏦 Sharekhan  [API Key + Secret]        │
│  🤖 AI Insights [OpenAI / Claude Key]    │
│  📄 Upload CSV  [Choose file]            │
│  📄 Form 16     [Upload PDF]             │
│  📋 Past ITR    [Upload PDF / Fetch]     │
│                                          │
│  [Continue]               [Skip All]    │
└──────────────────────────────────────────┘
  → Editable at /settings/integrations

STEP 5: TAX PREVIEW ────────────────────────
┌──────────────────────────────────────────┐
│  Tax Summary                             │
│                                          │
│  ── From Form 16 (AY 2025-26) ──        │
│  Gross Salary: ₹12,00,000               │
│  Deductions (80C, 80D, HRA): ₹3,20,000 │
│  Taxable Income: ₹8,80,000              │
│  Tax Owed: ₹82,500                      │
│  TDS Already Paid: ₹1,12,500            │
│  ───────────────────────                │
│  ✅ Refund Due: ₹30,000                 │
│                                          │
│  ── Past Returns ──                     │
│  AY 2024-25: Filed ✓  Refund: ₹12,000  │
│  AY 2023-24: Filed ✓  No demand         │
│  AY 2022-23: Filed ✓  Demand: ₹3,500   │
│                                          │
│  This is an estimate. Consult your CA   │
│  before filing.                          │
│                                          │
│  [Continue]                              │
└──────────────────────────────────────────┘
  → Editable at /settings/tax

STEP 6: BUDGETS & GOALS (OPTIONAL) ────────
┌──────────────────────────────────────────┐
│  Set your targets (auto-suggested)       │
│                                          │
│  ── Monthly Budgets ──                  │
│  Food: ₹15,000  [_________]             │
│  Transport: ₹5,000 [_________]          │
│  (Based on your spending history)        │
│                                          │
│  ── Goals ──                            │
│  Emergency Fund: ₹[3,00,000]            │
│  Annual Savings: ₹[1,00,000]            │
│                                          │
│  [Continue]            [Skip]           │
└──────────────────────────────────────────┘
  → Editable at /settings/budgets, /settings/goals

STEP 7: DONE ───────────────────────────────
┌──────────────────────────────────────────┐
│  ✅ You're All Set!                       │
│                                          │
│  Connected: Gmail, GPay, Zerodha        │
│  Imported: 47 transactions, 12 subs     │
│  Processing: historical emails in bg    │
│                                          │
│  You can re-run this setup anytime from │
│  Settings → "Re-run Discovery"          │
│                                          │
│  [Go to Dashboard]                       │
└──────────────────────────────────────────┘
```

---

## 5. Re-run Discovery (Settings → "Re-run Discovery")

- Re-scans Gmail since last run (incremental — only new emails)
- Re-fetches broker holdings
- Triggers fresh GPay sync
- Shows only **new** items pre-selected (already-imported greyed out)
- User imports new data into existing records
- Same review/import screen as onboarding Step 3

---

## 6. GPay Automation (Server-Side)

**Our unique differentiator.** No finance app automates Google Pay Takeout.

### Flow
1. User clicks "Sync GPay" from any device
2. Server launches Playwright (headless Chrome)
3. Navigates takeout.google.com → deselects all → selects GPay
4. Chooses email delivery → creates export
5. Server polls for completion (1-5 min for GPay-only)
6. Export ready → server downloads ZIP → extracts CSV
7. Parses transactions → inserts into user's account
8. User sees new transactions in dashboard

### Tech
- Playwright in Docker containers (one per session)
- Google auth cookies stored in encrypted DB
- Bull/BullMQ job queue
- Rate limited: ~1 export/day per Google account

---

## 7. Gmail Parsing (Financial Emails)

Extracts transactions, subscriptions, investments, Form 16 from financial emails.

### Types Parsed

| Email Type | Data Extracted |
|-----------|---------------|
| Bank UPI/SMS alerts | Amount, vendor, date, category |
| Credit card statements | Monthly spends, due date |
| Mutual fund confirmations | Fund name, SIP amount, NAV |
| Insurance receipts | Premium, policy, due date |
| Subscription receipts | Service name, amount, cycle |
| Form 16 (PDF) | Salary, TDS, deductions |
| IT return acknowledgments | Filed status, refund/demand |

### Performance

| Phase | Scope | Time | UX |
|-------|-------|------|-----|
| Onboarding | Last 3 months (~200 emails) | ~5-10 seconds | Shows instant |
| Background | All history (up to 10K) | 2-5 min server-side | Progress bar |
| Daily | ~1-5 new emails | < 1 second | Silent |

---

## 8. ITR & Tax Features

| Feature | In Phase 1? |
|---------|-------------|
| Fetch past IT returns (last 3 years) | ✅ Yes |
| Show refund/demand summary | ✅ Yes |
| Parse Form 16 (from email or upload) | ✅ Yes |
| Estimate current-year tax from data | ✅ Yes |
| Tax preview: "Refund ₹X / Pay ₹Y" | ✅ Yes |
| Semi-automatic ITR prep (pre-filled) | 🔸 Yes, user verifies |
| **Actually file the ITR** | ❌ No (needs CA/tax practitioner license) |

### Form 16
- **From emails**: Scan Gmail for "Form 16" PDF attachments (typically Apr-Jun)
- **Upload**: Manual PDF upload in onboarding or settings
- **Parse**: Extract Part A (employer PAN, TDS) + Part B (salary, deductions)

---

## 9. Subscription & Tiers

| Tier | Price | GPay | Gmail Scan | Brokers | LLM AI | Profiles | Sync |
|------|-------|------|-----------|---------|--------|----------|------|
| **Free** | $0 | Manual CSV | ❌ | ❌ | ❌ | 1 | No |
| **Pro** | $9/mo ($99/yr) | ✅ | ✅ | ✅ | ✅ | 3 | Encrypted |
| **Family** | $19/mo ($199/yr) | ✅ | ✅ | ✅ | ✅ | 10+ | Encrypted |
| **Business** | $29/mo ($299/yr) | ✅ | ✅ | ✅ | ✅ | Unlimited | Realtime |
| **B2B** | Custom | ✅ | ✅ | ✅ | ✅ | 50+/client | Realtime |

Self-host option (Docker image) available as open-source for power users — Phase 3.

---

## 10. Competitive Landscape

| Dimension | Global (Monarch/YNAB) | Indian (INDmoney/ET) | MyMoney |
|-----------|---------------------|---------------------|---------|
| GPay auto-import | ❌ | ❌ | ✅ Unique |
| Bank sync | ✅ Plaid | 🔸 SMS parsing | 🔸 GPay + CSV |
| Broker APIs | ❌ | 🔸 MF only | ✅ Stocks + MF |
| Tax/ITR | ❌ | ❌ | ✅ Form 16 + ITR |
| AI insights | 🔸 Basic | ❌ | ✅ OpenAI/Claude |
| Cross-sells | ❌ | ✅ Loans, MF | ❌ Clean |
| Open source | ❌ | ❌ | ✅ Self-host |
| Pricing | $99-109/yr | Free + ₹199/mo | Free + ₹99-299/mo |

### Our Advantages
1. **GPay automation** — No competitor does this
2. **Broker APIs** (Zerodha, Sharekhan) — Indian stock market focus
3. **AI-powered** — LLM categorization, insights, chat
4. **Clean subscription** — No product cross-selling
5. **ITR + Form 16** — Tax features integrated

### Our Weaknesses (Mitigations)
1. **No bank sync (Plaid/SMS)** → GPay covers UPI, CSV for banks
2. **No credit score** → Future add-on (CIBIL API)
3. **Young brand** → Open source builds trust

---

## 11. What Needs Building (Phase 1)

### Week 1-2: Core Infrastructure
- Multi-tenancy model (Organization → User)
- `UserCredential` Prisma model + AES-256-GCM encryption
- `/api/user-credentials` CRUD routes
- Update Zerodha/Sharekhan/LLM APIs to read from DB

### Week 2-3: Gmail + GPay
- Gmail OAuth + scanner service
- Email parsers (bank, MF, subs, Form 16)
- Background job queue (Bull)
- GPay Docker worker (extracted from current script)

### Week 3-4: Tax + Onboarding
- ITR portal integration (fetch past returns)
- Tax preview engine
- Form 16 PDF parser
- Full onboarding wizard (Steps 0-7)
- Settings: "Re-run Discovery" button
- Google OAuth verification submission

### Week 4+: Subscription + Polish
- Razorpay/Stripe integration
- Feature gating by tier
- Mobile app (React Native) begins
- Self-host Docker image

---

## 12. Open Questions

1. **Revenue**: Subscription only, or also one-time self-host license?
2. **Self-host pricing**: Free open-source core? Paid advanced features?
3. **B2B timeline**: Now or later?
4. **Cloud infra**: Own VPS or use Supabase/Railway?
5. **Mobile priority**: React Native or Flutter?

*Consolidated in `PRODUCT-PLAN.md` — refer there for the unified product plan.*
