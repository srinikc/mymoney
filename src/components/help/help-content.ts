export interface HelpSection {
  title: string
  summary: string
  details: string
  workflow?: { step: string; description: string }[]
  relatedFeatures?: { name: string; description: string }[]
}

export const helpContent: Record<string, HelpSection> = {
  "/": {
    title: "Dashboard",
    summary: "Your home screen — see how your money is doing at a glance.",
    details: "The Dashboard is the first thing you see after logging in. It pulls data from every part of the app to give you a quick snapshot: your total income, expenses this month, investments, active goals, and a Financial Health Score. The charts show how your income and expenses trend over time, and what categories you spend the most on. Click any stat card to jump to that section for more detail.",
    workflow: [
      { step: "Check your numbers", description: "The stat cards at the top show annual income, total expenses, this month's spend, investments, and goals. Green means income > expenses." },
      { step: "See your financial health", description: "The gauge rates you from 0–100. Below 50 means there's room to improve savings, budgeting, or debt management." },
      { step: "Spot trends", description: "The charts show your income vs expenses over recent months and a breakdown of where your money goes." },
      { step: "Take action", description: "Click any stat card or chart item to go straight to that section and dig deeper." },
    ],
    relatedFeatures: [
      { name: "Income Sources", description: "The income stat comes from all your income sources." },
      { name: "Expenses", description: "The expense stat comes from your recorded expenses." },
      { name: "Financial Health", description: "The gauge on the Dashboard takes you to your full health report." },
      { name: "Reports", description: "Need more detail? Head to Reports for exportable charts and tables." },
    ],
  },

  "/income": {
    title: "Income Sources",
    summary: "Keep track of every rupee you earn — salary, rent, interest, business, or anything else.",
    details: "This is where you list all the ways money comes in. Each income source can be monthly (like salary), yearly (like FD interest), one-time (like a bonus), or variable. If you run a business, you can also track your revenue, expenses, and profit right here. Your total income feeds into the Dashboard, Budgets (as a % of income), Reports, Tax calculations, and Net Worth.",
    workflow: [
      { step: "Add a new income source", description: "Tap 'Add Source'. Pick a type (Salary/Rental/FD Interest/Business/Other), enter the amount, and choose a category." },
      { step: "Track business income", description: "For Business type, enter your revenue and expenses. Profit is calculated automatically." },
      { step: "Auto-match from GPay", description: "Turn on auto-detect and set a merchant name. GPay entries matching that name will suggest linking to this income." },
      { step: "See the totals", description: "The summary cards at the top show your monthly, yearly, and this-month income." },
    ],
    relatedFeatures: [
      { name: "Expenses", description: "Income − Expenses = Your savings rate (shown on Dashboard and Reports)." },
      { name: "Budgets", description: "Each budget shows what % of your income it represents." },
      { name: "Tax", description: "All your income sources add up to your Gross Total Income for tax calculations." },
      { name: "Auto-Link", description: "GPay payments you receive can be auto-linked to rental or other income sources." },
      { name: "Net Worth", description: "Business profit adds to your net worth." },
    ],
  },

  "/expenses": {
    title: "All Expenses",
    summary: "Every expense, all in one place — add, edit, filter, and find anything fast.",
    details: "This is your complete transaction log. Every expense records the date, amount, category, description, how you paid, who you paid, and any notes. You can filter by category, vendor, person, or amount. Sort any column. Edit inline. The data flows into Budgets (to track spending limits), Auto-Link (to connect expenses to investments or insurance), Reports, and Tax.",
    workflow: [
      { step: "Add an expense", description: "Tap 'Add Expense'. Fill in the date, amount, category, and how you paid. Add the vendor or person if you want." },
      { step: "Find past expenses", description: "Use the filter buttons at the top of each column to narrow down by category, vendor, or amount range." },
      { step: "Edit or delete", description: "Click the pencil icon on any row to edit. Use the delete button with confirmation." },
      { step: "Flag for review", description: "Flag any expense that needs a second look — it'll stand out in the list." },
    ],
    relatedFeatures: [
      { name: "Income Sources", description: "If an expense matches an income source merchant, it'll show up in Auto-Link as a suggestion." },
      { name: "Budgets", description: "Your spending adds up against the budgets you've set for each category." },
      { name: "Auto-Link", description: "Expenses marked as 'Investment' can become investment records. Insurance ones can link to policies." },
      { name: "Reports", description: "See your spending breakdown in the Expenses tab of Reports." },
      { name: "Tax", description: "Some expenses (like insurance or investments) may be tax-deductible." },
    ],
  },

  "/expenses/import": {
    title: "Bulk Import",
    summary: "Add lots of expenses at once by uploading a bank statement, CSV, or GPay export.",
    details: "No one wants to type in every expense manually. Upload your bank statement (CSV or PDF), an Excel file, or a Google Takeout export. The app reads the data, you map the columns, and everything gets added at once. PDFs are read using OCR (like a scanner for text). Duplicate detection stops you from importing the same transaction twice.",
    workflow: [
      { step: "Choose your file type", description: "Pick CSV/XLSX, PDF, or GPay import depending on what you have." },
      { step: "Upload your file", description: "Drag and drop or browse to select your file." },
      { step: "Match the columns", description: "Tell the app which column is the date, which is the amount, which is the description, etc." },
      { step: "Review and confirm", description: "Preview a few rows to make sure everything looks right, then confirm." },
    ],
    relatedFeatures: [
      { name: "All Expenses", description: "Imported expenses appear in the main list." },
      { name: "Merchants", description: "Vendor names from imports can be mapped to known merchants for cleaner data." },
      { name: "Review Duplicates", description: "After import, check here to merge any duplicate entries." },
    ],
  },

  "/expenses/merchants": {
    title: "Merchants",
    summary: "Standardise vendor names so 'Starbucks' always looks the same, even if imported differently.",
    details: "When you import from a bank, 'STARBUCKS INDIA' and 'Starbucks Coffee' might both appear. Merchant mapping lets you set a standard name and category for each vendor. New expenses with matching vendor names will automatically use the standardised name and category. This keeps your data clean and your reports accurate.",
    workflow: [
      { step: "See your merchants", description: "View all known vendors and how many transactions each has." },
      { step: "Add or edit a mapping", description: "Set a standard name, category, and icon for any vendor." },
      { step: "Automatic cleanup", description: "New expenses with matching vendor names will use your mapping automatically." },
    ],
    relatedFeatures: [
      { name: "All Expenses", description: "Merchant mappings auto-categorise expenses during import." },
      { name: "Bulk Import", description: "Import checks merchant mappings to clean up vendor names." },
      { name: "Reports", description: "Clean vendor data means more accurate category reports." },
    ],
  },

  "/expenses/review-duplicates": {
    title: "Review Duplicates",
    summary: "Catch and merge expenses that got entered twice.",
    details: "Sometimes the same transaction gets recorded twice — maybe from a bank import AND a manual entry. This tool scans for possible duplicates based on date, amount, and description. You can compare them side by side and decide what to do: merge, mark as not a duplicate, or delete the extra one.",
    workflow: [
      { step: "Let it scan", description: "The page automatically checks for potential duplicates." },
      { step: "Compare side by side", description: "Each suggestion shows both entries so you can see if they're the same." },
      { step: "Choose what to do", description: "Merge the data, mark as 'not duplicate', or delete the extra entry." },
    ],
    relatedFeatures: [
      { name: "All Expenses", description: "Changes here update your main expense list." },
      { name: "Bulk Import", description: "Always check this page after a bulk import to clean up." },
    ],
  },

  "/expenses/archive": {
    title: "Archive",
    summary: "Hide old or test entries without permanently deleting them.",
    details: "Archiving soft-deletes an expense — it's hidden from your main list but still in the database. You can restore it later if needed. Handy for cleaning up test data or hiding old entries you don't want to see but aren't ready to permanently delete.",
    workflow: [
      { step: "View archived entries", description: "See all soft-deleted expenses with their original data." },
      { step: "Restore if needed", description: "Click restore to move an entry back to your active list." },
      { step: "Permanently delete", description: "Use permanent delete to remove it from the database for good." },
    ],
    relatedFeatures: [
      { name: "All Expenses", description: "Archived entries are hidden from the main view but can be brought back." },
    ],
  },

  "/auto-link": {
    title: "Auto-Link",
    summary: "Let the app connect the dots between your expenses and other parts of your finances.",
    details: "Auto-Link looks at your expenses and suggests connections you might have missed. A GPay rent payment matching your rental income source? That's a link. An expense tagged 'Investment' that should become an investment record? Suggested. Insurance expense that should link to your policy? Auto-detected. Each suggestion can be accepted, tweaked, or dismissed. This keeps your financial picture connected without manual work.",
    workflow: [
      { step: "See your suggestions", description: "The page lists all auto-detected link ideas with type badges (income, investment, insurance, loan)." },
      { step: "Review each one", description: "Each suggestion shows the expense and what it could link to." },
      { step: "Accept or skip", description: "Accept to create the link, or dismiss if it's wrong." },
      { step: "View linked items", description: "Accepted links appear in the relevant section (e.g., linked investment in your portfolio)." },
    ],
    relatedFeatures: [
      { name: "Income Sources", description: "GPay receipts matching your income source merchant get linked automatically." },
      { name: "Expenses", description: "All suggestions start from your expenses." },
      { name: "Investments", description: "Expenses tagged 'Investment' suggest creating investment records." },
      { name: "Insurance", description: "Insurance-tagged expenses suggest linking to your policy." },
      { name: "Loans", description: "Expenses to loan providers suggest linking to your loan EMI." },
    ],
  },

  "/gmail-import": {
    title: "Gmail Import",
    summary: "Scan your email inbox to automatically pull in financial transactions.",
    details: "Connect your Gmail (read-only access) and the app will scan for financial emails. It recognises UPI payment receipts, bank alerts, salary credits, mutual fund transactions, stock trades, insurance premiums, subscription renewals, and tax documents (Form 16, ITR). Each email gets parsed into the right kind of record — expense, income, investment, insurance, subscription, or tax document. You pick which ones to import.",
    workflow: [
      { step: "Connect your Gmail", description: "Click 'Sign in with Google' and grant read-only email access." },
      { step: "Scan your inbox", description: "Click 'Scan Inbox' to find financial emails from the last 90 days." },
      { step: "Review what's found", description: "Each email is parsed with a badge showing what type it is (expense, income, investment, etc.)." },
      { step: "Import what you want", description: "Select the ones you want and click 'Import Selected'." },
    ],
    relatedFeatures: [
      { name: "Expenses", description: "UPI payments and debit alerts become expenses." },
      { name: "Income Sources", description: "Salary credit emails create monthly income records." },
      { name: "Investments", description: "Mutual fund and stock emails create investment records." },
      { name: "Insurance", description: "Premium emails create insurance policy records." },
      { name: "Subscriptions", description: "Renewal emails create subscription records." },
      { name: "Tax", description: "Form 16 emails are saved as tax documents." },
    ],
  },

  "/budgets": {
    title: "Budgets",
    summary: "Set spending limits for each category and see how you're tracking — down to what % of your income you're using.",
    details: "Budgets help you plan how much to spend on each category every month. Set a limit for Food, Transport, Shopping, or anything else. The page shows what % of your total income each budget represents, how much you've spent, and what's left. Colour warnings (green → yellow → red) tell you when you're getting close to your limit. A monthly picker lets you check past months, and a yearly view shows the full picture.",
    workflow: [
      { step: "Create a budget", description: "Tap 'Add Budget'. Pick a category, set your monthly limit, and choose the month." },
      { step: "Track your spending", description: "The progress bar shows spent vs limit. Green = under, yellow = close, red = over." },
      { step: "See it as % of income", description: "Each budget shows what % of your monthly income it uses — helps you decide if it's reasonable." },
      { step: "Export for offline", description: "Download your budget data as an Excel file." },
    ],
    relatedFeatures: [
      { name: "Income Sources", description: "Your total income is used to calculate budget percentages." },
      { name: "Expenses", description: "Your actual spending is compared against budgets automatically." },
      { name: "Reports", description: "Budget performance is included in the Reports section." },
      { name: "Financial Health", description: "How well you stick to budgets is part of your Health Score." },
    ],
  },

  "/goals": {
    title: "Goals",
    summary: "Set financial goals — a new car, a house, retirement — and track progress with linked investments.",
    details: "Goals help you plan for the future. Each goal has a target amount, a deadline, a term (short/medium/long), and a priority (P0/P1/P2). You can link investments to goals — for example, a PPF account and an MF SIP both contributing to your 'Retire with ₹1 Crore' goal. As investments grow, your goal progress updates automatically. Goals also appear on the Dashboard so they're always in sight.",
    workflow: [
      { step: "Create a goal", description: "Tap 'Add Goal'. Give it a name, target amount, deadline, how urgent it is, and time frame." },
      { step: "Track progress", description: "Update your contribution amount over time. The progress bar shows how close you are." },
      { step: "Link investments", description: "Connect investments to this goal — they'll track progress together." },
      { step: "See it on Dashboard", description: "Your active goals show up as a stat card so you never lose sight." },
    ],
    relatedFeatures: [
      { name: "Investments", description: "Link investments to track goal progress automatically." },
      { name: "Dashboard", description: "Active Goals appears as a stat card on your home screen." },
      { name: "Reports", description: "Goal progress is tracked in the Goals tab of Reports." },
      { name: "Financial Health", description: "How you're doing on goals contributes 10% to your Health Score." },
    ],
  },

  "/investments": {
    title: "Investments",
    summary: "Track your portfolio — stocks, mutual funds, FD, PPF, NPS, gold, real estate, crypto, and more.",
    details: "This is where you manage everything you've invested in. Different types have their own fields (buy price, quantity, date, purpose). The portfolio view has tabs separating stocks from other investments. Returns are calculated and compared to benchmarks. You can link investments to Goals, import from Zerodha/Sharekhan/Groww/MF Central, or export your portfolio to Excel. Investment data feeds into Net Worth and Tax (capital gains).",
    workflow: [
      { step: "Add an investment", description: "Tap 'Add Investment'. Choose the type (stocks/MF/FD/PPF/NPS/gold/etc.), enter what you paid, how many units, and when." },
      { step: "Link to a goal", description: "Connect this investment to a goal — progress updates automatically." },
      { step: "Check your returns", description: "View your XIRR and compare it against benchmarks." },
      { step: "Import from your broker", description: "Use Zerodha, Sharekhan, Groww, or MF Central integrations to pull in your portfolio." },
      { step: "Export your data", description: "Download your full portfolio as an Excel file." },
    ],
    relatedFeatures: [
      { name: "Goals", description: "Investments can be linked to track goal progress." },
      { name: "Auto-Link", description: "Expenses marked 'Investment' suggest creating investment records." },
      { name: "Net Worth", description: "Your investments are part of your net worth calculation." },
      { name: "Tax", description: "Capital gains from investments are used in tax calculations." },
      { name: "Reports", description: "Investment performance shows up in Reports." },
    ],
  },

  "/subscriptions": {
    title: "Subscriptions",
    summary: "Track all your recurring payments — Netflix, Prime, gym, apps — and never miss a renewal.",
    details: "Subscriptions tracks everything you pay for regularly. Each entry has the service name, provider, amount, billing cycle (monthly/quarterly/yearly), next due date, and status (active/paused/cancelled). The app calculates your total monthly and yearly subscription spend. Upcoming renewals appear in Reminders so you never get surprised by a charge.",
    workflow: [
      { step: "Add a subscription", description: "Tap 'Add Subscription'. Enter the name, provider, amount, billing cycle, and next renewal date." },
      { step: "See what you're spending", description: "The page shows monthly and yearly totals for all active subscriptions." },
      { step: "Pause or cancel", description: "Change the status to paused or cancelled as needed." },
      { step: "Get reminders", description: "Upcoming renewals show up in your Reminders automatically." },
    ],
    relatedFeatures: [
      { name: "Reminders", description: "Subscription renewals appear as reminders automatically." },
      { name: "Expenses", description: "Subscription payments can also be recorded as expenses." },
      { name: "Reports", description: "Subscription spending analysis is included in Reports." },
    ],
  },

  "/assets": {
    title: "Assets",
    summary: "Track physical things you own — property, gold, vehicles — and see how their value changes.",
    details: "Assets are the physical things you own that have value. Each asset records what it is, where it is, what you paid, what it's worth now, and when you bought it. The app shows gain or loss per asset. Assets are grouped by category (property/gold/vehicles/etc.) for easy viewing. Together with investments, they make up the 'assets' side of your Net Worth.",
    workflow: [
      { step: "Add an asset", description: "Tap 'Add Asset'. Pick a category (property/gold/silver/vehicles/equipment), enter purchase price, current value, and location." },
      { step: "Track value changes", description: "Update the current value over time — the app shows your gain or loss." },
      { step: "See by category", description: "Category grouping shows total value per asset type." },
    ],
    relatedFeatures: [
      { name: "Investments", description: "Assets (physical) and investments (financial) together make up what you own." },
      { name: "Net Worth", description: "Asset values add to your net worth." },
      { name: "Reports", description: "Asset summary is included in Reports." },
    ],
  },

  "/bank-accounts": {
    title: "Bank Accounts",
    summary: "Link your bank accounts to track balances and see everything in one place.",
    details: "Add your savings, current, and other bank accounts with account number, IFSC, bank name, branch, and current balance. Account balances feed into your Net Worth. Income sources and expenses can reference specific accounts so you know where money is flowing in and out.",
    workflow: [
      { step: "Add an account", description: "Tap 'Add Account'. Enter the bank name, account number, IFSC, and current balance." },
      { step: "Keep balances updated", description: "Update balances periodically to keep your Net Worth accurate." },
      { step: "View transactions", description: "Click an account to see its related transactions." },
    ],
    relatedFeatures: [
      { name: "Net Worth", description: "Account balances contribute to your net worth." },
      { name: "Income Sources", description: "Income can be linked to a specific bank account." },
      { name: "Expenses", description: "Expenses can reference which account was used." },
    ],
  },

  "/net-worth": {
    title: "Net Worth",
    summary: "What you own minus what you owe — the single most important number in your finances.",
    details: "Net Worth is everything you own (assets + investments + insurance value + business profit) minus everything you owe (loan balances). The page shows a two-column layout: green for what you own, red for what you owe, and the difference in the middle. Every item is clickable — tap any entry to go to its module for details. Tracking Net Worth over time is the best way to see if you're building wealth.",
    workflow: [
      { step: "See your number", description: "Total Assets (green) minus Total Liabilities (red) = Your Net Worth." },
      { step: "Add or update items", description: "Add assets, investments, or loans directly from this page." },
      { step: "Dig deeper", description: "Click any item to go to its full module for details." },
    ],
    relatedFeatures: [
      { name: "Assets", description: "Physical assets add to what you own." },
      { name: "Investments", description: "Financial investments add to what you own." },
      { name: "Loans", description: "Loan balances are what you owe." },
      { name: "Income Sources", description: "Business profit (post-tax) adds to net worth." },
      { name: "Insurance", description: "Policies with surrender value add to what you own." },
    ],
  },

  "/loans": {
    title: "Loans",
    summary: "Track every loan — home, car, personal — and see how much you still owe.",
    details: "Loans tracks your borrowings: principal, interest rate, tenure, EMI, lender, and type (Home/Car/Vehicle/Electronics/Equipment/Other). Summary cards show total outstanding, total monthly EMI, and number of active loans. Outstanding balances feed into Net Worth as liabilities. Home loan interest can be claimed as a tax deduction. Expenses matching your loan provider get suggested for auto-linking.",
    workflow: [
      { step: "Add a loan", description: "Tap 'Add Loan'. Enter the amount borrowed, interest rate, tenure, EMI, lender, and start date." },
      { step: "Track repayments", description: "Update paid EMIs to track progress. See how much is left." },
      { step: "Auto-link expenses", description: "Expenses to your loan provider can be linked to the loan EMI automatically." },
    ],
    relatedFeatures: [
      { name: "Auto-Link", description: "Expenses matching your loan provider suggest linking to EMI." },
      { name: "Net Worth", description: "Outstanding loan balances are your liabilities." },
      { name: "Financial Health", description: "Your debt-to-income ratio is part of your Health Score." },
      { name: "Tax", description: "Home loan interest is tax-deductible under Section 24(b)." },
    ],
  },

  "/insurance": {
    title: "Insurance",
    summary: "Manage your policies — health, life, vehicle — so you never miss a renewal.",
    details: "Insurance keeps all your policies in one place. Each record stores the type (health/term_life/motor/other), provider, policy number, sum assured, premium, renewal date, and nominee. Type-filter tabs let you view health, life, or motor separately. Renewal reminders appear in Reminders automatically. Insurance premiums are tax-deductible (Section 80C/80D). Policies with surrender value contribute to your Net Worth.",
    workflow: [
      { step: "Add a policy", description: "Tap 'Add Insurance'. Pick the type, enter provider, policy number, sum assured, premium, and renewal date." },
      { step: "Never miss a renewal", description: "Upcoming renewals show up in your Reminders automatically." },
      { step: "View by type", description: "Use the tabs to see health, life, or motor policies separately." },
    ],
    relatedFeatures: [
      { name: "Auto-Link", description: "Insurance-tagged expenses can be linked to your policies." },
      { name: "Reminders", description: "Policy renewal dates auto-create reminders." },
      { name: "Net Worth", description: "Policies with surrender value add to net worth." },
      { name: "Tax", description: "Premiums are deductible under Section 80C (life) and 80D (health)." },
    ],
  },

  "/reminders": {
    title: "Reminders",
    summary: "One place for every upcoming financial event — bill due dates, EMI payments, renewals, and more.",
    details: "Reminders collects everything time-sensitive across all modules. EMI payments from Loans, insurance renewals, subscription renewals, and custom reminders all show up here. Each reminder has a priority level and can be marked as done. Sort by due date to see what's coming up next.",
    workflow: [
      { step: "See what's coming", description: "Reminders are sorted by due date with priority indicators." },
      { step: "Mark as done", description: "Click to mark a reminder as completed once you've taken care of it." },
      { step: "Add your own", description: "Create custom reminders for anything not automatically tracked." },
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
    details: "Record deals from merchants you frequently use — discount amounts, coupon codes, validity dates, and terms. When you add an expense, check if there's an active deal to apply. Helps you save money on regular purchases.",
    workflow: [
      { step: "Add a deal", description: "Tap 'Add Deal'. Enter the merchant, discount details, coupon code, and when it expires." },
      { step: "Browse active deals", description: "See all currently valid deals sorted by merchant." },
      { step: "Use with expenses", description: "Check active deals when adding expenses to save money." },
    ],
    relatedFeatures: [
      { name: "Expenses", description: "Deals can help reduce what you spend at specific merchants." },
      { name: "Merchants", description: "Deals are tied to specific merchants." },
    ],
  },

  "/insights": {
    title: "Insights",
    summary: "See patterns in your spending and income — trends, category breakdowns, and year-over-year comparisons.",
    details: "Insights analyses your financial data to show you patterns. Monthly trend charts reveal how income and expenses change over time. Category breakdowns show where your money goes. Year-over-year comparisons show how your finances have changed. You can also ask the AI chatbot questions about your data in plain English.",
    workflow: [
      { step: "View monthly trends", description: "Line charts show how your income and expenses have changed over time." },
      { step: "Analyse categories", description: "Pie charts break down spending by category." },
      { step: "Compare years", description: "See how this year compares to last year." },
      { step: "Ask the AI", description: "Use the floating chat to ask questions like 'How much did I spend on food last month?'" },
    ],
    relatedFeatures: [
      { name: "Dashboard", description: "Insights is a deeper dive into the numbers you see on the Dashboard." },
      { name: "Reports", description: "Reports offers exportable versions of similar analysis." },
      { name: "AI Chatbot", description: "The chatbot can answer questions using your data." },
    ],
  },

  "/health": {
    title: "Financial Health Score",
    summary: "Get a report card for your finances with personalised tips to improve.",
    details: "Your Financial Health Score rates you from 0–100 across six areas: Cash Flow (how much you save), Investments (are you diversified?), Insurance (are you covered?), Tax (are you optimising deductions?), Debt (are you over-leveraged?), and Goals (are you on track?). Each area has its own score and specific recommendations. A 10-question risk profile quiz helps calibrate the assessment. You can export a monthly PDF report.",
    workflow: [
      { step: "Check your score", description: "The gauge shows your overall score. Below 50 means there's room to improve." },
      { step: "See each area", description: "Each of the six areas has its own score and detailed breakdown." },
      { step: "Read tips", description: "Get personalised AI-powered recommendations to improve each area." },
      { step: "Take the risk quiz", description: "Answer 10 questions to calibrate your assessment." },
      { step: "Download your report", description: "Export a PDF health report with all scores and recommendations." },
    ],
    relatedFeatures: [
      { name: "Dashboard", description: "The health gauge on your Dashboard links here." },
      { name: "Goals", description: "Goal progress contributes 10% to your score." },
      { name: "What-If Simulator", description: "See how changes would affect your score before making them." },
      { name: "Reports", description: "Generate a monthly PDF report from this page." },
    ],
  },

  "/reports": {
    title: "Reports",
    summary: "Deep-dive reports on every aspect of your finances — exportable to Excel or PDF.",
    details: "Reports gives you detailed analysis across seven tabs: Overview (key stats), Income (trends, comparisons), Expenses (category breakdown, trends), Investments (portfolio performance), Goals & Plans (progress), Recurrence (recurring transactions), and Data (raw view). Each tab can be exported to XLSX or PDF for offline use or sharing.",
    workflow: [
      { step: "Pick your report", description: "Choose from Overview, Income, Expenses, Investments, Goals, Recurrence, or Data." },
      { step: "Set date filters", description: "Use date range and category filters to focus on what matters." },
      { step: "Export", description: "Export any tab to Excel or PDF for sharing or record-keeping." },
    ],
    relatedFeatures: [
      { name: "Dashboard", description: "Reports gives you the drill-down behind Dashboard numbers." },
      { name: "Income Sources", description: "The Income tab aggregates all your income data." },
      { name: "Expenses", description: "The Expenses tab shows detailed spending analysis." },
      { name: "Investments", description: "The Investments tab tracks portfolio performance." },
      { name: "Goals", description: "The Goals tab shows progress toward your targets." },
    ],
  },

  "/tax": {
    title: "Tax",
    summary: "Everything tax — calculate what you owe, store documents, track filings, and plan ahead.",
    details: "The Tax section has four tabs: (1) Income & Deductions — automatically calculates your Gross Total Income from all sources. Add deductions (80C, 80D, HRA, NPS, home loan interest) and compare Old vs New tax regime. (2) Documents — upload Form 16, Form 26AS, investment proofs, rent receipts, and donation receipts as PDFs. (3) ITR Filings — track past and current year filings with status, acknowledgment number, and refund. (4) Projections — estimate current year tax, see advance tax due dates, and get suggestions to optimise deductions.",
    workflow: [
      { step: "Review your income & deductions", description: "Tab 1 auto-calculates your income. Add deductions you're eligible for." },
      { step: "Upload documents", description: "Tab 2 — upload Form 16, 26AS, and other proofs as PDFs." },
      { step: "Track ITR filings", description: "Tab 3 — record your filing status, acknowledgment number, and refund." },
      { step: "Plan ahead", description: "Tab 4 — estimate your current year tax and see where you can save more." },
      { step: "Compare regimes", description: "Use the Old vs New calculator to pick the best option." },
    ],
    relatedFeatures: [
      { name: "Income Sources", description: "Your Gross Total Income comes from all your income sources." },
      { name: "Investments", description: "Capital gains from investments feed into tax calculations." },
      { name: "Loans", description: "Home loan interest is deductible under Section 24(b)." },
      { name: "Insurance", description: "Premiums are deductible under 80C/80D." },
      { name: "Gmail Import", description: "Form 16 emails can be auto-imported directly." },
    ],
  },

  "/what-if": {
    title: "What-If Simulator",
    summary: "Play with your finances — see what happens if you save more, spend less, or invest differently.",
    details: "Ever wonder 'What if I save ₹5,000 more each month?' or 'What if I prepay my loan?' The What-If Simulator lets you tweak any financial parameter and see the projected impact on your Net Worth, savings rate, and goal timelines. Create multiple scenarios and compare them side by side.",
    workflow: [
      { step: "Create a scenario", description: "Tap 'New Scenario'. Give it a name like 'Save more' or 'Prepay loan'." },
      { step: "Adjust the numbers", description: "Change income, expenses, investment returns, or loan payments." },
      { step: "See the impact", description: "View projected changes to your net worth and goals over time." },
      { step: "Compare", description: "Save multiple scenarios and compare outcomes side by side." },
    ],
    relatedFeatures: [
      { name: "Financial Health", description: "See how scenario changes affect your Health Score." },
      { name: "Goals", description: "Model how increased savings accelerate goal achievement." },
      { name: "Investments", description: "Test different return rates on your portfolio." },
    ],
  },

  "/family": {
    title: "Family Sharing",
    summary: "Share finances with family members — let them view or edit with your permission.",
    details: "Family Sharing lets you invite family members to access your financial data. You control whether they can just view (read-only) or also add/edit (editor). Invitations are sent by email. This is great for household finances where both partners need to track expenses and budgets together.",
    workflow: [
      { step: "Send an invite", description: "Enter the email of the family member you want to share with." },
      { step: "Set their role", description: "Choose viewer (can see but not change) or editor (can add and edit)." },
      { step: "They accept", description: "They receive an email to accept the invitation." },
      { step: "Manage access", description: "Revoke or change access anytime." },
    ],
    relatedFeatures: [
      { name: "Multi-Profile", description: "Each family member can have their own profile or share one." },
      { name: "Admin", description: "Admins can manage all profiles and sharing." },
    ],
  },

  "/settings": {
    title: "Settings",
    summary: "Manage your account, connect integrations, and configure how the app works.",
    details: "Settings is where you manage your account preferences. Sub-pages include: Session Link (connect your mobile app), API Keys (for programmatic access), Gmail Parser (configure email import settings), Integrations (connect Zerodha/Sharekhan/Groww/MF Central), Bank Accounts (manage linked accounts), and Environment (Docker/self-host configuration).",
    relatedFeatures: [
      { name: "Gmail Import", description: "Configure how Gmail imports work." },
      { name: "Investments", description: "Connect broker integrations here." },
      { name: "Bank Accounts", description: "Manage account links that feed into Net Worth." },
    ],
  },

  "/risk-profile": {
    title: "Risk Profile",
    summary: "Answer 10 questions to find out your investor personality — conservative, moderate, or aggressive.",
    details: "This 10-question quiz follows SEBI RIA guidelines to determine your risk tolerance. Your answers influence investment recommendations and how your Financial Health Score is calculated. It covers things like how long you plan to invest, how you'd react to market drops, and what you're saving for.",
    relatedFeatures: [
      { name: "Financial Health", description: "Your risk profile calibrates the Health Score." },
      { name: "Investments", description: "Investment recommendations consider your risk profile." },
    ],
  },

  "/plans": {
    title: "Plans & Pricing",
    summary: "See what each subscription tier offers and upgrade when you're ready.",
    details: "MyMoney offers a Free tier (₹0 — 1 profile, manual import only, no AI), Pro (₹99/month or ₹999/year — 3 profiles, all features, AI chat), and Enterprise (custom pricing — unlimited, admin access, dedicated support). Upgrade via Razorpay — payment is instant and your account upgrades automatically.",
    relatedFeatures: [
      { name: "Feature Flags", description: "Your tier determines which features are available." },
      { name: "Settings", description: "See your current tier in your profile." },
    ],
  },

  "/admin/users": {
    title: "Users (Admin)",
    summary: "Create and manage user accounts — set roles, tiers, and permissions.",
    details: "Admins can create new users with email/password or Google login, assign roles (user/admin/manager/viewer), set subscription tiers (free/pro/premium), and manage profiles. Perfect for onboarding team members or family members.",
    workflow: [
      { step: "Create a user", description: "Click 'Create User'. Enter their name, email, set a password (or toggle Google login), choose a role and tier." },
      { step: "Change roles or tiers", description: "Use the inline dropdowns to change any user's role or tier." },
      { step: "Remove a user", description: "Delete a user account if needed (you can't delete yourself)." },
    ],
    relatedFeatures: [
      { name: "Profiles (Admin)", description: "Each user can have multiple profiles." },
      { name: "Feature Flags (Admin)", description: "Control which features each tier can access." },
      { name: "Audit Log (Admin)", description: "All user changes are logged." },
    ],
  },

  "/admin/profiles": {
    title: "Profiles (Admin)",
    summary: "Manage all user profiles across the system.",
    details: "Lists every profile across all users with data counts (expenses, budgets, goals). Admins can create new profiles for any user or delete existing ones.",
    relatedFeatures: [
      { name: "Users (Admin)", description: "Profiles belong to users — manage users first." },
      { name: "Audit Log (Admin)", description: "Profile changes are logged." },
    ],
  },

  "/admin/features": {
    title: "Feature Flags (Admin)",
    summary: "Turn features on or off for Free, Pro, and Premium users.",
    details: "Feature Flags control which parts of the app each subscription tier can access. Toggle features on or off for free, pro, or premium tiers independently. This is how the subscription model works — free users see limited features, paying users get more.",
    relatedFeatures: [
      { name: "Subscription Tiers", description: "Features are gated by what tier a user is on." },
      { name: "Users (Admin)", description: "Change a user's tier from the Users page." },
    ],
  },

  "/admin/audit-log": {
    title: "Audit Log (Admin)",
    summary: "See every action admins have taken — who did what and when.",
    details: "The Audit Log records every administrative action: user creation, role changes, tier changes, profile management, feature flag toggles. Each entry shows which admin did it, what they did, and when. Filterable and exportable to CSV.",
    relatedFeatures: [
      { name: "Users (Admin)", description: "User management actions show up here." },
      { name: "Profiles (Admin)", description: "Profile changes show up here." },
      { name: "Feature Flags (Admin)", description: "Feature flag changes show up here." },
    ],
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
