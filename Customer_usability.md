# Customer Usability — Are We Over-Engineering Expense Tracking?

> Status: **PLANNED / Design Review** — last reviewed 2026-08-16
>
> Question this document answers: *Over time, the vendor-mapping page grows
> every month/year, and a lot of effort goes into making the expense page
> "perfect." Do we actually need this much merchant-level ledgering? Can we do
> it in a simpler, more elegant, more enterprise way — while still meeting the
> real goals: understand how expenses are managed across categories and time,
> see trends, optimize, and do bookkeeping?*

---

## 1. What we currently have (the data behind the worry)

Measured on the live DB today:

| Thing | Count |
|---|---|
| Vendor mappings (this user) | **1,372** |
| Expense rows with blank `subCategory` or `person` | **2,915** |
| Mappings with no category set | **2** |

So the mapping table is already at ~1.4k rows for **one** user, and it grows
with every import (GPay auto-creates a `VendorMapping` for each new vendor). At
this trajectory — thousands per user × thousands of users — this becomes a
per-user ledger-management burden that has **no consumer analogue in any
successful personal finance app**.

The honest framing: **merchant-level mapping was introduced to patch a data
gap** — GPay Takeout does not export (a) the note you type and (b) the
counterparty name for person-to-person payments. We filled that gap with a
mapping UI. But the mapping table is a *workaround*, not the *product goal*.

---

## 2. The real product goals (what users actually want)

From the user's own words, the aims are:

1. **Understand spending** across categories and over time.
2. **See trends** (month-over-month, year-over-year, category mix).
3. **Optimize** (find where money goes, spot savings).
4. **Bookkeeping** (consistent, auditable records; tax/insurance/loan support).

Note what is **not** in that list: "curate a perfect list of every merchant I
ever paid." Vendors are a *means* (to help categorize), not an end.

### Key structural insight
The **category + date + amount** triple is what powers every report, trend,
budget, and bookkeeping view. The **vendor** is an *optional enrichment* that
helps *derive* the category. Sub-category and person are *optional refinements*
that only matter for a minority of rows (shared/lent money, tax-relevant
splits). We currently treat vendor/sub-category/person as a mandatory, fully
normalized ledger dimension — that is the over-engineering.

---

## 3. How the market actually does it (research across personal finance apps)

| App | Approach to merchant/vendor | Does it maintain a per-user vendor ledger? |
|---|---|---|
| **Mint / Monarch Money / Emma / Wallet by BudgetBakers** | Auto-categorize merchants from a **shared, crowdsourced merchant → category database**. User rarely maps manually; corrections are remembered. | No — categories are the axis; merchant is metadata. |
| **YNAB (You Need A Budget)** | Budget-first. Categories drive everything. Merchant name is optional, free-text detail on a transaction. | No — there is no "mapping page" at all. |
| **India UPI apps (PhonePe, CRED, Paytm)** | Merchant name comes **from the bank statement / UPI switch** (the UPI VPA identifies the merchant). Category is derived by keyword rules, not a per-user table. | No — they show spending by category; vendor is display-only. |
| **Splitwise** | Tracks *people* (who owes whom) for shared expenses — person is the axis only when relevant. | No merchant ledger. |
| **Tally / QuickBooks / Zoho Books** | Full double-entry bookkeeping with Chart of Accounts. Vendor ledger exists — but this is **accounting software for GST/compliance**, not consumer personal finance. | Yes — but it's a different product category. |
| **ET Money / INDmoney / Axio** | Spending insights by category, automated. Minimal manual data entry. | No — insights-first, data auto-synced. |

**The pattern across the entire consumer market is uniform:** consumer personal
finance apps *do not* ask users to maintain a per-merchant mapping table. They
use a shared merchant→category knowledge base + keyword/ML rules, keep
**category** as the primary ledger axis, and treat vendor/person as optional
detail. A giant per-user vendor-mapping UI is an **accounting-software pattern**
(Tally/QuickBooks), not a consumer-finance pattern.

---

## 4. Is the current ledgering required? (Honest verdict)

**No — not at the current level of granularity.** Here is what is genuinely
required versus what we can drop or automate:

### Required (bookkeeping + goals)
- **Category** on every expense (powers budgets, trends, reports, tax).
- **Date + amount** (obvious).
- A **consistent "Other" / fallback** category for unmapped rows (never the
  wrong category — we already fixed the `house-monthly` bug).
- A way to **see and fix the handful of wrong categories** (not 1,400 vendors).

### Optional / only-where-it-matters
- **Vendor name**: nice for search/recall, but does not need to be a curated
  ledger — auto-populate from source data, allow edit, don't force mapping.
- **Sub-category**: only meaningful where the user actually thinks in
  sub-categories (e.g. Groceries → "monthly," Travel → "domestic").
- **Person**: only matters for shared/lent/money-involved-with-someone rows.

### The GPay-specific gap (the actual reason we built this)
- GPay omits notes and P2P counterparty names. That gap should be solved by
  **better data sources** (bank statement UPI narration has the counterparty),
  not by a bigger manual-mapping surface.

---

## 5. A simpler, elegant, enterprise-grade model (proposal)

Adopt the **"category-first, auto-categorize, corrections-remembered"** model
used by consumer apps — while keeping enough structure for bookkeeping:

1. **Make vendor mapping invisible / automatic.**
   - Ship a **shared merchant→category keyword/rule database** (bundled, e.g.
     `data/merchant-categories.ts`): "DMART/Grocery," "Amazon/Shopping,"
     "Zomato/Food," etc. New merchants categorize themselves at import — no
     user action.
   - **Learn from corrections:** when a user changes a category once, write one
     `VendorMapping` row (category only) so future imports reuse it. This is
     "remember my fix," not "maintain a ledger."
   - Auto-create mappings **with a guessed category** (from the shared rules)
     instead of empty ones — so "All Mappings" is mostly pre-filled and the
     Unmapped list shrinks dramatically.

2. **Shrink the Unmapped review surface.**
   - Only surface vendors that are **high-frequency or high-amount** (e.g.
     top 20 by count/amount, or above a threshold). Long-tail one-off vendors
     (cabs, one-off shops) auto-route to a sensible default category silently.
   - This turns "review 100+ vendors" into "review 5–10 meaningful ones."

3. **Make category the axis; vendor optional.**
   - Reports/trends/budgets already run on `categoryId` — keep that as the
     single source of truth.
   - Show vendor as a searchable detail, not a required mapping step.
   - Only require sub-category/person where the user opts in (family sharing,
     lent money, tax splits).

4. **Bookkeeping-grade without bookkeeping-work.**
   - Keep every expense immutable with `date`, `amount`, `categoryId`,
     `vendor`, `source` (import session) → audit trail already exists.
   - Add a monthly **category-level summary** (or export) so "bookkeeping" is
     reading a clean category/month table, not curating merchants.

5. **Kill the exponential growth.**
   - Today: each GPay import auto-creates N new mappings → N grows forever.
   - Proposed: new vendors are **not** auto-created as rows; they're
     categorized on-the-fly by the shared rules + remembered corrections. The
     mapping table only grows when a user **actually corrects** something.

### What stays (from all the work we did)
- Parser cleanup, correct "Other" fallback, session tracking, the
  "Update Expense Page" button (still useful, but will operate on a *much*
  smaller set once auto-categorization lands), pagination + search on the
  vendors page (useful as an *admin* tool, not a daily chore).

---

## 6. Usability & marketability angle (user/customer view)

From a customer's perspective, the current design creates a **maintenance
tax**:

- **Perceived effort:** "I have to keep mapping vendors every month." Users
  churn on apps that demand ongoing bookkeeping.
- **Perceived value:** The *a-ha* is "my spending is auto-organized and I can
  see trends in 2 seconds." A giant mapping page dilutes that.
- **Enterprise elegance:** Enterprise-grade ≠ more tables. It means the system
  *does the bookkeeping work for you* and surfaces only what needs a human.
- **Competitive position:** Every rival (Mint, Monarch, Wallet, PhonePe,
  CRED) auto-categorizes. A manual mapping page is a visible regression in
  perceived polish.

**The ideal user story:**
> "I connect/import my GPay + bank statement. My expenses are auto-categorized
> into Groceries, Food, Transport, Bills, etc. Trends and budgets just work.
> If something is wrong, I tap it once — the app remembers and never asks
> again. I see 5 vendors worth reviewing, not 1,400."

That is both more *usable* and more *marketable* than a comprehensive vendor
ledger, and it still supports full bookkeeping (category/month/amount + audit
trail + export).

---

## 7. Proposed phases (keep it simple first)

### Phase A — Stop the bleeding (low effort, high impact)
- [ ] Bundle a shared merchant→category rule set; use it in `autoCategorize`
      (import + Drive) so new merchants get a **real category immediately**.
- [ ] Stop auto-creating an empty `VendorMapping` per new vendor; instead write
      one only when a user **corrects** a category (remember-the-fix model).
- [ ] On the Unmapped page, default-show only **top-N meaningful vendors**
      (by count/amount); move the full list behind "Show all."

### Phase B — Category-first UX (medium effort)
- [ ] De-emphasize the Vendors page as a daily tool; keep it as an admin/audit
      tool with search + pagination (already done).
- [ ] Add a monthly **category summary** view/export (the "bookkeeping" table).
- [ ] Make sub-category/person **opt-in** (only surface for rows tagged
      shared/lent/tax), so the expense table isn't full of empty columns.

### Phase C — Data-source completeness (the real fix for GPay gaps)
- [ ] Prefer **bank statement UPI narration** (has counterparty VPA → name) as
      the vendor source; merge with GPay by date+amount. This is what the
      "get vendor from bank details" idea ultimately becomes — automatically,
      not manually.

---

## 8. Open decisions for the product owner

1. Do we **stop auto-creating empty vendor mappings** at import (go
   corrections-only), or keep them but pre-guess the category?
   *(Recommendation: corrections-only + bundled rules → smallest table.)*
2. Should the **Unmapped page default to top-N only** by default?
   *(Recommendation: yes.)*
3. Is sub-category/person a **universal field** or **opt-in**?
   *(Recommendation: opt-in; reduces empty columns massively.)*
4. Do we keep the current "Update Expense Page" retrofitter as-is, or let it
   also run the bundled-rule categorization for the ~2,915 incomplete rows?
   *(Recommendation: yes — that one click should finish the job.)*

---

## 9. Bottom line

The **category-first, auto-categorize, corrections-remembered** model is both
simpler and more enterprise-grade than a per-merchant ledger. It keeps all the
bookkeeping value (category/month/amount + audit + export), removes the
exponential mapping growth, and matches what every successful consumer finance
app does. The vendor-mapping page becomes an *admin/audit* tool instead of a
*daily chore*.
