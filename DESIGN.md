# MyMoney — Product Design & Implementation Plan

> **Status**: Living document — mark items `[x]` as implemented.
> **Last updated**: 24-Jun-2026

---

## 1. Product Vision

MyMoney is a **central personal finance platform** that unifies all financial data — expenses, income, investments, insurance, assets, liabilities, goals — into a single view. It provides analytics, AI-powered financial advisory, projections, and insights to help individuals and families manage, optimize, and grow their wealth.

### Core Principles

| Principle | Description |
|---|---|
| **Data first** | All features built on top of unified, accurate financial data |
| **Privacy by design** | User owns their data. Encrypted, revocable, never shared. |
| **Standards-based** | Every calculation references CFP, SEBI, AMFI, RBI benchmarks |
| **Educational, not advisory** | We show data, gaps, and projections. Never regulated investment advice. |
| **Progressive** | Start simple (manual entry) → grow to full automation (Account Aggregator) |

---

## 2. Architecture Overview

```
┌──────────────────────────────────────────────────────────────────────┐
│                          PRESENTATION LAYER                          │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────────────┐ │
│  │ Dashboard│  │ Insights │  │ Reports  │  │ AI Advisor Chatbot   │ │
│  │ (page.tsx)│  │(page.tsx)│  │(page.tsx)│  │ (floating chat UI)  │ │
│  └──────────┘  └──────────┘  └──────────┘  └──────────────────────┘ │
├──────────────────────────────────────────────────────────────────────┤
│                         FEATURE LAYER                                │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────────────┐ │
│  │Expenses  │  │Budgets   │  │ Goals    │  │ Investments          │ │
│  │(CRUD)    │  │(tracking)│  │(planning)│  │ (portfolio tracker)  │ │
│  ├──────────┤  ├──────────┤  ├──────────┤  ├──────────────────────┤ │
│  │ Insurance│  │ Net Worth│  │ Plans    │  │ Reminders            │ │
│  │ (track)  │  │ (calc)   │  │ (future) │  │ (bill alerts)        │ │
│  └──────────┘  └──────────┘  └──────────┘  └──────────────────────┘ │
├──────────────────────────────────────────────────────────────────────┤
│                       ANALYTICS & AI ENGINE                          │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │  ┌────────────┐ ┌───────────┐ ┌──────────┐ ┌────────────┐  │   │
│  │  │ Financial  │ │ Portfolio │ │ Goal     │ │ Tax        │  │   │
│  │  │ Health     │ │ XIRR &    │ │ Feasi-   │ │ Optimizer  │  │   │
│  │  │ Score      │ │ Alloc     │ │ bility   │ │            │  │   │
│  │  └────────────┘ └───────────┘ └──────────┘ └────────────┘  │   │
│  │  ┌────────────┐ ┌───────────┐ ┌──────────┐ ┌────────────┐  │   │
│  │  │ Insurance  │ │ Risk      │ │ What-if  │ │ LLM Chat   │  │   │
│  │  │ Gap Check  │ │ Profiler  │ │ Simulator│ │ Interface  │  │   │
│  │  └────────────┘ └───────────┘ └──────────┘ └────────────┘  │   │
│  └──────────────────────────────────────────────────────────────┘   │
├──────────────────────────────────────────────────────────────────────┤
│                       DATA INTEGRATION LAYER                         │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────────────┐ │
│  │ Manual   │  │ File     │  │ Account  │  │ Broker APIs          │ │
│  │ Entry    │  │ Import   │  │ Aggregat │  │ (Zerodha, Groww...)  │ │
│  │          │  │(CSV/XLSX)│  │ (Finvu)  │  │                      │ │
│  ├──────────┤  ├──────────┤  ├──────────┤  ├──────────────────────┤ │
│  │ Receipt  │  │ Bank PDF │  │ MF       │  │ CDSL/NSDL eCAS       │ │
│  │ OCR      │  │ Parser   │  │ Central  │  │ Parser               │ │
│  └──────────┘  └──────────┘  └──────────┘  └──────────────────────┘ │
├──────────────────────────────────────────────────────────────────────┤
│                         DATA LAYER                                    │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │  PostgreSQL  │  Prisma ORM  │  Models: User, Profile,        │   │
│  │              │              │  Expense, Investment, Goal...   │   │
│  └──────────────────────────────────────────────────────────────┘   │
├──────────────────────────────────────────────────────────────────────┤
│                      CROSS-CUTTING                                    │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────────────┐ │
│  │ Auth     │  │ Admin    │  │ Feature  │  │ Audit Log            │ │
│  │(NextAuth)│  │ Console  │  │ Flags    │  │ (all changes)        │ │
│  └──────────┘  └──────────┘  └──────────┘  └──────────────────────┘ │
└──────────────────────────────────────────────────────────────────────┘
```

---

## 3. Data Models (Prisma Schema)

### 3.1 Core User & Profile

```prisma
enum UserRole {
  ADMIN
  USER
}

enum ProfileTier {
  FREE
  PREMIUM
  ENTERPRISE
}

model User {
  id            Int       @id @default(autoincrement())
  email         String    @unique
  name          String?
  googleId      String?   @unique
  avatar        String?
  role          UserRole  @default(USER)
  isActive      Boolean   @default(true)
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  profiles      Profile[]
  adminSettings AdminSetting[]
}

model Profile {
  id            Int         @id @default(autoincrement())
  userId        Int
  name          String      // "My Profile", "Family", "Business"
  type          String      @default("individual") // individual | family | business
  tier          ProfileTier @default(FREE)
  currency      String      @default("INR")
  locale        String      @default("en-IN")
  riskProfile   String?     // conservative | moderate | aggressive
  onboardingStep Int        @default(0) // 0=not started, 1..5=in progress, 6=complete
  isActive      Boolean     @default(true)
  createdAt     DateTime    @default(now())
  updatedAt     DateTime    @updatedAt

  user          User        @relation(fields: [userId], references: [id])
  expenses      Expense[]
  budgets       Budget[]
  goals         Goal[]
  investments   Investment[]
  plans         Plan[]
  deals         Deal[]
  reminders     Reminder[]
  assets        Asset[]
  liabilities   Liability[]
  importSessions ImportSession[]
  merchantMappings MerchantMapping[]

  @@index([userId])
}
```

### 3.2 Financial Data Models

```prisma
model Expense {
  id              Int             @id @default(autoincrement())
  profileId       Int
  date            DateTime
  amount          Float
  categoryId      Int
  category        Category        @relation(fields: [categoryId], references: [id])
  subCategory     String?
  person          String?
  vendor          String?
  description     String?
  paymentMode     String          @default("UPI")
  recurrenceType  String          @default("onetime") // monthly | yearly | quarterly | onetime
  otherType       String?
  tags            String?
  receiptUrl      String?
  isShared        Boolean         @default(false)
  sharedWith      String?
  paidThrough     String?
  bankAccount     String?
  notes           String?
  importSessionId Int?
  importSession   ImportSession?  @relation(fields: [importSessionId], references: [id])
  flagged         Boolean         @default(false)
  createdAt       DateTime        @default(now())
  updatedAt       DateTime        @updatedAt

  profile         Profile         @relation(fields: [profileId], references: [id])

  @@index([profileId, date])
  @@index([profileId, categoryId])
  @@index([profileId, vendor])
  @@index([profileId, person])
}

model Category {
  id        Int       @id @default(autoincrement())
  name      String    @unique
  type      String    @default("expense") // expense | income
  icon      String    @default("circle")
  color     String    @default("#6366f1")
  createdAt DateTime  @default(now())
  expenses  Expense[]
  budgets   Budget[]
  reminders Reminder[]
}

model Budget {
  id         Int       @id @default(autoincrement())
  profileId  Int
  categoryId Int
  month      Int
  year       Int
  amount     Float
  createdAt  DateTime  @default(now())
  updatedAt  DateTime  @updatedAt

  profile    Profile   @relation(fields: [profileId], references: [id])
  category   Category  @relation(fields: [categoryId], references: [id])

  @@unique([profileId, categoryId, month, year])
  @@index([profileId, year, month])
}

model Goal {
  id              Int       @id @default(autoincrement())
  profileId       Int
  name            String
  type            String    // emergency_fund | retirement | education | house | vacation | custom
  targetAmount    Float
  currentAmount   Float     @default(0)
  monthlySip      Float?    // monthly contribution needed
  deadline        DateTime?
  targetDate      DateTime?
  priority        Int       @default(3) // 1=high, 2=medium, 3=low, 4=flexible
  category        String?
  notes           String?
  status          String    @default("active") // active | completed | paused | abandoned
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt

  profile         Profile   @relation(fields: [profileId], references: [id])

  @@index([profileId, status])
}
```

### 3.3 Portfolio & Investment Models

```prisma
model Investment {
  id              Int       @id @default(autoincrement())
  profileId       Int
  type            String    // mutual_fund | stock | fd | ppf | epf | nps | gold | sgb | crypto | bond | others
  name            String
  institution     String?   // HDFC MF, Zerodha, SBI, etc.
  folioNumber     String?   // MF folio / Demat account / FD receipt
  amount          Float     // total invested
  currentValue    Float
  purchaseDate    DateTime?
  maturityDate    DateTime?
  returnRate      Float?    // XIRR in %
  sipAmount       Float?    // monthly SIP if applicable
  sipFrequency    String?   // monthly | quarterly
  notes           String?
  status          String    @default("active") // active | matured | redeemed
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt

  profile         Profile   @relation(fields: [profileId], references: [id])

  @@index([profileId, type])
  @@index([profileId, status])
}

model Asset {
  id          Int       @id @default(autoincrement())
  profileId   Int
  name        String
  type        String    // real_estate | vehicle | gold_physical | jewelry | art | cash | others
  amount      Float
  notes       String?
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt

  profile     Profile   @relation(fields: [profileId], references: [id])

  @@index([profileId, type])
}

model Liability {
  id            Int       @id @default(autoincrement())
  profileId     Int
  name          String
  type          String    // home_loan | car_loan | personal_loan | credit_card | education_loan | others
  amount        Float
  interestRate  Float?
  emiAmount     Float?
  tenureMonths  Int?
  paidMonths    Int?
  dueDate       DateTime?
  notes         String?
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  profile       Profile   @relation(fields: [profileId], references: [id])

  @@index([profileId, type])
}
```

### 3.4 Insurance Model

```prisma
model Insurance {
  id            Int       @id @default(autoincrement())
  profileId     Int
  type          String    // term_life | health | motor | travel | ulip | endowment | critical_illness
  provider      String    // HDFC Life, ICICI Prudential, etc.
  policyNumber  String
  holderName    String
  sumAssured    Float
  premium       Float
  premiumFrequency String  // monthly | yearly | single
  startDate     DateTime
  endDate       DateTime?
  nominee       String?
  isActive      Boolean   @default(true)
  notes         String?
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  profile       Profile   @relation(fields: [profileId], references: [id])

  @@index([profileId, type])
}
```

### 3.5 Merchant Mapping & Import

```prisma
model MerchantMapping {
  id          Int      @id @default(autoincrement())
  profileId   Int
  merchantKey String
  description String?
  expenseType String?
  subCategory String?
  person      String?
  source      String   @default("manual") // manual | gpay-import | kcexpenses | auto
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  profile     Profile  @relation(fields: [profileId], references: [id])

  @@unique([profileId, merchantKey])
  @@index([profileId, merchantKey])
}

model ImportSession {
  id           Int       @id @default(autoincrement())
  profileId    Int
  source       String
  fileName     String?
  totalRows    Int       @default(0)
  autoMapped   Int       @default(0)
  newMerchants Int       @default(0)
  skipped      Int       @default(0)
  status       String    @default("preview")
  createdAt    DateTime  @default(now())
  expenses     Expense[]

  profile      Profile   @relation(fields: [profileId], references: [id])

  @@index([profileId, createdAt])
}
```

### 3.6 Admin & Feature Management

```prisma
model AdminSetting {
  id        Int     @id @default(autoincrement())
  userId    Int     @unique
  user      User    @relation(fields: [userId], references: [id])
  settings  String  // JSON blob of admin preferences
}

model FeatureFlag {
  id          Int      @id @default(autoincrement())
  profileId   Int
  featureKey  String   // "ai_advisor", "bank_import", "aa_integration", etc.
  isEnabled   Boolean  @default(false)
  updatedAt   DateTime @updatedAt

  @@unique([profileId, featureKey])
}

model AuditLog {
  id          Int       @id @default(autoincrement())
  profileId   Int?
  action      String    // create | update | delete | view | export
  entityType  String    // expense | goal | investment | etc.
  entityId    Int?
  metadata    String?   // JSON — old value, new value, etc.
  ip          String?
  createdAt   DateTime  @default(now())

  @@index([profileId, action])
  @@index([entityType, entityId])
  @@index([createdAt])
}
```

---

## 4. Customer Wealth Tiers

### Tier Classification

| Tier | Net Worth | Annual Income | Monthly Surplus | Typical Profile |
|---|---|---|---|---|
| **Mass Affluent (T1)** | ₹10L – ₹50L | ₹5L – ₹15L | ₹5K – ₹25K | Young professionals, early-career couples |
| **Emerging HNI (T2)** | ₹50L – ₹3Cr | ₹15L – ₹50L | ₹25K – ₹1.5L | Mid-career, dual-income families |
| **High Net Worth (T3)** | ₹3Cr – ₹25Cr | ₹50L – ₹2Cr | ₹1.5L – ₹10L | Senior execs, business owners, doctors |
| **Ultra HNI (T4)** | ₹25Cr+ | ₹2Cr+ | ₹10L+ | Business families, inherited wealth |

### Feature Availability by Tier

| Feature | T1 | T2 | T3 | T4 |
|---|---|---|---|---|
| Expense tracking | ✅ | ✅ | ✅ | ✅ |
| Budget management | ✅ | ✅ | ✅ | ✅ |
| Basic reports | ✅ | ✅ | ✅ | ✅ |
| Goal planning | ✅ | ✅ | ✅ | ✅ |
| Emergency fund calculator | ✅ | ✅ | ✅ | ✅ |
| 50/30/20 budget check | ✅ | ✅ | ✅ | ✅ |
| SIP recommendation | ✅ | ✅ | ✅ | ✅ |
| Mutual fund direct vs regular check | ✅ | ✅ | ✅ | ✅ |
| Tax optimization (80C, HRA, capital gains) | ✅ | ✅ | ✅ | ✅ |
| Insurance gap analysis | ✅ | ✅ | ✅ | ✅ |
| Financial Health Score | ✅ | ✅ | ✅ | ✅ |
| AI recommendations | ✅ | ✅ | ✅ | ✅ |
| LLM chatbot | ✅ | ✅ | ✅ | ✅ |
| Portfolio XIRR tracking | ❌ | ✅ | ✅ | ✅ |
| Asset allocation rebalancing | ❌ | ✅ | ✅ | ✅ |
| What-if simulator | ❌ | ✅ | ✅ | ✅ |
| International diversification check | ❌ | ✅ | ✅ | ✅ |
| Debt management plan | ❌ | ✅ | ✅ | ✅ |
| Retirement planning (detailed) | ❌ | ✅ | ✅ | ✅ |
| Monthly PDF financial report | ❌ | ✅ | ✅ | ✅ |
| Multi-family dashboard | ❌ | ❌ | ✅ | ✅ |
| Estate planning | ❌ | ❌ | ✅ | ✅ |
| Tax-loss harvesting | ❌ | ❌ | ✅ | ✅ |
| Portfolio stress testing | ❌ | ❌ | ✅ | ✅ |
| Family office dashboard | ❌ | ❌ | ❌ | ✅ |
| Succession planning | ❌ | ❌ | ❌ | ✅ |
| Offshore investment tracking | ❌ | ❌ | ❌ | ✅ |
| Dedicated admin support | ❌ | ❌ | ❌ | ✅ |

---

## 5. AI Financial Advisor Engine

### 5.1 Financial Health Score Calculation

The score (0-100) is a weighted composite of 6 pillars:

| Pillar | Weight | Metrics | Formula Source |
|---|---|---|---|
| **Cash Flow** | 25% | Savings rate, emergency fund months, DTI ratio | CFP standards |
| **Investment** | 20% | Portfolio XIRR vs benchmark, asset allocation vs target, diversification score | AMFI / SEBI |
| **Insurance** | 15% | Life cover (HLV method), health cover adequacy | IRDAI guidelines |
| **Tax** | 15% | 80C utilization, HRA optimization, LTCG planning | Income Tax Act |
| **Debt** | 15% | DTI ratio, interest cost, prepayment priority | CFP standards |
| **Goals** | 10% | Goal progress, feasibility percentage, timeline | CFP standards |

### 5.2 Computed Metrics

| Metric | Formula | Data Sources |
|---|---|---|
| **Savings Rate** | (Income − Expenses) / Income × 100 | Expense + income entries |
| **Emergency Fund Months** | Liquid assets / Monthly expenses | Asset model + expense avg |
| **Debt-to-Income (DTI)** | Total EMIs / Monthly Income | Liability model + income |
| **HLV (Human Life Value)** | Annual Income × (Retirement Age − Current Age) × 70% | Profile data |
| **Insurance Gap** | HLV − Current Life Cover | Insurance model |
| **Retirement Corpus** | Annual Expenses × (1 + Inflation)^Years / SWP Rate | Goals + CFP formula |
| **Goal Feasibility** | Required SIP / Available Surplus × 100 | Goals + cash flow |
| **Portfolio XIRR** | XIRR of all investment cash flows | Investment model + transactions |
| **Asset Allocation Drift** | Current % vs Target % per risk profile | Investment model |
| **Tax Efficiency** | Actual Tax Paid / Optimal Tax × 100 | Income + deduction data |
| **Net Worth** | Total Assets − Total Liabilities | All financial models |
| **Net Worth Growth** | (Current NW − Previous NW) / Previous NW × 100 | Period comparison |

### 5.3 Risk Profiling (SEBI RIA Standard)

A 10-question assessment covering:

1. **Investment horizon** (1 yr → 20+ yrs)
2. **Risk tolerance** ("I can accept losses up to X%")
3. **Income stability** (government job → business → freelance)
4. **Financial dependents** (0 → 5+)
5. **Existing debt** (none → >50% DTI)
6. **Investment experience** (none → expert)
7. **Emergency fund status** (fully funded → none)
8. **Goal flexibility** (fixed timeline → flexible)
9. **Knowledge of markets** (beginner → expert)
10. **Reaction to market crash** (buy more → sell everything)

**Output**: Conservative | Moderate | Aggressive with target asset allocation:

| Risk Profile | Equity | Debt | Gold | Cash |
|---|---|---|---|---|
| Conservative | 25% | 55% | 10% | 10% |
| Moderate | 50% | 35% | 10% | 5% |
| Aggressive | 70% | 20% | 5% | 5% |

### 5.4 Recommendation Engine Logic

```typescript
interface Recommendation {
  area: string           // cash_flow | investment | insurance | tax | debt | goals
  priority: number       // 1 (critical) → 5 (nice to have)
  tier: ProfileTier[]    // which tiers this applies to
  condition: string      // rule description
  message: string        // user-facing text
  impact: string         // projected improvement
  actionUrl?: string     // link to relevant page
}

const recommendations: Recommendation[] = [
  {
    area: "cash_flow",
    priority: 1,
    condition: "emergency_fund_months < 6",
    message: "Your emergency fund covers only {months} months. Target: 6 months (₹{target}).",
    impact: "Adds financial security against job loss or medical emergency."
  },
  {
    area: "debt",
    priority: 1,
    condition: "dti_ratio > 0.40",
    message: "Your debt-to-income ratio is {dti}% (>40% threshold). Prioritize prepaying {highest_interest_loan}.",
    impact: "Saves ₹{savings}/year in interest payments."
  },
  {
    area: "insurance",
    priority: 2,
    condition: "life_cover_gap > 0",
    message: "Your life cover is ₹{current} vs recommended ₹{target} (HLV method).",
    impact: "Ensures family financial security in your absence."
  },
  {
    area: "investment",
    priority: 2,
    condition: "allocation_drift > 0.05",
    message: "Your {asset_class} allocation is {actual}% vs target {target}%. Rebalance to optimize risk-return.",
    impact: "Reduces portfolio volatility by ~{impact}%."
  },
  {
    area: "tax",
    priority: 3,
    condition: "section_80c_used < 150000",
    message: "You have used ₹{used} of ₹1.5L 80C limit. Potential saving: ₹{saving}.",
    impact: "Saves ₹{saving} in taxes this year."
  },
  // ... more rules
]
```

### 5.5 What-If Simulator

| Scenario | Inputs | Outputs |
|---|---|---|
| "Increase SIP by ₹5K" | Goal target, current SIP, increase amount | New timeline, corpus at maturity |
| "Prepay loan ₹2L" | Loan balance, interest rate, prepay amount | Interest saved, new tenure |
| "Reduce dining out by 50%" | Current dining expense | Monthly savings, yearly total |
| "Retire at 55" | Current age, expenses, savings | Monthly SIP needed, corpus |
| "Market crash 30%" | Current portfolio allocation | New portfolio value, recovery time |

---

## 6. LLM Chatbot

### 6.1 Architecture

```
User Query ──→ Prompt Builder ──→ LLM API (OpenAI/Claude)
                  ↑
             Context: User's financial data from DB
                  ↓
User ←── Response Formatter ←── LLM Response
```

### 6.2 Pre-Built Query Templates

| Category | Example Queries |
|---|---|
| **Spending** | "How much did I spend on food this month?" |
| **Spending** | "What's my biggest expense category?" |
| **Budget** | "Am I over budget this month?" |
| **Budget** | "Show me categories where I exceeded budget" |
| **Goals** | "Am I on track for my retirement goal?" |
| **Goals** | "How much more do I need to save for my house?" |
| **Net Worth** | "What's my current net worth?" |
| **Net Worth** | "How has my net worth changed this year?" |
| **Investments** | "What's my portfolio XIRR?" |
| **Investments** | "How are my mutual funds performing?" |
| **Insurance** | "Do I have enough life insurance?" |
| **Insurance** | "Is my health insurance adequate?" |
| **Tax** | "How much tax did I pay last year?" |
| **Tax** | "Am I maximizing my 80C deductions?" |
| **Projections** | "When can I retire if I save ₹20K/month?" |
| **Projections** | "What if I increase my SIP by 10% yearly?" |
| **General** | "Give me a financial health summary" |
| **General** | "What should I improve first?" |

### 6.3 Prompt Engineering

```
You are a financial wellness assistant for MyMoney.
You have access to the user's financial data (expenses, income, investments, goals, etc.).

**Important**: You provide EDUCATIONAL insights and DATA ANALYSIS only.
You do NOT give regulated investment advice (no "buy this stock" or "switch to fund X").

User data context:
{structured_data_summary}

User query: {query}

Rules:
- Use Indian number format (₹, lakh, crore)
- Reference industry standards (CFP, AMFI, SEBI) where relevant
- Provide specific numbers from the user's data
- Include a disclaimer: "This is for educational purposes only"
```

---

## 7. Data Integration Sources

### 7.1 Integration Priority & Method

| # | Source | Method | Auth | License Needed | Effort |
|---|---|---|---|---|---|
| P0 | Manual entry | Built-in UI | None | None | ✅ Done |
| P1 | CSV/XLSX import | File upload | None | None | ✅ Done |
| P2 | GPay Takeout (HTML/ZIP) | Parser | Google OAuth | None | ✅ Done |
| P3 | Bank statement CSV | Manual download → upload | None | None | ~2 weeks |
| P4 | Receipt OCR | Tesseract.js camera | None | None | ~2 weeks |
| P5 | MF Central (PAN) | CAMS/KFin API | PAN + OTP | None | ~1 week |
| P6 | Broker API (Zerodha) | Kite Connect | OAuth | None (dev account) | ~2 weeks |
| P7 | Broker API (Groww) | API | OAuth | None | ~2 weeks |
| P8 | Account Aggregator | Finvu / Sahamati API | AA consent | Registered entity | ~3 weeks |
| P9 | CDSL/NSDL eCAS | PDF parser | CAS password | None | ~1 week |

### 7.2 Account Aggregator (AA) Integration

**MyMoney role**: Financial Information User (FIU)

**Requirements to become FIU**:
- Registered entity (proprietorship, LLP, or Pvt Ltd)
- FIU agreement with AA (Finvu or Sahamati — takes days)
- Technical integration with AA API
- Host on Indian servers

**User flow**:
1. User clicks "Link Bank Account" in MyMoney
2. MyMoney redirects to AA consent dashboard (Finvu's UI)
3. User selects which accounts/data to share, duration, purpose
4. User authenticates via their bank's OTP/bio
5. AA sends consent token to MyMoney
6. MyMoney uses token to fetch data from FIP (bank, MF, etc.)
7. Data encrypted and stored
8. User can revoke consent anytime

**Data accessible via AA**: Bank accounts, MFs, insurance, NPS, EPF, stocks (growing list)

---

## 8. Industry Standards & Regulatory Compliance

### 8.1 Standards Referenced

| Standard | Body | Application in MyMoney |
|---|---|---|
| **Financial Planning Standards** | CFP Board | Goal planning, retirement calc, emergency fund, insurance gap |
| **Risk Profiling Framework** | SEBI (RIA Regulations) | Risk questionnaire, asset allocation targets |
| **Mutual Fund Data Standards** | AMFI / Morningstar | Fund categories, returns, expense ratios |
| **Benchmark Indices** | NSE / BSE | Portfolio vs Nifty 50 / Sensex / Nifty 500 comparison |
| **Risk-Free Rate** | RBI G-Sec | Sharpe ratio calculation |
| **Credit Ratings** | CRISIL / ICRA | Fixed income quality assessment |
| **Insurance Regulations** | IRDAI | Insurance coverage adequacy guidelines |
| **Data Privacy** | DPDP Act 2023 | User consent, right to erasure, data localization |
| **Information Security** | ISO 27001 (target) | Security controls, audit trails |
| **Service Organization Controls** | SOC 2 (target) | SaaS security for enterprise customers |

### 8.2 Regulatory Compliance Path

| Phase | Action | Timeline |
|---|---|---|
| **Phase 0** | No charging, no AA → no license needed | Now |
| **Phase 1** | Register sole proprietorship for accepting payments | When ready to monetize |
| **Phase 2** | Convert to LLP/Pvt Ltd → register as FIU with AA | Before AA integration |
| **Phase 3** | GST registration (if revenue > ₹20L) | Year 2+ |
| **Phase 4** | ISO 27001 certification | Enterprise customers |
| **Phase 5** | SOC 2 Type II | Global enterprise customers |

### 8.3 What We Can Say vs What Needs License

| ✅ Safe (Educational Analytics) | ❌ Needs License (Regulated Advice) |
|---|---|
| "Your emergency fund covers 2 months. Target: 6 months." | "Buy this insurance policy now." |
| "Your portfolio XIRR is 12.3% vs Nifty 500 at 14.1%" | "Sell Fund A and buy Fund B." |
| "Your 80C utilization is 60% (₹90K of ₹1.5L)" | "Invest in these specific tax-saving bonds." |
| "You need ₹15K/month SIP to reach your goal of ₹1Cr" | "This stock will give 20% returns next year." |
| "Top-performing large-cap funds this year (AMFI data)" | "Switch to this fund for better returns." |
| CFP standards say your retirement corpus should be 25× expenses" | "You should retire at 55." |

---

## 9. Monetization & Feature Flags

### 9.1 Product Catalog (Feature Flags)

Admin can enable/disable per profile via `FeatureFlag` model:

| Flag Key | Free | Premium (₹499/mo) | Enterprise |
|---|---|---|---|
| `multi_profile` | 1 profile | 5 profiles | Unlimited |
| `ai_advisor` | Monthly score | Real-time + recs | Unlimited + custom |
| `llm_chatbot` | 5 queries/mo | Unlimited | Unlimited |
| `bank_import` | Manual | Auto-parse | All formats |
| `aa_integration` | ❌ | ✅ | ✅ |
| `investment_tracking` | ❌ | ✅ | ✅ |
| `portfolio_xirr` | ❌ | ✅ | ✅ |
| `what_if_simulator` | ❌ | ✅ | ✅ |
| `pdf_reports` | Basic | Detailed | Weekly |
| `tax_optimizer` | ❌ | ✅ | ✅ |
| `admin_console` | ❌ | ❌ | ✅ |
| `audit_log` | ❌ | ❌ | ✅ |
| `dedicated_support` | ❌ | ❌ | ✅ |

### 9.2 Feature Entitlement Model — How It Works

Industry operates on **3 models**: static tiers (most SaaS), feature flags/entitlements (enterprise SaaS), or hybrid (tiers + add-ons). MyMoney uses the **hybrid model**.

#### Feature Resolution Logic

```typescript
// At runtime, every feature check goes through this:

function isFeatureEnabled(profile: Profile, featureKey: string): boolean {
  // 1. Check explicit flag override first (admin can set this)
  const flag = await prisma.featureFlag.findUnique({
    where: {
      profileId_featureKey: {
        profileId: profile.id,
        featureKey,
      },
    },
  })
  if (flag) return flag.isEnabled

  // 2. Fall back to tier default
  return TIER_DEFAULTS[profile.tier]?.includes(featureKey) ?? false
}

const TIER_DEFAULTS: Record<ProfileTier, string[]> = {
  FREE: [
    "expense_tracking",
    "basic_reports",
    "manual_import",
    "single_profile",
  ],
  PREMIUM: [
    "expense_tracking",
    "budget_management",
    "goal_planning",
    "investment_tracking",
    "insurance_tracking",
    "net_worth",
    "basic_reports",
    "advanced_reports",
    "pdf_export",
    "xlsx_export",
    "bank_import",
    "ai_advisor",
    "llm_chatbot",
    "what_if_simulator",
    "tax_optimizer",
    "portfolio_xirr",
    "portfolio_rebalancing",
    "risk_profiling",
    "insurance_gap",
    "retirement_planner",
    "multi_profile_5",
    "onboarding_wizard",
    "export_data",
  ],
  ENTERPRISE: ["*"], // all features enabled
}
```

#### How Admin Manages This

| Action | Method |
|---|---|
| **Change tier** | Admin updates `profile.tier` → user gets that tier's defaults |
| **Override a feature** | Admin creates/updates `FeatureFlag` row for that profile + feature |
| **Trial a premium feature** | Admin sets `feature_flag.isEnabled = true` on a FREE profile |
| **Revoke access** | Admin deletes the flag row or sets `isEnabled = false` |
| **Subscription upgrade** | Payment webhook → updates `profile.tier` → all defaults change |

#### Data Model (Already in Schema)

```prisma
model FeatureFlag {
  id          Int      @id @default(autoincrement())
  profileId   Int
  profile     Profile  @relation(fields: [profileId], references: [id])
  featureKey  String   // "ai_advisor", "bank_import", "aa_integration", etc.
  isEnabled   Boolean  @default(false)
  updatedAt   DateTime @updatedAt

  @@unique([profileId, featureKey])
}
```

#### Admin Console Views

```
┌─────────────────────────────────────────────────────────────┐
│  ADMIN CONSOLE                                              │
├─────────────────────────────────────────────────────────────┤
│  Profiles ────→ [Search by name/email...]                   │
├─────────────────────────────────────────────────────────────┤
│  Profile: John's Family  │  Tier: PREMIUM  │ [Change]      │
│  ┌─────────────────────────────────────────────────────────┐│
│  │ Feature                    │ Status    │ Override       ││
│  ├─────────────────────────────────────────────────────────┤│
│  │ ai_advisor                 │ ✅ On     │ [Disable]      ││
│  │ llm_chatbot                │ ✅ On     │ [Disable]      ││
│  │ aa_integration             │ ❌ Off    │ [Enable]       ││
│  │ bank_import                │ ✅ On     │ [Disable]      ││
│  │ portfolio_rebalancing      │ ✅ On     │ [Disable]      ││
│  │ ...                        │           │                ││
│  └─────────────────────────────────────────────────────────┘│
│                                                             │
│  [Save Changes]                                             │
└─────────────────────────────────────────────────────────────┘
```

#### Subscription → Feature Mapping

```
User buys Premium on Stripe
         ↓
Stripe webhook POST /api/webhooks/stripe
         ↓
Verify signature, find profile by email
         ↓
Update profile.tier = "PREMIUM"
         ↓
All TIER_DEFAULTS[PREMIUM] now active
         ↓
Optionally: send welcome email with feature list
```

#### What You Need at Each Stage

| Stage | What to Build | Company Needed? |
|---|---|---|
| **Now** | `FeatureFlag` model + resolution logic + admin console | ❌ No |
| **Family sharing** | Manually toggle features for your family via admin | ❌ No |
| **First paying customer** | Stripe integration + webhook | ✅ Sole proprietorship |
| **Enterprise** | Custom pricing, negotiated per-deal | ✅ LLP/Pvt Ltd |

### 9.3 Subscription & Payment

- **Free tier**: Core expense tracking, basic reports, 1 profile
- **Premium**: ₹499/month or ₹4,999/year — all features except enterprise
- **Enterprise**: Custom pricing — includes multi-user, AA, admin, support
- **Family plan**: ₹799/month — up to 5 profiles with shared dashboard
- **Payment**: Stripe / Razorpay integration (future)

---

## 10. Onboarding Flow

### New User Steps

```
Step 1 ──── Create Account
           Email/Google signup → Verify email → Create first profile

Step 2 ──── Initial Setup
           Select profile type (individual / family / business)
           Set currency (INR) and locale (en-IN)
           Complete risk profiling questionnaire (10 questions)

Step 3 ──── Add Data Sources
           ┌────────────────────────────────────────────────┐
           │   □ Manual entry (start typing expenses)        │
           │   □ Import from file (CSV, XLSX, GPay)         │
           │   □ Link bank account (Account Aggregator)     │
           │   □ Link broker (Zerodha, Groww)               │
           │   □ Import mutual funds via PAN                │
           │   □ Skip for now                               │
           └────────────────────────────────────────────────┘

Step 4 ──── Set Goals
           ┌────────────────────────────────────────────────┐
           │   What are your financial goals?                │
           │   □ Emergency fund (recommended)                │
           │   □ Retirement                                 │
           │   □ Children's education                        │
           │   □ Buy a house                                │
           │   □ Vacation                                   │
           │   □ Custom goal                                │
           └────────────────────────────────────────────────┘

Step 5 ──── Dashboard & First Insights
           Your Financial Health Score: XX/100
           Top recommendation: ...
           View full report →

Step 6 ──── Done → Redirect to Dashboard
```

---

## 11. Page Differentiation

### Dashboard (`/`)
| Component | Data Source | Purpose |
|---|---|---|
| KPI cards (4) | `/api/insights` | Total expenses, this month vs budget, total investments, active goals |
| Monthly spending trend | AreaChart | Last 12 months trend |
| Yearly spending trend | BarChart | Year-over-year comparison (NEW) |
| Category breakdown | PieChart (donut) | Top categories this period |
| Recent expenses | List | Last 5 expenses |
| Financial Health Score | Gauge | Quick health overview (NEW) |

### Insights (`/insights`)
| Component | Data Source | Purpose |
|---|---|---|
| Filters (year/month/quarter) | User selection | Period selection |
| YoY comparison table | `/api/insights/deep` | Category | Prev Year | Current Year | Change ₹ | Change % | Trend |
| Category pie + % + count | Recharts Pie | With drill-down to sub-categories |
| Category change indicator | Badge | ↑ 12% / ↓ 5% vs previous period |
| Person-wise spending | List | Split by person |
| Top merchants | List | Ranked by total spend |
| Spend optimization | Cards | Suggestions based on overspend categories |
| Portfolio XIRR | Number + chart | Investment performance |
| Financial Health Score | Detailed breakdown | All 6 pillars with scores |

### Reports (`/reports`)
| Component | Data Source | Purpose |
|---|---|---|
| Tabs | — | Overview, Expenses, Investments, Goals & Plans |
| Overview tab | `/api/insights` | Summary KPI cards |
| Category pie + % + count | Recharts Pie | Same as insights but in reports |
| Recurrence type report | Table | Monthly / One-time / Yearly / Quarterly split |
| Tabular data view | Table | Sortable, filterable expense table |
| Export XLSX | `/api/export` | Per section export |
| Export PDF | jsPDF + autoTable | Full report with charts |

---

## 12. UI/UX Standards

| Element | Standard |
|---|---|
| **Date format** | `dd-mm-yyyy` (everywhere — done) |
| **Number format** | `en-IN` locale (₹1,23,456.78) |
| **Currency symbol** | ₹ (INR) |
| **Chart tooltips** | en-IN formatted numbers |
| **Layout** | Responsive, PWA-ready |
| **Font** | System font stack |
| **Theme** | Dark/Light via `next-themes` (already installed) |
| **Mobile** | Touch-friendly, collapsible sidebar |

### Multi-Select Filter Component

```
┌─────────────────────────────────────┐
│ [▼] Vendor (3 selected)    [✕]    │
├─────────────────────────────────────┤
│  ☑ Select All                       │
│  ☐ (Blank)                          │
│  ☑ Big Bazaar                       │
│  ☐ D-Mart                           │
│  ☑ Amazon                           │
│  ☐ Flipkart                         │
│  ─────────────────────              │
│  Contains: [______________] [≡]     │
│  Does Not Contain: [________] [≡]  │
└─────────────────────────────────────┘
```

---

## 13. UI Excellence Roadmap

### 13.1 Current State Assessment

The app currently uses a **functional but basic UI** — tables with small text, no animations, default shadcn styling, and cramped filter rows. The tech stack has good foundations (shadcn/ui, Radix, Tailwind, Recharts, lucide-react) but they are used minimally.

#### What We Have (Good Foundation)

| Tool | Status | Purpose |
|---|---|---|
| **shadcn/ui** | ✅ Already used | Accessible components |
| **Tailwind CSS v3** | ✅ Already used | Utility-first styling |
| **Radix UI** | ✅ Already used | Headless primitives (dropdowns, dialogs, selects) |
| **Recharts** | ✅ Already used | Charts |
| **lucide-react** | ✅ Already used | Icons |
| **next-themes** | ✅ Already used | Dark/light mode |
| **tailwindcss-animate** | ✅ Already used | Animation utilities |

#### What's Missing

| Tool | Purpose | Impact |
|---|---|---|
| **Motion (Framer Motion)** | Page transitions, micro-interactions, layout animations, number counters | Makes UI feel alive — highest impact per effort |
| **Geist font (or Inter)** | Premium modern typeface | Elevates perceived quality 10x — zero code risk |
| **Tailwind CSS v4** | New CSS-first config, container queries, cascade layers | Better DX, more powerful styling |
| **shadcn Data Table** | Built-in sorted/filterable/responsive table (exists in library, unused) | Replaces hand-rolled tables |

#### Specific Issues Found in Code

| Issue | Location | Current | Desired |
|---|---|---|---|
| **No page transitions** | App layout | Hard page cuts | Framer Motion AnimatePresence between routes |
| **No animations** | All pages | Instant render | Card entrance, chart animate, number counters |
| **Dense table layout** | Expenses, merchants | `<table>` with `h-6` rows, `9px` text | Proper spacing or card grid |
| **Filter row crammed in table header** | Expenses | `text-[10px]` select/input in h-6 cells | Separate filter bar above table |
| **No visual hierarchy** | All pages | Flat data, no progressive disclosure | Summary cards → charts → detail table |
| **Basic cards** | All pages | Default border + padding | Subtle shadows, glassmorphism (dark), hover effects |
| **Plain buttons** | Many places | Default shadcn buttons | Gradient, soft shadows, hover scale |
| **No skeletons** | All pages | Spinner only | Content-shaped skeleton placeholders |
| **Static charts** | Dashboard, Insights | Instant draw | Animated entrance, hover tooltip motion |
| **No number counters** | KPI cards, amounts | Static number display | Count-up animation on scroll/view |

### 13.2 Target Stack

```
Layer          Technology
────────────────────────────────────────────────
Font:          Geist (Vercel) — npm install geist
Animations:    Motion (Framer Motion) v12 — npm install motion
CSS:           Tailwind CSS v4 — upgrade from v3
Components:    shadcn/ui (latest) + shadcn Data Table
Charts:        Recharts + custom theme with en-IN tooltips
Icons:         lucide-react (already have)
```

### 13.3 Implementation Order (Highest Impact First)

| Step | What | Effort | Cost |
|---|---|---|---|
| **1** | Install **Geist font** + apply globally | 1 hr | Free |
| **2** | Install **Motion** + add page transitions (AnimatePresence) | 4 hrs | Free |
| **3** | Add **card entrance animations** + hover effects | 4 hrs | Free |
| **4** | Add **animated number counters** on KPI cards | 2 hrs | Free |
| **5** | Add **skeleton loading states** instead of spinners | 4 hrs | Free |
| **6** | Extract **filter bar** from table header to separate area | 6 hrs | Free |
| **7** | Replace tables with **shadcn Data Table** (sort, filter, responsive) | 8 hrs | Free |
| **8** | Add **chart animations** (entrance + tooltip) | 3 hrs | Free |
| **9** | Upgrade to **Tailwind CSS v4** | 4 hrs | Free |
| **10** | **Per-page visual polish** — spacing, shadows, dark mode | 16 hrs | Free |

**Total UI effort**: ~2.5 days (can be done incrementally)

---

## 14. Deployment & Platform

| Component | Tech | Status |
|---|---|---|
| **Frontend** | Next.js 15 + React 19 | ✅ Existing |
| **Backend** | Next.js API routes | ✅ Existing |
| **Database** | PostgreSQL (from SQLite) | 📝 Planned |
| **ORM** | Prisma 6 | ✅ Existing |
| **Auth** | NextAuth.js v5 (Google + Email) | 📝 Planned |
| **PWA** | Service worker + manifest | 📝 Planned |
| **Docker** | Dockerfile + docker-compose | 📝 Planned |
| **Hosting** | Self-hosted / VPS (₹500-₹1000/mo) | 📝 Planned |
| **Indian servers** | AWS Mumbai / Azure Central India | 📝 Planned |
| **SSL** | Let's Encrypt / Caddy | 📝 Planned |
| **Backup** | Automated pg_dump to S3 | 📝 Planned |

---

## 15. Implementation Phases

> **Legend**: ✅ Done · ⬜ Pending · 🔄 In Progress · ❌ Blocked

### Phase P0 — Immediate Bug Fixes & Enhancements
```
Items already completed in current session
```

| # | Item | Status |
|---|---|---|
| P0.1 | Date format dd-mm-yyyy everywhere | ✅ |
| P0.2 | Date filter preset + Custom option | ✅ |
| P0.3 | Category text entry + dropdown (input+datalist) | ✅ |
| P0.4 | Merchants last updated timestamp | ✅ |
| P0.5 | GPay import preview page | ✅ |
| P0.6 | Drive import preview inside DriveDialog | ✅ |
| P0.7 | Blank vendor support in HTML parser | ✅ |
| P0.8 | Skip dedup when vendor is blank | ✅ |
| P0.9 | Vendor filter as scrollable select + Blank option | ✅ |
| P0.10 | Import session refetch after import | ✅ |
| P0.11 | Error display (red for errors, green for success) | ✅ |
| P0.12 | Import result card shows error details | ✅ |
| P0.13 | DESIGN.md created with full product plan | ✅ |

### Phase P1 — UI Excellence (Visual Polish)
```
Foundation for a premium, futuristic feel — ✅ All Done
```

| # | Item | Depends On | Est. | Status |
|---|---|---|---|---|
| P1.1 | Install **Geist font** + apply globally | — | 1 hr | ✅ |
| P1.2 | Install **Motion (Framer Motion)** v12 | — | 1 hr | ✅ |
| P1.3 | Add page transitions (AnimatePresence in layout) | P1.2 | 4 hrs | ✅ |
| P1.4 | Add card entrance animations + hover effects | P1.2 | 4 hrs | ✅ |
| P1.5 | Add animated number counters on KPI/dashboard cards | P1.2 | 2 hrs | ✅ |
| P1.6 | Add skeleton loading states (replace spinners) | — | 4 hrs | ✅ |
| P1.7 | Extract filter bar from table header to separate area | — | 6 hrs | ✅ |
| P1.8 | Replace `<table>` with shadcn Data Table (sortable, filterable) | — | 8 hrs | ✅ |
| P1.9 | Add chart entrance + tooltip animations | P1.2 | 3 hrs | ✅ |
| P1.10 | Upgrade Tailwind CSS v3 → v4 | — | 4 hrs | ✅ |
| P1.11 | Per-page visual polish (cards, shadows, dark mode glassmorphism) | — | 16 hrs | ✅ |

### Phase P2 — Multi-Profile & Auth
```
User identity, profile isolation, and database upgrade — ✅ All Done (SQLite→PG pending)
```

| # | Item | Depends On | Est. | Status |
|---|---|---|---|---|
| P2.1 | Add User + Profile + FeatureFlag + AuditLog models to Prisma | — | 4 hrs | ✅ |
| P2.2 | Run SQLite → PostgreSQL migration | — | 8 hrs | ⬜ |
| P2.3 | Implement NextAuth.js v5 with Google + Email | — | 8 hrs | ✅ |
| P2.4 | Add profileId FK to all existing tables | P2.1 | 4 hrs | ✅ |
| P2.5 | Add middleware for route protection | P2.3 | 2 hrs | ✅ |
| P2.6 | Add profile switcher UI in app shell header | P2.1 | 4 hrs | ✅ |
| P2.7 | Data migration script (existing data → first profile) | P2.1 | 2 hrs | ✅ |
| P2.8 | Admin console — user/profile management | P2.1 | 8 hrs | ✅ |

### Phase P3 — Multi-Select Filters
```
Checkbox-based filter system across all pages — ✅ All Done
```

| # | Item | Depends On | Est. | Status |
|---|---|---|---|---|
| P3.1 | Build custom multi-select dropdown component (checkboxes + select all) | — | 6 hrs | ✅ |
| P3.2 | Apply multi-select to Vendor filter | P3.1 | 2 hrs | ✅ |
| P3.3 | Apply multi-select to Category filter | P3.1 | 2 hrs | ✅ |
| P3.4 | Apply multi-select to Person, Mode, Bank, Sub Cat, Type filters | P3.1 | 4 hrs | ✅ |
| P3.5 | Add (Blank) option to every filter dropdown | — | 1 hr | ✅ |
| P3.6 | Add Contains / Does Not Contain toggle for text filters | — | 4 hrs | ✅ |
| P3.7 | Update API to accept array filter params | — | 4 hrs | ✅ |

### Phase P4 — Dashboard & Insights Enhancements
```
Better visualization, YoY comparison, category analysis — ✅ All Done
```

| # | Item | Depends On | Est. | Status |
|---|---|---|---|---|
| P4.1 | Add "All Years" filter option on Dashboard | — | 2 hrs | ✅ |
| P4.2 | Add yearly spending trend chart below monthly chart | — | 4 hrs | ✅ |
| P4.3 | Apply en-IN locale to all Recharts tooltips/labels | — | 3 hrs | ✅ |
| P4.4 | Add year/month/quarter filter component on Insights | — | 3 hrs | ✅ |
| P4.5 | Build category YoY comparison table (API + UI) | — | 8 hrs | ✅ |
| P4.6 | Add category pie chart with % and count for selected period | — | 4 hrs | ✅ |
| P4.7 | Add category change indicator (↑/↓ %) | — | 2 hrs | ✅ |
| P4.8 | Spend optimization suggestion cards | — | 4 hrs | ✅ |
| P4.9 | Financial Health Score gauge on Dashboard | — | 4 hrs | ✅ |

### Phase P5 — Reports & Export
```
Tabular data, recurrence type report, export improvements — ✅ All Done
```

| # | Item | Depends On | Est. | Status |
|---|---|---|---|---|
| P5.1 | Tabular data view with sort/filter | P1.8 | 4 hrs | ✅ |
| P5.2 | Recurrence type report (monthly/onetime/yearly/quarterly) | — | 6 hrs | ✅ |
| P5.3 | Category pie with % + count on Reports page | — | 3 hrs | ✅ |
| P5.4 | Enhanced XLSX export with category-wise tabs | — | 4 hrs | ✅ |
| P5.5 | Enhanced PDF report with charts | — | 6 hrs | ✅ |
| P5.6 | en-IN locale on all report numbers | — | 1 hr | ✅ |

### Phase P6 — AI Financial Advisor
```
Health score, recommendations engine, risk profiling — ✅ All Done
```

| # | Item | Depends On | Est. | Status |
|---|---|---|---|---|
| P6.1 | Financial Health Score calculation engine | P2.1 (profile data) | 8 hrs | ✅ |
| P6.2 | Risk profiling questionnaire (SEBI standard 10-Q) | — | 4 hrs | ✅ |
| P6.3 | Recommendation engine (CFP-based rules) | P6.1 | 8 hrs | ✅ |
| P6.4 | Gap analysis (emergency fund, insurance, tax, debt) | P6.1 | 6 hrs | ✅ |
| P6.5 | What-if simulator scenarios | P6.1 | 8 hrs | ✅ |
| P6.6 | Monthly financial health PDF report | P6.1 | 6 hrs | ✅ |
| P6.7 | Financial Health Dashboard page/section | P6.1 | 6 hrs | ✅ |

### Phase P7 — LLM Chatbot
```
Natural language queries, projections, insights — ✅ All Done
```

| # | Item | Depends On | Est. | Status |
|---|---|---|---|---|
| P7.1 | Build chat API route (POST /api/chat) | — | 4 hrs | ✅ |
| P7.2 | Integrate OpenAI/Claude API | — | 2 hrs | ✅ |
| P7.3 | Build prompt builder with user data context | P7.1 | 4 hrs | ✅ |
| P7.4 | Build floating chat UI component | — | 6 hrs | ✅ |
| P7.5 | Pre-built query templates (20+ queries) | P7.3 | 4 hrs | ✅ |
| P7.6 | Response formatter (en-IN numbers, clean markdown) | P7.1 | 2 hrs | ✅ |

### Phase P8 — Data Integrations
```
Bank import, OCR, broker APIs, MF Central — ✅ All Done
```

| # | Item | Depends On | Est. | Status |
|---|---|---|---|---|
| P8.1 | Bank statement CSV parser (standard formats) | P2.1 | 8 hrs | ✅ |
| P8.2 | Bank PDF statement parser (HDFC, ICICI, SBI) | — | 8 hrs | ✅ |
| P8.3 | Receipt OCR with Tesseract.js (existing dep) | — | 8 hrs | ✅ |
| P8.4 | Zerodha Kite API integration | — | 8 hrs | ✅ |
| P8.5 | Groww API integration | — | 8 hrs | ✅ |
| P8.6 | MF Central (CAMS/KFin) via PAN | — | 6 hrs | ✅ |
| P8.7 | CDSL/NSDL eCAS PDF parser | — | 4 hrs | ✅ |

### Phase P9 — Account Aggregator
```
Finvu/Sahamati AA integration for bank/MF/insurance data — ❌ Blocked
```
*Requires registered company entity (LLP/Pvt Ltd)*

| # | Item | Depends On | Est. | Status |
|---|---|---|---|---|
| P9.1 | Register as FIU with AA provider | P2.3 | 1 week legal | ❌ |
| P9.2 | Implement AA consent flow UI | — | 8 hrs | ❌ |
| P9.3 | Implement AA data fetch API | — | 8 hrs | ❌ |
| P9.4 | Map AA data to MyMoney models | P2.1 | 6 hrs | ❌ |
| P9.5 | Consent management dashboard for user | — | 4 hrs | ❌ |

### Phase P10 — Admin Console & Onboarding
```
Feature flags, user management, guided setup — ✅ Complete
```

| # | Item | Depends On | Est. | Status |
|---|---|---|---|---|
| P10.1 | Admin console — user/profile list | P2.1 | 6 hrs | ✅ |
| P10.2 | Admin console — feature flag toggles | P2.1 | 4 hrs | ✅ |
| P10.3 | Admin console — tier change + audit log view | P2.1 | 4 hrs | ✅ |
| P10.4 | Onboarding wizard (Step 1-6 flow) | P2.1 | 8 hrs | ✅ |
| P10.5 | Welcome email + first-time tutorial | — | 4 hrs | ✅ |

### Phase P11 — Enterprise Readiness
```
PWA, Docker, hosting, audit, RBAC — ✅ All Done
```

| # | Item | Depends On | Est. | Status |
|---|---|---|---|---|
| P11.1 | PWA (service worker, manifest, offline page) | — | 6 hrs | ✅ |
| P11.2 | Dockerfile + docker-compose | — | 4 hrs | ✅ |
| P11.3 | Docker-based backup (pg_dump to S3) | P11.2 | 2 hrs | ✅ |
| P11.4 | SSL + domain setup | — | 2 hrs | ✅ |
| P11.5 | Hosting setup (AWS Mumbai VPS) | — | 4 hrs | ⬜ |
| P11.6 | Role-based access (Admin/Manager/Viewer) | P2.1 | 6 hrs | ✅ |
| P11.7 | Audit log viewer UI | — | 4 hrs | ✅ |
| P11.8 | Rate limiting + security hardening | — | 4 hrs | ✅ |

### Phase Completion Summary

| Phase | Description | Status |
|---|---|---|
| P0 | Bug fixes & enhancements | ✅ Complete |
| P1 | UI Excellence (Geist font, Motion, animations, DataTable) | ✅ Complete |
| P2 | Multi-Profile & Auth (NextAuth, profiles, middleware) | ✅ Complete (SQLite→PG pending) |
| P3 | Multi-Select Filters | ✅ Complete |
| P4 | Dashboard & Insights Enhancements | ✅ Complete |
| P5 | Reports & Export (tabular, recurrence, PDF/XLSX) | ✅ Complete |
| P6 | AI Financial Advisor (health score, risk profiling, what-if) | ✅ Complete |
| P7 | LLM Chatbot (floating chat, prompt builder, templates) | ✅ Complete |
| P8 | Data Integrations (bank CSV/PDF, OCR, Zerodha, Groww, MF) | ✅ Complete |
| P9 | Account Aggregator (Finvu/Sahamati) | ❌ Blocked (needs company) |
| P10 | Admin Console & Onboarding (feature flags, wizard) | ✅ Complete |
| P11 | Enterprise Readiness (PWA, Docker, RBAC, audit, rate limiting) | ✅ Complete (hosting pending) |

### Phase Priority Map (Dependency Order)

```
P1 (UI Polish)
  │
  ▼
P2 (Multi-Profile & Auth) ───── P3 (Filters) ───── P4 (Dashboard/Insights)
  │                                                       │
  ▼                                                       ▼
P10 (Admin Console)                                 P5 (Reports) ───── P6 (AI Advisor)
                                                              │              │
                                                              ▼              ▼
                                                         P8 (Integrations) P7 (Chatbot)
                                                              │
                                                              ▼
                                                         P9 (AA Integration) ─── needs company
                                                              │
                                                              ▼
                                                         P11 (Enterprise)
```

---

## 16. Security & Privacy

| Requirement | Implementation |
|---|---|
| **Encryption at rest** | AES-256 |
| **Encryption in transit** | TLS 1.3 |
| **Data localization** | Indian servers only |
| **User consent** | Explicit for each data source |
| **Revocable access** | User can revoke any integration anytime |
| **Right to erasure** | Delete account → all data purged within 30 days |
| **Audit log** | Every financial data access logged |
| **No credential storage** | AA/broker integrations use OAuth — no passwords stored |
| **Session management** | HTTP-only cookies, short expiry, refresh tokens |
| **Rate limiting** | API rate limits to prevent abuse |
| **Input sanitization** | All user inputs validated via Zod |
| **CSRF protection** | Built-in Next.js CSRF |
| **Dependency scanning** | Regular npm audit |

---

## 17. Open Items / Decisions

| # | Question | Status | Notes |
|---|---|---|---|---|
| 1 | SQLite → PostgreSQL migration timing | ⬜ Pending | Schema uses SQLite locally; PG needed for production |
| 2 | NextAuth vs custom auth | ✅ Resolved | NextAuth.js v5 implemented (Google + Email + Credentials) |
| 3 | OpenAI vs Claude for chatbot | ⬜ Pending | Code supports both via `LLM_PROVIDER` env var |
| 4 | Finvu vs Sahamati for AA partnership | ❌ Blocked | Needs registered company entity |
| 5 | Pricing for premium tiers | ⬜ Pending | Defined in §9.3, stripe integration not yet built |
| 6 | Self-hosted vs cloud-first deployment | ⬜ Pending | Docker ready, hosting setup pending (P11.5) |
| 7 | Plugin architecture for integrations | ⬜ Pending | Not started |

---

## 18. Feature Flag Catalog (Complete)

> Admin toggles these per profile to enable/disable features based on subscription tier.

```
[ ] multi_profile          — Multiple profiles per account
[ ] expense_tracking       — Core expense CRUD
[ ] budget_management      — Budget creation & tracking
[ ] goal_planning           — Goal setting & progress
[ ] investment_tracking    — Investment portfolio
[ ] insurance_tracking     — Insurance policies
[ ] net_worth              — Net worth calculation
[ ] basic_reports          — Basic expense reports
[ ] advanced_reports       — YoY comparison, recurrence report
[ ] pdf_export             — PDF report generation
[ ] xlsx_export            — XLSX export
[ ] bank_import            — Bank CSV/XLSX import
[ ] bank_pdf_parser        — Bank PDF statement parser
[ ] receipt_ocr            — Receipt scanning via OCR
[ ] broker_zerodha         — Zerodha portfolio sync
[ ] broker_groww           — Groww portfolio sync
[ ] mf_central            — Mutual fund sync via PAN
[ ] aa_integration        — Account Aggregator (Finvu)
[ ] ai_advisor            — Financial health score + recommendations
[ ] llm_chatbot           — AI chatbot queries
[ ] what_if_simulator     — Scenario analysis
[ ] tax_optimizer         — Tax saving recommendations
[ ] portfolio_xirr        — Portfolio return calculation
[ ] portfolio_rebalancing — Allocation drift alerts
[ ] risk_profiling        — Risk assessment questionnaire
[ ] insurance_gap         — Insurance coverage analysis
[ ] retirement_planner    — Detailed retirement projections
[ ] estate_planning       — Estate & succession planning
[ ] multi_family_dashboard— Combined family view
[ ] admin_console         — Admin user management
[ ] audit_log             — Data access audit trail
[ ] onboarding_wizard     — Guided setup flow
[ ] export_data           — Full data export
[ ] import_data           — Data import from other apps
```

---

---

## 20. Development Process Reference

This design document is paired with a **process document** that defines how each feature is built, reviewed, merged, and tracked:

| Document | Location | Purpose |
|---|---|---|
| **AgenticProductProcess.md** | `./AgenticProductProcess.md` | Full lifecycle: design → branch → implement → gate → walkthrough → merge. Agent architecture, branching strategy, quality gates, E2E testing strategy. |
| **Development Monitor Dashboard** | `dev-dashboard/` (standalone, not part of MyMoney app) | Real-time dashboard showing phase progress, live activity feed, gate results. Run: `node dev-dashboard/server.js` |

### How These Relate

```
AgenticProductProcess.md defines the PROCESS (how we build)
                ↓
DESIGN.md defines the PRODUCT (what we build)
                ↓
Dev Dashboard shows the PROGRESS (what's happening now)
```

### Quick Start

```
1. Start dashboard:   node dev-dashboard/server.js
2. Open browser:      http://localhost:3099
3. Pick next phase:   From DESIGN.md §15 Implementation Phases
4. Follow process:    AgenticProductProcess.md §3 Module Lifecycle
```

---

## 21. Changelog

| Date | Author | Changes |
|---|---|---|
| 24-Jun-2026 | System | Initial design document — all discussions consolidated from planning session |
| 24-Jun-2026 | System | Added AgenticProductProcess.md reference + dev-dashboard in §20 |
| 03-Jul-2026 | System | Updated P1-P11 status with ✅/⬜/❌ markers. Added Subscription model (OTT/apps). Switched to SQLite for local dev. Added phase completion summary. |
| 03-Jul-2026 | System | Added Asset Management (properties, metals, equipment) with P&L tracking. Added stock portfolio view with symbol/qty/buy-price. Implemented welcome email via Resend. |
| 03-Jul-2026 | System | Added Sharekhan brokerage integration (OAuth, holdings import, portfolio sync). Created settings/integrations page. |
| 09-Jul-2026 | System | Consolidated into `PRODUCT-PLAN.md` — refer there for unified product plan. |
