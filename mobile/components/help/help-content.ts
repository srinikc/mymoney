export interface HelpSection {
  title: string
  summary: string
  details: string
  workflow?: { step: string; description: string }[]
  relatedFeatures?: { name: string; description: string }[]
}

const helpContent: Record<string, HelpSection> = {
  "/": {
    title: "Dashboard",
    summary: "Your home screen — see how your money is doing at a glance.",
    details: "The Dashboard pulls data from every part of the app to give you a quick snapshot: your total income, expenses this month, investments, active goals, and a Financial Health Score. The charts show how your income and expenses trend over time. Tap any stat card to jump to that section.",
    workflow: [
      { step: "Check your numbers", description: "Stat cards show annual income, total expenses, this month's spend, investments, and goals." },
      { step: "See your financial health", description: "The gauge rates you from 0–100. Below 50 means room to improve." },
      { step: "Spot trends", description: "Charts show income vs expenses over time and where your money goes." },
      { step: "Take action", description: "Tap any stat card to go straight to that section." },
    ],
    relatedFeatures: [
      { name: "Income Sources", description: "The income stat comes from all your income sources." },
      { name: "Expenses", description: "The expense stat comes from your recorded expenses." },
      { name: "Financial Health", description: "The gauge on the Dashboard takes you to your full health report." },
    ],
  },
  "/income": {
    title: "Income Sources",
    summary: "Keep track of every rupee you earn — salary, rent, interest, business, or anything else.",
    details: "List all the ways money comes in. Each income source can be monthly, yearly, one-time, or variable. For business income, you can track revenue, expenses, and profit separately. Your total income feeds into the Dashboard, Budgets, Reports, Tax calculations, and Net Worth.",
    workflow: [
      { step: "Add a new income source", description: "Tap 'Add Source'. Pick a type, enter the amount, and choose a category." },
      { step: "Track business income", description: "For Business type, enter your revenue and expenses. Profit is calculated automatically." },
      { step: "See the totals", description: "The summary cards show your monthly, yearly, and this-month income." },
    ],
    relatedFeatures: [
      { name: "Expenses", description: "Income − Expenses = Your savings rate." },
      { name: "Budgets", description: "Each budget shows what % of your income it represents." },
      { name: "Tax", description: "Income sources add up to your Gross Total Income." },
    ],
  },
  "/expenses": {
    title: "All Expenses",
    summary: "Every expense, all in one place — add, edit, filter, and find anything fast.",
    details: "Your complete transaction log. Each expense records the date, amount, category, description, how you paid, and who you paid. Filter by category, vendor, person, or amount. Data flows into Budgets, Auto-Link, Reports, and Tax.",
    workflow: [
      { step: "Add an expense", description: "Tap 'Add Expense'. Fill in the date, amount, category, and how you paid." },
      { step: "Find past expenses", description: "Use filter buttons to narrow down by category, vendor, or amount." },
      { step: "Edit or delete", description: "Tap the pencil icon on any row to edit. Use delete with confirmation." },
    ],
    relatedFeatures: [
      { name: "Budgets", description: "Your spending adds up against the budgets you've set." },
      { name: "Auto-Link", description: "Expenses marked 'Investment' can become investment records." },
      { name: "Reports", description: "See your spending breakdown in Reports." },
    ],
  },
  "/budgets": {
    title: "Budgets",
    summary: "Set spending limits for each category and see how you're tracking.",
    details: "Budgets help you plan how much to spend on each category every month. Set a limit for Food, Transport, Shopping, or anything else. The page shows what % of your total income each budget represents, how much you've spent, and what's left. Colour warnings tell you when you're getting close to your limit.",
    workflow: [
      { step: "Create a budget", description: "Tap 'Add Budget'. Pick a category, set your monthly limit, and choose the month." },
      { step: "Track your spending", description: "The progress bar shows spent vs limit. Green = under, yellow = close, red = over." },
      { step: "See it as % of income", description: "Each budget shows what % of your monthly income it uses." },
    ],
    relatedFeatures: [
      { name: "Income Sources", description: "Your total income is used to calculate budget percentages." },
      { name: "Expenses", description: "Your actual spending is compared against budgets automatically." },
    ],
  },
  "/goals": {
    title: "Goals",
    summary: "Set financial goals — a new car, a house, retirement — and track progress.",
    details: "Goals help you plan for the future. Each goal has a target amount, a deadline, a term, and a priority. You can link investments to goals — as investments grow, your goal progress updates automatically. Goals also appear on the Dashboard.",
    workflow: [
      { step: "Create a goal", description: "Tap 'Add Goal'. Give it a name, target amount, deadline, and priority." },
      { step: "Track progress", description: "Update your contribution amount. The progress bar shows how close you are." },
      { step: "Link investments", description: "Connect investments to this goal — they'll track progress together." },
    ],
    relatedFeatures: [
      { name: "Investments", description: "Link investments to track goal progress automatically." },
      { name: "Dashboard", description: "Active goals appear as a stat card on your home screen." },
    ],
  },
  "/investments": {
    title: "Investments",
    summary: "Track your portfolio — stocks, mutual funds, FD, PPF, NPS, gold, and more.",
    details: "Manage everything you've invested in. Different types have their own fields. Returns are calculated and compared to benchmarks. Link investments to Goals, import from brokers, or export your portfolio. Investment data feeds into Net Worth and Tax.",
    workflow: [
      { step: "Add an investment", description: "Tap 'Add Investment'. Choose the type, enter what you paid, units, and date." },
      { step: "Link to a goal", description: "Connect this investment to a goal — progress updates automatically." },
      { step: "Check your returns", description: "View your XIRR and compare it against benchmarks." },
    ],
    relatedFeatures: [
      { name: "Goals", description: "Investments can be linked to track goal progress." },
      { name: "Net Worth", description: "Your investments are part of your net worth calculation." },
      { name: "Tax", description: "Capital gains from investments are used in tax calculations." },
    ],
  },
  "/subscriptions": {
    title: "Subscriptions",
    summary: "Track all your recurring payments — Netflix, Prime, gym, apps — and never miss a renewal.",
    details: "Subscriptions tracks everything you pay for regularly. Each entry has the service name, provider, amount, billing cycle, next due date, and status. The app calculates your total monthly and yearly subscription spend. Upcoming renewals appear in Reminders.",
    workflow: [
      { step: "Add a subscription", description: "Tap 'Add Subscription'. Enter the name, provider, amount, billing cycle, and next renewal date." },
      { step: "See what you're spending", description: "The page shows monthly and yearly totals for all active subscriptions." },
      { step: "Pause or cancel", description: "Change the status to paused or cancelled as needed." },
    ],
    relatedFeatures: [
      { name: "Reminders", description: "Subscription renewals appear as reminders automatically." },
      { name: "Expenses", description: "Subscription payments can also be recorded as expenses." },
    ],
  },
  "/assets": {
    title: "Assets",
    summary: "Track physical things you own — property, gold, vehicles — and see how their value changes.",
    details: "Assets are the physical things you own that have value. Each asset records purchase price, current value, and purchase date. The app shows gain or loss per asset. Assets are grouped by category. Together with investments, they make up the 'assets' side of your Net Worth.",
    workflow: [
      { step: "Add an asset", description: "Tap 'Add Asset'. Pick a category, enter purchase price, current value, and location." },
      { step: "Track value changes", description: "Update the current value over time — the app shows your gain or loss." },
    ],
    relatedFeatures: [
      { name: "Net Worth", description: "Asset values add to your net worth." },
      { name: "Investments", description: "Assets and investments together make up what you own." },
    ],
  },
  "/bank-accounts": {
    title: "Bank Accounts",
    summary: "Link your bank accounts to track balances and see everything in one place.",
    details: "Add your savings, current, and other bank accounts with account number, IFSC, bank name, branch, and current balance. Account balances feed into your Net Worth. Income sources and expenses can reference specific accounts.",
    workflow: [
      { step: "Add an account", description: "Tap 'Add Account'. Enter the bank name, account number, IFSC, and current balance." },
      { step: "Keep balances updated", description: "Update balances periodically to keep your Net Worth accurate." },
    ],
    relatedFeatures: [
      { name: "Net Worth", description: "Account balances contribute to your net worth." },
      { name: "Income Sources", description: "Income can be linked to a specific bank account." },
    ],
  },
  "/net-worth": {
    title: "Net Worth",
    summary: "What you own minus what you owe — the single most important number in your finances.",
    details: "Net Worth is everything you own (assets + investments + insurance value + business profit) minus everything you owe (loan balances). The page shows what you own vs what you owe. Tap any entry to see details. Tracking Net Worth over time shows if you're building wealth.",
    workflow: [
      { step: "See your number", description: "Total Assets minus Total Liabilities = Your Net Worth." },
      { step: "Dig deeper", description: "Tap any item to go to its full module for details." },
    ],
    relatedFeatures: [
      { name: "Assets", description: "Physical assets add to what you own." },
      { name: "Investments", description: "Financial investments add to what you own." },
      { name: "Loans", description: "Loan balances are what you owe." },
    ],
  },
  "/loans": {
    title: "Loans",
    summary: "Track every loan — home, car, personal — and see how much you still owe.",
    details: "Loans tracks your borrowings: principal, interest rate, tenure, EMI, lender, and type. Summary cards show total outstanding, total monthly EMI, and number of active loans. Outstanding balances feed into Net Worth as liabilities.",
    workflow: [
      { step: "Add a loan", description: "Tap 'Add Loan'. Enter the amount borrowed, interest rate, tenure, EMI, lender, and start date." },
      { step: "Track repayments", description: "Update paid EMIs to track progress. See how much is left." },
    ],
    relatedFeatures: [
      { name: "Net Worth", description: "Outstanding loan balances are your liabilities." },
      { name: "Tax", description: "Home loan interest is tax-deductible under Section 24(b)." },
    ],
  },
  "/insurance": {
    title: "Insurance",
    summary: "Manage your policies — health, life, vehicle — so you never miss a renewal.",
    details: "Insurance keeps all your policies in one place. Each record stores the type, provider, policy number, sum assured, premium, renewal date, and nominee. Renewal reminders appear in Reminders automatically. Premiums are tax-deductible.",
    workflow: [
      { step: "Add a policy", description: "Tap 'Add Insurance'. Pick the type, enter provider, policy number, sum assured, and premium." },
      { step: "Never miss a renewal", description: "Upcoming renewals show up in your Reminders automatically." },
    ],
    relatedFeatures: [
      { name: "Reminders", description: "Policy renewal dates auto-create reminders." },
      { name: "Tax", description: "Premiums are deductible under Section 80C and 80D." },
    ],
  },
  "/reminders": {
    title: "Reminders",
    summary: "One place for every upcoming financial event — bill due dates, EMI payments, renewals.",
    details: "Reminders collects everything time-sensitive across all modules: EMI payments, insurance renewals, subscription renewals, and custom reminders. Each has a priority level and can be marked as done.",
    workflow: [
      { step: "See what's coming", description: "Reminders are sorted by due date with priority indicators." },
      { step: "Mark as done", description: "Tap to mark a reminder as completed once you've taken care of it." },
    ],
    relatedFeatures: [
      { name: "Loans", description: "EMI due dates create reminders automatically." },
      { name: "Insurance", description: "Policy renewal dates create reminders automatically." },
      { name: "Subscriptions", description: "Subscription renewal dates create reminders automatically." },
    ],
  },
  "/deals": {
    title: "Deals & Offers",
    summary: "Keep track of coupons, discounts, and special offers from stores you shop at.",
    details: "Record deals from merchants you frequently use — discount amounts, coupon codes, validity dates, and terms. When you add an expense, check if there's an active deal to apply.",
    relatedFeatures: [
      { name: "Expenses", description: "Deals can help reduce what you spend at specific merchants." },
    ],
  },
  "/insights": {
    title: "Insights",
    summary: "See patterns in your spending and income — trends, category breakdowns, and comparisons.",
    details: "Insights analyses your financial data to show you patterns: monthly trend charts, category breakdowns, and year-over-year comparisons.",
    workflow: [
      { step: "View monthly trends", description: "Line charts show how your income and expenses change over time." },
      { step: "Analyse categories", description: "Pie charts break down spending by category." },
      { step: "Ask the AI", description: "Use the floating chat to ask questions about your data." },
    ],
    relatedFeatures: [
      { name: "Dashboard", description: "Insights is a deeper dive into Dashboard numbers." },
      { name: "Reports", description: "Reports offers exportable versions of similar analysis." },
    ],
  },
  "/health": {
    title: "Financial Health Score",
    summary: "Get a report card for your finances with personalised tips to improve.",
    details: "Your Financial Health Score rates you from 0–100 across six areas: Cash Flow, Investments, Insurance, Tax, Debt, and Goals. Each area has its own score and specific recommendations.",
    workflow: [
      { step: "Check your score", description: "The gauge shows your overall score." },
      { step: "See each area", description: "Each area has its own score and detailed breakdown." },
      { step: "Read tips", description: "Get personalised AI-powered recommendations to improve." },
    ],
    relatedFeatures: [
      { name: "Dashboard", description: "The health gauge on your Dashboard links here." },
      { name: "What-If Simulator", description: "See how changes would affect your score." },
    ],
  },
  "/reports": {
    title: "Reports",
    summary: "Deep-dive reports on every aspect of your finances — exportable to Excel or PDF.",
    details: "Reports gives you detailed analysis across tabs: Overview, Income, Expenses, Investments, Goals, Recurrence, and Data. Each tab can be exported to XLSX or PDF.",
    workflow: [
      { step: "Pick your report", description: "Choose from Overview, Income, Expenses, Investments, Goals, Recurrence, or Data." },
      { step: "Set date filters", description: "Use date range and category filters to focus on what matters." },
      { step: "Export", description: "Export any tab to Excel or PDF." },
    ],
    relatedFeatures: [
      { name: "Dashboard", description: "Reports gives you the drill-down behind Dashboard numbers." },
      { name: "Expenses", description: "The Expenses tab shows detailed spending analysis." },
    ],
  },
  "/tax": {
    title: "Tax",
    summary: "Everything tax — calculate what you owe, store documents, track filings, and plan ahead.",
    details: "The Tax section has tabs for Income & Deductions, Documents, ITR Filings, and Projections. It auto-calculates your Gross Total Income from all sources. Add deductions and compare Old vs New tax regime.",
    workflow: [
      { step: "Review income & deductions", description: "Auto-calculates your income. Add deductions you're eligible for." },
      { step: "Upload documents", description: "Upload Form 16, 26AS, and other proofs." },
      { step: "Track ITR filings", description: "Record your filing status, acknowledgment number, and refund." },
    ],
    relatedFeatures: [
      { name: "Income Sources", description: "Your Gross Total Income comes from all income sources." },
      { name: "Investments", description: "Capital gains feed into tax calculations." },
      { name: "Insurance", description: "Premiums are deductible under 80C/80D." },
    ],
  },
  "/what-if": {
    title: "What-If Simulator",
    summary: "Play with your finances — see what happens if you save more, spend less, or invest differently.",
    details: "Tweak any financial parameter and see the projected impact on your Net Worth, savings rate, and goal timelines. Create multiple scenarios and compare them side by side.",
    workflow: [
      { step: "Create a scenario", description: "Tap 'New Scenario'. Give it a name." },
      { step: "Adjust the numbers", description: "Change income, expenses, investment returns, or loan payments." },
      { step: "See the impact", description: "View projected changes to your net worth and goals." },
    ],
    relatedFeatures: [
      { name: "Financial Health", description: "See how scenario changes affect your Health Score." },
      { name: "Goals", description: "Model how increased savings accelerate goal achievement." },
    ],
  },
  "/family": {
    title: "Family Sharing",
    summary: "Share finances with family members — let them view or edit with your permission.",
    details: "Invite family members to access your financial data. You control whether they can just view or also add and edit. Great for household finances where both partners need to track expenses together.",
    relatedFeatures: [
      { name: "Multi-Profile", description: "Each family member can have their own profile or share one." },
    ],
  },
  "/settings": {
    title: "Settings",
    summary: "Manage your account, connect integrations, and configure how the app works.",
    details: "Settings is where you manage your account preferences: Session Link, API Keys, Gmail Parser, Broker Integrations, Bank Accounts, and Environment configuration.",
    relatedFeatures: [
      { name: "Gmail Import", description: "Configure how Gmail imports work." },
      { name: "Bank Accounts", description: "Manage account links that feed into Net Worth." },
    ],
  },
  "/risk-profile": {
    title: "Risk Profile",
    summary: "Answer 10 questions to find out your investor personality — conservative, moderate, or aggressive.",
    details: "This 10-question quiz determines your risk tolerance. Your answers influence investment recommendations and how your Financial Health Score is calculated.",
    relatedFeatures: [
      { name: "Financial Health", description: "Your risk profile calibrates the Health Score." },
      { name: "Investments", description: "Investment recommendations consider your risk profile." },
    ],
  },
  "/plans": {
    title: "Plans & Pricing",
    summary: "See what each subscription tier offers and upgrade when you're ready.",
    details: "MyMoney offers Free (₹0), Pro (₹99/month or ₹999/year), and Enterprise (custom) tiers. Upgrade via Razorpay — payment is instant and your account upgrades automatically.",
    relatedFeatures: [
      { name: "Feature Flags", description: "Your tier determines which features are available." },
    ],
  },
  "/auto-link": {
    title: "Auto-Link",
    summary: "Let the app connect the dots between your expenses and other parts of your finances.",
    details: "Auto-Link looks at your expenses and suggests connections: a GPay rent payment matching your rental income, an expense tagged 'Investment' that should become an investment record, insurance expenses linking to policies. Accept, tweak, or dismiss each suggestion.",
    relatedFeatures: [
      { name: "Income Sources", description: "GPay receipts matching your income source get linked automatically." },
      { name: "Investments", description: "Expenses tagged 'Investment' suggest creating investment records." },
    ],
  },
  "/gmail-import": {
    title: "Gmail Import",
    summary: "Scan your email inbox to automatically pull in financial transactions.",
    details: "Connect your Gmail (read-only access) and the app scans for financial emails. It recognises UPI receipts, bank alerts, salary credits, mutual fund transactions, insurance premiums, and tax documents. You pick which ones to import.",
    relatedFeatures: [
      { name: "Expenses", description: "UPI payments and debit alerts become expenses." },
      { name: "Income Sources", description: "Salary credit emails create monthly income records." },
      { name: "Investments", description: "Mutual fund and stock emails create investment records." },
    ],
  },
  "/expenses/import": {
    title: "Bulk Import",
    summary: "Add lots of expenses at once by uploading a bank statement, CSV, or GPay export.",
    details: "Upload your bank statement (CSV or PDF), an Excel file, or a Google Takeout export. The app reads the data, you map the columns, and everything gets added at once. Duplicate detection stops you from importing the same transaction twice.",
    relatedFeatures: [
      { name: "Expenses", description: "Imported expenses appear in the main list." },
      { name: "Merchants", description: "Vendor names can be mapped to known merchants for cleaner data." },
    ],
  },
  "/expenses/merchants": {
    title: "Merchants",
    summary: "Standardise vendor names so 'Starbucks' always looks the same.",
    details: "Merchant mapping lets you set a standard name and category for each vendor. New expenses with matching vendor names will automatically use the standardised name and category.",
    relatedFeatures: [
      { name: "Expenses", description: "Merchant mappings auto-categorise expenses during import." },
      { name: "Reports", description: "Clean vendor data means more accurate category reports." },
    ],
  },
  "/expenses/review-duplicates": {
    title: "Review Duplicates",
    summary: "Catch and merge expenses that got entered twice.",
    details: "Scans for possible duplicates based on date, amount, and description. Compare them side by side and decide: merge, mark as not a duplicate, or delete the extra one.",
    relatedFeatures: [
      { name: "Expenses", description: "Changes here update your main expense list." },
      { name: "Bulk Import", description: "Always check this page after a bulk import." },
    ],
  },
  "/expenses/archive": {
    title: "Archive",
    summary: "Hide old or test entries without permanently deleting them.",
    details: "Archiving soft-deletes an expense — hidden from your main list but still in the database. Restore later if needed.",
    relatedFeatures: [
      { name: "Expenses", description: "Archived entries can be restored to the main view." },
    ],
  },
  "/admin": {
    title: "Admin Panel",
    summary: "Manage users, profiles, feature flags, and audit logs.",
    details: "Admins can create and manage user accounts, assign roles and tiers, manage profiles, toggle feature flags per tier, and view the audit log of all administrative actions.",
    relatedFeatures: [
      { name: "Users", description: "Create and manage user accounts." },
      { name: "Feature Flags", description: "Control which features each tier can access." },
    ],
  },
  "/privacy": {
    title: "Privacy Policy",
    summary: "How MyMoney handles your data — we take your privacy seriously.",
    details: "Your financial data is encrypted and never shared with third parties. Read the full policy for details on data collection, storage, and your rights.",
  },
}

export function getHelpForPath(path: string): HelpSection | null {
  if (helpContent[path]) return helpContent[path]

  const parts = path.split("/").filter(Boolean)
  while (parts.length > 0) {
    parts.pop()
    const parent = "/" + parts.join("/")
    if (helpContent[parent]) return helpContent[parent]
  }

  return null
}
