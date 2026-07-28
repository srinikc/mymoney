import { Shield, BookOpen, Network, Workflow, Database, Lock } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

const sections = [
  {
    id: "overview",
    title: "Overview",
    icon: BookOpen,
    content: (
      <div className="space-y-4">
        <p>MyMoney is a comprehensive personal finance management platform that unifies income tracking, expense management, budgeting, investment portfolio management, goal planning, insurance tracking, loan management, tax computation, and net worth calculation into a single, integrated system.</p>
        <p>The platform follows a logical data flow: <strong>Income → Expenses → Budgets → Investments → Goals → Net Worth → Tax</strong>. Every module feeds into the others, creating a holistic view of your financial life.</p>
        <div className="rounded-lg border bg-muted/50 p-4">
          <h4 className="mb-2 font-semibold">Data Flow Architecture</h4>
          <div className="text-sm text-muted-foreground">
            Income Sources → Total Income → Budgets (income%) + Expenses (actuals) → Savings
            {"\n"}
            Savings → Investments + Goals → Portfolio Growth → Net Worth (Assets - Liabilities)
            {"\n"}
            All Income + Capital Gains → Tax Computation → ITR Filing
          </div>
        </div>
      </div>
    ),
  },
  {
    id: "getting-started",
    title: "Getting Started",
    icon: Shield,
    content: (
      <div className="space-y-4">
        <h3 className="font-semibold">Installation & Setup</h3>
        <div className="rounded-lg border bg-muted/50 p-4">
          <h4 className="mb-2 text-sm font-semibold">Docker (Recommended)</h4>
          <ol className="ml-4 list-decimal space-y-1 text-sm text-muted-foreground">
            <li>Clone the repository: <code>git clone &lt;repo-url&gt; &amp;&amp; cd mymoney</code></li>
            <li>Copy <code>.env.example</code> to <code>.env</code> and configure database URL, auth secret, and API keys</li>
            <li>Run <code>docker compose up -d</code> to start PostgreSQL + the app</li>
            <li>Run <code>npx prisma db seed</code> to seed default categories</li>
            <li>Access the app at <code>http://localhost:3005</code></li>
            <li>Complete the admin setup wizard on first visit</li>
          </ol>
        </div>

        <h3 className="font-semibold">Administrator Setup</h3>
        <p>On first launch, the app redirects to the admin setup wizard. Create the administrator account with email <code>srinikc@gmail.com</code> (or your preferred email) and a secure password. This account has full administrative privileges including user management, feature flag control, and audit log access.</p>

        <h3 className="font-semibold">User Onboarding</h3>
        <p>After admin creates user accounts, first-time users go through a 6-step onboarding wizard:</p>
        <ol className="ml-4 list-decimal space-y-1 text-sm text-muted-foreground">
          <li><strong>Profile Setup</strong> — Set name, currency (INR/USD/EUR/GBP), default categories</li>
          <li><strong>Connect Bank</strong> — Upload bank statement CSV/PDF (optional, skippable)</li>
          <li><strong>Budgets</strong> — Set monthly spending limits for key categories</li>
          <li><strong>Goals</strong> — Define emergency fund target and savings goals</li>
          <li><strong>Risk Profile</strong> — Complete the 10-question risk assessment</li>
          <li><strong>Completion</strong> — Welcome notification + tutorial overlay on first dashboard</li>
        </ol>
      </div>
    ),
  },
  {
    id: "income-expenses",
    title: "Income & Expenses",
    icon: Database,
    content: (
      <div className="space-y-4">
        <h3 className="font-semibold">Income Sources</h3>
        <p>Income Sources tracks all revenue streams: Salary, Rental, FD Interest, Business, and Other. Each source can be monthly/yearly/one-time with auto-detection for GPay matching. Business income includes revenue, expenses, and profit tracking.</p>

        <h3 className="font-semibold">Expenses</h3>
        <p>The expense ledger supports full CRUD with filtering, sorting, pagination, and inline editing. Import via CSV/XLSX/PDF (OCR-based) or GPay Takeout. Auto-linking connects expenses to income sources (via merchant matching), investments (investment-categorised expenses), insurance policies, and loan EMIs.</p>

        <h3 className="font-semibold">Workflow: Monthly Financial Review</h3>
        <ol className="ml-4 list-decimal space-y-1 text-sm text-muted-foreground">
          <li>Log in to the Dashboard — review stat cards for income vs expenses</li>
          <li>Navigate to Income Sources to verify all income entries for the month</li>
          <li>Review Expenses — apply filters for the current month, check category breakdown</li>
          <li>Check Auto-Link for any suggested connections between expenses and other modules</li>
          <li>Run the Monthly Report from Reports → Export to XLSX for record-keeping</li>
        </ol>
      </div>
    ),
  },
  {
    id: "budgets-goals",
    title: "Budgets & Goals",
    icon: Network,
    content: (
      <div className="space-y-4">
        <h3 className="font-semibold">Budgets</h3>
        <p>Budgets are set per category per month. The page shows each budget as a percentage of total monthly income, alongside spent amount and utilisation. Colour-coded progress bars (green/yellow/red) indicate budget health. A monthly selector and yearly toggle provide flexible views.</p>

        <h3 className="font-semibold">Goals (merged with Plans)</h3>
        <p>Goals represent financial objectives with target amounts, deadlines, term (short/medium/long), and priority (P0/P1/P2). Investments can be linked to goals via the <code>linkedGoalId</code> field, creating a direct connection between savings vehicles and financial targets.</p>

        <h3 className="font-semibold">Workflow: Goal-Based Investing</h3>
        <ol className="ml-4 list-decimal space-y-1 text-sm text-muted-foreground">
          <li>Define a goal: &ldquo;Retire with ₹1 Crore&rdquo; — target ₹1,00,00,000, term: Long, priority: P1</li>
          <li>Add investments linked to this goal: PPF (safe returns), MF (growth), NPS (retirement)</li>
          <li>Track goal progress on Dashboard and Goals page — the combined investment value shows completion %</li>
          <li>Use What-If Simulator to model how increasing SIP contributions accelerates goal achievement</li>
          <li>Monitor tax implications: PPF and NPS contributions are deductible under Section 80C/80CCD</li>
        </ol>
      </div>
    ),
  },
  {
    id: "investments",
    title: "Investments & Assets",
    icon: Workflow,
    content: (
      <div className="space-y-4">
        <h3 className="font-semibold">Investments</h3>
        <p>Supports stocks, mutual funds, FD, PPF, NPS, gold, real estate, crypto, and bonds. Portfolio view with stock vs others tabs. XIRR calculation, benchmark comparison, and XLSX export. Integrates with Zerodha/Sharekhan/Groww/MF Central for auto-import.</p>

        <h3 className="font-semibold">Assets</h3>
        <p>Tracks physical assets separately: property, gold/silver, vehicles, equipment. Each asset has purchase price, current value, location, and P&L tracking. Assets feed into Net Worth alongside investments.</p>

        <h3 className="font-semibold">Workflow: Portfolio Rebalancing</h3>
        <ol className="ml-4 list-decimal space-y-1 text-sm text-muted-foreground">
          <li>Review current allocation in Investments — check diversification across asset types</li>
          <li>Compare XIRR against benchmarks for each asset class</li>
          <li>Check Health Score — the Investment pillar shows diversification gaps</li>
          <li>Use What-If Simulator to model rebalancing scenarios</li>
          <li>Execute changes and update investment records</li>
          <li>Verify Net Worth update reflects the changes</li>
        </ol>
      </div>
    ),
  },
  {
    id: "insurance-loans",
    title: "Insurance & Loans",
    icon: Shield,
    content: (
      <div className="space-y-4">
        <h3 className="font-semibold">Insurance</h3>
        <p>Manage health, term life, and motor insurance policies. Each policy stores provider, sum assured, premium, renewal date, and nominee. Renewal reminders auto-create in Reminders. Premiums are deductible under Section 80C/80D in Tax section.</p>

        <h3 className="font-semibold">Loans</h3>
        <p>Track home, car, vehicle, electronics, and equipment loans with principal, interest rate, tenure, EMI, and lender. Outstanding balances contribute to Net Worth liabilities. Home loan interest is deductible under Section 24(b).</p>

        <h3 className="font-semibold">Workflow: Insurance + Loan Optimisation</h3>
        <ol className="ml-4 list-decimal space-y-1 text-sm text-muted-foreground">
          <li>Add all insurance policies and loans to the system</li>
          <li>Verify auto-linking: insurance-categorised expenses link to policies; loan provider-matched expenses link to EMIs</li>
          <li>Check Reminders for upcoming renewals and EMI due dates</li>
          <li>At tax time, use the Tax section to claim Section 80C/80D deductions for insurance and Section 24(b) for home loan interest</li>
          <li>Monitor Debt-to-Income ratio in Health Score — if high, use What-If Simulator to model prepayment scenarios</li>
        </ol>
      </div>
    ),
  },
  {
    id: "tax",
    title: "Tax Management",
    icon: Database,
    content: (
      <div className="space-y-4">
        <h3 className="font-semibold">Tax Section (4 Tabs)</h3>
        <ul className="ml-4 list-disc space-y-1 text-sm text-muted-foreground">
          <li><strong>Income & Deductions</strong> — Auto-calculated Gross Total Income from all IncomeSources. Add deductions under 80C, 80D, HRA, NPS, Home Loan Interest. Compare Old vs New regime.</li>
          <li><strong>Documents</strong> — Upload encrypted PDFs: Form 16, Form 26AS, Form 10E, Capital Gains statements, Home Loan certificates, Rent Receipts, Donation Receipts.</li>
          <li><strong>ITR Filings</strong> — Track past and current assessment years with filing status, acknowledgment number, and refund tracking.</li>
          <li><strong>Projections</strong> — Current FY tax projection based on YTD income. Advance tax due dates (Jun 15, Sep 15, Dec 15, Mar 15). 80C/80D top-up suggestions.</li>
        </ul>

        <h3 className="font-semibold">Workflow: Tax Season</h3>
        <ol className="ml-4 list-decimal space-y-1 text-sm text-muted-foreground">
          <li>Ensure all IncomeSources are updated for the financial year</li>
          <li>Upload Form 16 and Form 26AS to Documents tab</li>
          <li>Verify auto-calculated Gross Total Income in Tab 1</li>
          <li>Add deductions: insurance premiums (80D), investments (80C), home loan interest (24(b))</li>
          <li>Compare Old vs New regime — choose the optimal one</li>
          <li>File ITR through the portal and record the acknowledgment in Tab 3</li>
          <li>Track refund status</li>
        </ol>
      </div>
    ),
  },
  {
    id: "net-worth",
    title: "Net Worth",
    icon: Database,
    content: (
      <div className="space-y-4">
        <h3 className="font-semibold">Complete Financial Picture</h3>
        <p>Net Worth = Total Assets (property, gold, silver, vehicles, equipment) + Total Investments (stocks, MF, FD, PPF, NPS, bonds, crypto) + Insurance surrender value + Business Profit - Total Liabilities (loan outstanding balances).</p>
        <p>This is the single most important financial metric. Every module feeds into it. Tracking Net Worth over time shows whether you are building wealth or losing ground.</p>

        <h3 className="font-semibold">Workflow: Quarterly Net Worth Review</h3>
        <ol className="ml-4 list-decimal space-y-1 text-sm text-muted-foreground">
          <li>Update all asset current values to reflect market changes</li>
          <li>Update investment current values (or sync from Zerodha/Groww)</li>
          <li>Update loan outstanding balances</li>
          <li>Review Net Worth page — the difference between green (assets) and red (liabilities)</li>
          <li>Compare with previous quarter to track wealth growth</li>
          <li>Use What-If Simulator to project Net Worth trajectory</li>
        </ol>
      </div>
    ),
  },
  {
    id: "automation",
    title: "Automation & Integrations",
    icon: Workflow,
    content: (
      <div className="space-y-4">
        <h3 className="font-semibold">GPay Automation</h3>
        <p>One-click Google Takeout export via Playwright automation. The server logs into takeout.google.com, selects only Google Pay data, and delivers to Google Drive. The system polls for completion, downloads the export, and imports transactions.</p>

        <h3 className="font-semibold">Gmail Parsing</h3>
        <p>Read-only Gmail API integration scans your inbox for financial emails. Parses 8 types: UPI payments, bank transactions, salary credits, mutual fund transactions, stock trades, insurance premiums, subscription renewals, and tax documents. Each parser creates the appropriate MyMoney record.</p>

        <h3 className="font-semibold">Auto-Linking</h3>
        <p>Intelligent cross-module linking: expenses matching income merchants, investment-categorised expenses suggesting investment records, insurance expenses linking to policies, vendor-matching loan providers linking to EMIs.</p>

        <h3 className="font-semibold">Investment Integrations</h3>
        <p>Direct API connections to Zerodha, Sharekhan, Groww, and MF Central for portfolio auto-import. Support for manual entry with CSV/XLSX export.</p>
      </div>
    ),
  },
  {
    id: "ai-advisor",
    title: "AI Financial Advisor",
    icon: Shield,
    content: (
      <div className="space-y-4">
        <h3 className="font-semibold">Financial Health Score</h3>
        <p>Six-pillar assessment (0-100): Cash Flow (25%), Investment (20%), Insurance (15%), Tax (15%), Debt (15%), Goals (10%). Each pillar has specific metrics and recommendations powered by Claude/GPT.</p>

        <h3 className="font-semibold">LLM Chatbot</h3>
        <p>Floating chat interface with 20+ pre-built query templates. The AI has context of your financial data and can answer questions like &ldquo;How much did I spend on dining last month?&rdquo; or &ldquo;What&rsquo;s my net worth?&rdquo;</p>

        <h3 className="font-semibold">What-If Simulator</h3>
        <p>Model financial scenarios: increase income, reduce expenses, change investment returns, or prepay loans. See projected outcomes on net worth, savings rate, and goal timelines.</p>

        <h3 className="font-semibold">Workflow: Monthly Health Check</h3>
        <ol className="ml-4 list-decimal space-y-1 text-sm text-muted-foreground">
          <li>Review Dashboard health gauge</li>
          <li>Navigate to Health page for detailed pillar breakdown</li>
          <li>Read AI recommendations for each pillar</li>
          <li>Use What-If Simulator to model recommended changes</li>
          <li>Generate and download monthly PDF health report</li>
          <li>Ask the chatbot specific questions about your data</li>
        </ol>
      </div>
    ),
  },
  {
    id: "security",
    title: "Security & Administration",
    icon: Lock,
    content: (
      <div className="space-y-4">
        <h3 className="font-semibold">Authentication & Authorisation</h3>
        <p>JWT-based session strategy with NextAuth v5. Supports Google OAuth, email/password (bcryptjs hashed), and magic link (Resend) authentication. Role-based access control: user, admin, manager, viewer. Feature flags gate functionality per tier (free/pro/premium).</p>

        <h3 className="font-semibold">Admin Panel</h3>
        <p>Four modules: Users (create/manage/delete accounts), Profiles (multi-profile management), Feature Flags (tier-based feature gating), Audit Log (complete action trail with CSV export).</p>

        <h3 className="font-semibold">Data Privacy</h3>
        <p>All data is user-owned. Files are encrypted at rest. OAuth scopes are read-only. No data is shared with third parties. Self-host option available via Docker for complete data control.</p>

        <h3 className="font-semibold">Multi-Profile Support</h3>
        <p>Each user can have multiple profiles (personal, business, family). Profile switcher in sidebar. Family sharing allows invite-based collaboration with viewer/editor roles.</p>
      </div>
    ),
  },
]

export default function GuidePage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="mb-8 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary shadow-lg shadow-primary/20">
          <span className="text-3xl font-bold text-primary-foreground">M</span>
        </div>
        <h1 className="text-3xl font-bold tracking-tight">MyMoney User Guide</h1>
        <p className="mt-2 text-muted-foreground">
          Complete documentation for setup, features, workflows, and enterprise administration
        </p>
        <div className="mt-4 flex items-center justify-center gap-2">
          <Badge variant="secondary">Enterprise</Badge>
          <Badge variant="secondary">v1.0.0</Badge>
          <Badge variant="secondary">Self-Host Ready</Badge>
        </div>
      </div>

      <div className="space-y-8">
        {sections.map((section) => (
          <Card key={section.id} id={section.id}>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <section.icon className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-xl">{section.title}</CardTitle>
                </div>
              </div>
            </CardHeader>
            <CardContent className="text-sm leading-relaxed">{section.content}</CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
