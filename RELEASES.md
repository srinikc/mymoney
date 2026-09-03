# MyMoney Release Notes

This file tracks every **released version** of MyMoney. The build number
(separate from version) is auto-generated from the git commit count
and increments on every build.

## Industry standard (semver 2.0.0)

```
1.2.3
│ │ │
│ │ └─ PATCH — bug fixes, small improvements
│ └─── MINOR — new features, backward-compatible
└───── MAJOR — breaking changes, schema migrations
```

| Bump type | When | Example |
|---|---|---|
| **major** | Breaking changes / schema migrations requiring user action | `1.2.3` → `2.0.0` |
| **minor** | New features, new API routes (backward-compatible) | `1.2.3` → `1.3.0` |
| **patch** | Bug fixes, small improvements within a minor release | `1.2.3` → `1.2.4` |
| **prerelease** | `alpha`, `beta`, `rc` (release candidate) tags for testing | `1.2.3` → `1.2.3-alpha.1` |

**Build number** is SEPARATE from version:
- Always increments per commit (monotonic)
- Auto-generated from `git rev-list --count HEAD`
- NOT part of the version string
- NOT tagged in git

**Git tags**: only released versions get tags (`v1.2.0`, `v1.3.0`, etc.). Individual builds are not tagged.

**Display format** in the app footer:
```
v1.2.3 · build 47 · a1b2c3d
```

---

## Released versions

### v1.0.0 — Initial stable release

- **Date:** 2026-09-02
- **Build range:** 1 – 65
- **Highlights:** Full personal finance manager with AI chat, GPay automation, ad revenue, and admin dashboard

**Added:**
- Personal finance management: expenses, budgets, goals, investments, insurance, loans, assets, liabilities, subscriptions
- AI Chat with data-driven fallback (no LLM API key required)
- GPay automation with Playwright (self-hosted) + manual export fallback (Vercel)
- 13-step financial intelligence (spending, budgets, emergency fund, retirement, etc.)
- Ad revenue system: affiliate links (Kuvera, Groww, Zerodha, BankBazaar), sponsored content, AdSense placeholders
- Admin dashboard: ad revenue metrics, loan/fund management, AI fund scoring cron, kill switch
- Google OAuth integration (conditional on env vars)
- Multi-profile support, family sharing, audit logs
- Tax module with ITR tracking, 80C/80D suggestions
- Insurance module, subscriptions tracking, vendor auto-categorization
- Mobile app (React Native/Expo) with full feature parity
- PWA support with offline install
- E2E tests (Playwright) + unit tests (Vitest)
- GitHub Actions CI/CD with Vercel deployment

**Changed:**
- Migrated to Next.js 15 App Router
- Adopted Tailwind CSS + shadcn/ui components
- Switched to Supabase (PostgreSQL) for data layer
- Moved LLM to per-user configurable provider/key (OpenAI, Anthropic, OpenCode, Local)

**Fixed:**
- Blank page after login on Vercel (trustHost, redirect loop, __Secure cookie)
- Google OAuth missing client_id when env vars not set
- Settings page leaking admin info to regular users
- GPay refresh on Vercel (Playwright not available) — now shows manual export instructions

---

## How to cut a new release

```bash
# 1. Ensure develop is green: all tests pass, E2E passes
# 2. Merge develop → main (via PR)
# 3. Bump version (interactive, prompts before each step)
npm run version:bump -- patch    # or minor / major / prerelease alpha

# 4. Edit RELEASES.md to fill in highlights, Added/Changed/Fixed
# 5. Commit the bump
git add package.json RELEASES.md
git commit -m "release: v1.1.0"

# 6. Tag the release (only versions get tags, not every build)
git tag v1.1.0
git push origin main --follow-tags

# 7. Vercel auto-builds and deploys with the new version
```

The `prebuild` script auto-generates `.env.version` with the latest
commit count and SHA. The footer shows `v{version} · build {commit_count} · {short_sha}`.
