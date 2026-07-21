# Play Store Submission Guide

## Prerequisites
- [ ] Google Play Developer account ($25 one-time fee) — https://play.google.com/console/signup
- [ ] Service account JSON key for EAS Submit (generated from Google Cloud Console)
- [ ] App screenshots (see below)
- [ ] Privacy Policy URL: `https://yourdomain.com/privacy` (hosted on web app)

## Step 1: Update Environment Variables

Edit `eas.json`:
- Set `API_URL` in `production-android` to your live server URL
- Set `serviceAccountKeyPath` to your Google service account JSON file
- Set `android.package` in `app.json` if different (currently `com.srinikc.mymoney`)

## Step 2: Build the Production App Bundle

```bash
cd mobile
npx eas build --platform android --profile production-android
```

This creates a signed AAB (Android App Bundle) ready for Play Store.

## Step 3: Generate App Signing

EAS Build handles app signing automatically on the first production build.
The signing key is stored securely in Expo's keystore.
Download and keep the keystore backup if provided.

## Step 4: Prepare Store Listing

### Required Assets

| Asset | Size | Location | Notes |
|---|---|---|---|
| App icon | 512×512 PNG | `assets/icon.png` | ✅ |
| Adaptive icon foreground | 512×512 PNG | `assets/android-icon-foreground.png` | ✅ |
| Adaptive icon background | 512×512 PNG | `assets/android-icon-background.png` | ✅ |
| Feature graphic | 1024×500 PNG | `assets/feature-graphic.png` | ⬜ **Need to create** |
| Phone screenshot #1 | 1080×1920 PNG | `assets/screenshots/` | ⬜ **Need to create** |
| Phone screenshot #2 | 1080×1920 PNG | `assets/screenshots/` | ⬜ **Need to create** |
| Phone screenshot #3 | 1080×1920 PNG | `assets/screenshots/` | ⬜ **Need to create** |
| Phone screenshot #4 | 1080×1920 PNG | `assets/screenshots/` | ⬜ **Need to create** |
| 7-inch tablet screenshot | 1920×1200 PNG | `assets/screenshots/` | ⬜ Optional |
| 10-inch tablet screenshot | 2560×1600 PNG | `assets/screenshots/` | ⬜ Optional |

### Recommended Screenshots Content
1. **Dashboard** — Home screen with balance, quick stats, health score
2. **Expenses** — Transaction list with filters
3. **Income** — Income sources with summary cards
4. **Reports** — Income vs expenses chart view

### Store Listing Text

**Title:** MyMoney — Personal Finance Manager
**Short description (80 chars):** Track expenses, income, budgets, investments, and tax — all in one place.
**Full description:**

> MyMoney is a comprehensive personal finance management app that helps you take control of your money.
>
> **Track everything:**
> • Expenses & Income — Log transactions with categories, vendors, and payment modes
> • Budgets — Set monthly budgets per category and track utilization
> • Goals — Save for emergencies, retirement, education, or any goal
> • Investments — Track stocks, mutual funds, FD, PPF, NPS, gold, real estate
> • Insurance — Manage health, term life, motor policies with renewal tracking
> • Loans — Home, car, vehicle, education loans with EMI and progress tracking
> • Subscriptions — Netflix, Spotify, Amazon — track all recurring payments
>
> **Smart features:**
> • Auto-Link — Automatically match expenses to income sources
> • Gmail Import — Scan your inbox for financial transactions
> • GPay Sync — Import Google Pay transactions automatically
> • Financial Health Score — Get a 0-100 wellness score with actionable insights
> • AI Chatbot — Ask questions about your finances
> • Tax Calculator — Estimate tax, track Form 16 and ITR filings
> • Reports — Monthly trends, category breakdowns, income vs expense charts
> • Net Worth — Assets minus liabilities at a glance
>
> **Security:**
> • Biometric lock (Face ID / fingerprint)
> • All data stored in your own database
> • Open source — fully auditable codebase

**Category:** Finance
**Tags:** personal finance, expense tracker, budget planner, money manager, tax calculator

## Step 5: Upload via EAS Submit

```bash
npx eas submit --platform android --profile production-android
```

## Step 6: Google Play Console Final Steps

1. Complete store listing (screenshots, description, category)
2. Set up pricing (free or paid)
3. Complete content rating questionnaire
4. Review and publish

## Troubleshooting

- **EAS Build fails:** Check `expo export --platform android` passes locally first
- **API doesn't connect:** Ensure `API_URL` in eas.json points to your server
- **App signing issues:** Expo manages keystore — don't lose the backup they provide
