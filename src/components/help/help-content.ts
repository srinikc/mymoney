export interface ControlItem {
  name: string
  description: string
  location?: string
}

export interface WorkflowStep {
  step: string
  description: string
  example?: string
}

export interface HelpSection {
  title: string
  summary: string
  details: string
  controls?: ControlItem[]
  workflow?: WorkflowStep[]
  relatedFeatures?: { name: string; description: string }[]
}

export const helpContent: Record<string, HelpSection> = {
  "/": {
    title: "Dashboard",
    summary: "Your home screen — see how your money is doing at a glance.",
    details: "The Dashboard is the first thing you see after logging in. It pulls data from every part of the app to give you a quick snapshot: your total income, expenses this month, investments, active goals, and a Financial Health Score. Charts show how your income and expenses trend over time, and which categories you spend the most on. Use the time-period controls to view annual, quarterly, or monthly data. Click any stat card or chart segment to jump to that section for more detail.",
    controls: [
      { name: "Year dropdown", description: "Select a financial year (e.g., 2025–2026) to filter all dashboard data.", location: "Top-right of the stat cards row" },
      { name: "Month dropdown", description: "Select a specific month to drill into that period's data.", location: "Next to Year dropdown" },
      { name: "Quarter dropdown", description: "Quick-filter by quarter (Q1/Q2/Q3/Q4) for periodic reviews.", location: "Next to Month dropdown" },
    ],
    workflow: [
      { step: "Check your numbers", description: "The stat cards at the top show annual income, total expenses, this month's spend, investments, and goals. Green means income exceeds expenses.", example: "If annual income is ₹12,00,000 and total expenses are ₹8,00,000, your savings rate is 33%." },
      { step: "See your financial health", description: "The gauge rates you from 0–100. Below 50 means there is room to improve savings, budgeting, or debt management." },
      { step: "Spot trends", description: "Charts show your income vs expenses over recent months and a breakdown of where your money goes by category." },
      { step: "Filter by time", description: "Use the Year, Month, and Quarter dropdowns to view data for a specific period." },
      { step: "Take action", description: "Click any stat card or chart segment to jump to that section and dig deeper." },
    ],
    relatedFeatures: [
      { name: "Income Sources", description: "The income stat comes from all your income sources." },
      { name: "Expenses", description: "The expense stat comes from your recorded expenses." },
      { name: "Financial Health", description: "The gauge on the Dashboard links to your full health report." },
      { name: "Reports", description: "Need more detail? Head to Reports for exportable charts and tables." },
    ],
  },

  "/income": {
    title: "Income Sources",
    summary: "Keep track of every rupee you earn — salary, rent, interest, business, or anything else.",
    details: "This is where you list all the ways money comes in. Each income source can be monthly (like salary), yearly (like FD interest), one-time (like a bonus), or variable. If you run a business, toggle the Business section to track revenue, expenses, and profit separately. Your total income feeds into the Dashboard, Budgets, Reports, Tax calculations, and Net Worth.",
    controls: [
      { name: "Add Income button", description: "Opens a dialog to create a new income source.", location: "Top-right of the page" },
      { name: "Name input", description: "Label for the income source (e.g., 'Salary' or 'Rental Income').", location: "Inside Add/Edit dialog" },
      { name: "Type dropdown", description: "Choose Monthly, Yearly, One-Time, or Variable.", location: "Inside Add/Edit dialog" },
      { name: "Amount input", description: "The amount for this income source.", location: "Inside Add/Edit dialog" },
      { name: "Source Category dropdown", description: "Categorize the income (e.g., Salary, Rental, Interest, Business).", location: "Inside Add/Edit dialog" },
      { name: "Payment Mode dropdown", description: "How you receive this income — Bank Transfer, Cash, Cheque, UPI.", location: "Inside Add/Edit dialog" },
      { name: "Bank Account dropdown", description: "Link this income to a specific bank account.", location: "Inside Add/Edit dialog" },
      { name: "Start Date input", description: "When this income source started or will start.", location: "Inside Add/Edit dialog" },
      { name: "Notes textarea", description: "Optional notes or description.", location: "Inside Add/Edit dialog" },
      { name: "Business section toggle", description: "Enable to show Revenue, Expenses, and Profit fields for business income.", location: "Inside Add/Edit dialog, visible when Type is Business" },
      { name: "Revenue input", description: "Business revenue amount.", location: "Inside Add/Edit dialog — Business section" },
      { name: "Expenses input", description: "Business expenses amount.", location: "Inside Add/Edit dialog — Business section" },
      { name: "Profit display", description: "Auto-calculated as Revenue − Expenses.", location: "Inside Add/Edit dialog — Business section" },
      { name: "Edit button (per row)", description: "Opens the dialog pre-filled with that income source's data.", location: "Each row in the income list" },
      { name: "Delete button (per row)", description: "Removes the income source after confirmation.", location: "Each row in the income list" },
    ],
    workflow: [
      { step: "Add a new income source", description: "Tap 'Add Income'. Fill in the name, type, amount, and category.", example: "Add 'Salary' as Monthly type with ₹75,000, category 'Salary'." },
      { step: "Track business income", description: "For Business type, toggle the Business section and enter revenue and expenses. Profit is calculated automatically.", example: "Revenue ₹5,00,000, Expenses ₹3,00,000 → Profit ₹2,00,000." },
      { step: "Auto-match from GPay", description: "Set a merchant name for auto-detection. GPay entries matching that name will suggest linking to this income source.", example: "Set merchant 'Sharma Properties' for rental income." },
      { step: "See the totals", description: "Summary cards at the top show your monthly, yearly, and this-month income." },
    ],
    relatedFeatures: [
      { name: "Expenses", description: "Income minus expenses equals your savings rate (shown on Dashboard and Reports)." },
      { name: "Budgets", description: "Each budget shows what percentage of your income it represents." },
      { name: "Tax", description: "All income sources add up to your Gross Total Income for tax calculations." },
      { name: "Auto-Link", description: "GPay payments you receive can be auto-linked to rental or other income sources." },
      { name: "Net Worth", description: "Business profit adds to your net worth." },
    ],
  },

  "/expenses": {
    title: "Expenses Ledger",
    summary: "Every expense, all in one place — add, edit, filter, bulk archive, import, and export.",
    details: "This is your complete transaction log with powerful filtering and batch operations. Every expense records the date, amount, category, description, payment mode, vendor, person, sub-category, bank account, and recurrence type. You can filter by any combination of columns, sort by any column, edit inline, bulk archive selected rows, and export to XLSX. Use the Import, Bulk Import, Drive, and GPay Refresh buttons to bring in data from external sources. The data feeds into Budgets, Auto-Link, Reports, and Tax.",
    controls: [
      { name: "Add button", description: "Opens a dialog to create a new expense manually.", location: "Top toolbar" },
      { name: "Bulk Import button", description: "Navigates to the /expenses/import page for batch uploads.", location: "Top toolbar" },
      { name: "Review button", description: "Navigates to /expenses/review-duplicates to merge duplicate entries.", location: "Top toolbar" },
      { name: "Drive button", description: "Opens a file picker to import from Google Drive.", location: "Top toolbar" },
      { name: "Refresh GPay button", description: "Pulls the latest GPay transactions for import.", location: "Top toolbar" },
      { name: "Refresh button", description: "Reloads the expense list from the server.", location: "Top toolbar" },
      { name: "Export button", description: "Downloads the current filtered view as an XLSX file.", location: "Top toolbar" },
      { name: "Search input", description: "Free-text search across all expense fields.", location: "Top toolbar" },
      { name: "Date preset dropdown", description: "Quick date filters: Today, This Week, This Month, Last Month, This Quarter, This Year, All Time.", location: "Above the table" },
      { name: "Date range inputs", description: "Custom start and end date pickers for precise filtering.", location: "Above the table" },
      { name: "Import Session filter", description: "Filter expenses by the specific import batch they came from.", location: "Above the table" },
      { name: "Category column filter dropdown", description: "Filter by expense category (e.g., Food, Transport, Shopping).", location: "Table column header" },
      { name: "Person column filter dropdown", description: "Filter by person/contact associated with the expense.", location: "Table column header" },
      { name: "Recurrence Type column filter dropdown", description: "Filter by one-time or recurring.", location: "Table column header" },
      { name: "Payment Mode column filter dropdown", description: "Filter by payment method — Cash, UPI, Credit Card, Debit Card, etc.", location: "Table column header" },
      { name: "Vendor column filter dropdown", description: "Filter by merchant or vendor name.", location: "Table column header" },
      { name: "Sub-Category column filter dropdown", description: "Filter by sub-category for more granular analysis.", location: "Table column header" },
      { name: "Bank Account column filter dropdown", description: "Filter expenses by the bank account used.", location: "Table column header" },
      { name: "Sort controls", description: "Click any column header to sort ascending/descending.", location: "Table column headers" },
      { name: "Row checkboxes", description: "Select individual rows for batch operations.", location: "Leftmost column of each row" },
      { name: "Select All checkbox", description: "Toggle all visible rows on or off.", location: "Table header, first column" },
      { name: "Archive Selected button", description: "Moves all selected expenses to the archive (soft delete).", location: "Top toolbar, visible when rows are selected" },
      { name: "Clear button", description: "Resets all filters to their defaults.", location: "Above the table" },
      { name: "Pagination — First button", description: "Jumps to the first page of results.", location: "Bottom of the table" },
      { name: "Pagination — Prev button", description: "Goes to the previous page.", location: "Bottom of the table" },
      { name: "Pagination — Next button", description: "Goes to the next page.", location: "Bottom of the table" },
      { name: "Pagination — Last button", description: "Jumps to the last page of results.", location: "Bottom of the table" },
      { name: "Inline edit pencil (per row)", description: "Click to edit the expense inline without opening a dialog.", location: "Each row in the expense list" },
      { name: "Delete button (per row)", description: "Permanently deletes the expense after confirmation.", location: "Each row in the expense list" },
    ],
    workflow: [
      { step: "Add an expense", description: "Tap 'Add' and fill in the date, amount, category, payment mode, and vendor.", example: "Add '₹250 — Lunch at Sagar Restaurant — Food category — UPI payment'." },
      { step: "Find past expenses using filters", description: "Use any combination of column filter dropdowns, date presets, and search to narrow down.", example: "Filter by Category = 'Food', Payment Mode = 'UPI', Date = 'This Month' to see all UPI food payments." },
      { step: "Edit inline", description: "Click the pencil icon on any row and edit fields directly in the table.", example: "Correct a mis-categorized expense from 'Shopping' to 'Groceries'." },
      { step: "Batch archive", description: "Select multiple rows with checkboxes and click 'Archive Selected' to soft-delete them.", example: "Archive all test expenses from last month's import session." },
      { step: "Export to XLSX", description: "Click 'Export' to download the current filtered view as an Excel file.", example: "Export all Q2 expenses for your accountant." },
      { step: "Import from file / Drive / GPay", description: "Use the respective buttons to bring in data from external sources.", example: "Upload a bank statement CSV using Bulk Import." },
    ],
    relatedFeatures: [
      { name: "Income Sources", description: "If an expense matches an income source merchant, it shows up in Auto-Link." },
      { name: "Budgets", description: "Your spending adds up against budgets you have set for each category." },
      { name: "Auto-Link", description: "Investment-tagged expenses can become investment records; insurance ones link to policies." },
      { name: "Reports", description: "See your spending breakdown in the Expenses tab of Reports." },
      { name: "Tax", description: "Some expenses (insurance, investments) may be tax-deductible." },
    ],
  },

  "/expenses/import": {
    title: "Bulk Import",
    summary: "Import many expenses at once from KCExpenses format or GPay export files.",
    details: "Use this page when you have a file full of expenses to bring in at once. Two import types are supported: KCExpenses (a CSV/XLSX format for bank/credit card statements) and GPay (Google Pay transaction history export). Upload the file, preview the parsed data with checkboxes for merchant name mapping, then import everything in one click. After import, visit Review Duplicates to clean up any overlapping entries.",
    controls: [
      { name: "Tab selector — KCExpenses", description: "Switch to the KCExpenses format importer for bank/credit card statement files.", location: "Top of the import area" },
      { name: "Tab selector — GPay", description: "Switch to the GPay importer for Google Pay transaction exports.", location: "Top of the import area" },
      { name: "Choose File button", description: "Opens a file picker dialog to select a CSV, XLSX, or GPay export file.", location: "Import area" },
      { name: "Checkbox for merchant mappings", description: "Toggle individual merchant name mappings on or off before importing.", location: "Preview table, after file is parsed" },
      { name: "Import All button", description: "Imports all parsed transactions into the expenses ledger.", location: "Bottom of the preview area" },
      { name: "Cancel button", description: "Aborts the import and returns to the expenses page.", location: "Bottom of the preview area" },
      { name: "View Imported button", description: "Navigates to the expenses ledger filtered to show only the just-imported records.", location: "Shown after a successful import" },
      { name: "Import Another button", description: "Clears the current import and lets you upload a new file.", location: "Shown after a successful import" },
    ],
    workflow: [
      { step: "Select import type", description: "Choose KCExpenses (for bank/CC statements) or GPay (for Google Pay exports)." },
      { step: "Upload your file", description: "Click 'Choose File' and select your CSV, XLSX, or GPay export.", example: "Upload 'January_Bank_Statement.csv' from your HDFC account." },
      { step: "Preview and configure", description: "Review the parsed transactions. Check or uncheck merchant mappings as needed.", example: "Uncheck 'STARBUCKS INDIA → Starbucks' if you prefer the raw name." },
      { step: "Confirm import", description: "Click 'Import All' to add everything to your expenses ledger." },
      { step: "Post-import actions", description: "Use 'View Imported' to verify results, or 'Import Another' to start a new batch." },
    ],
    relatedFeatures: [
      { name: "Expenses Ledger", description: "Imported expenses appear in the main expense list." },
      { name: "Merchants", description: "Merchant name mappings from imports can be reviewed and saved." },
      { name: "Review Duplicates", description: "Always check this page after import to merge any duplicate entries." },
    ],
  },

  "/expenses/review-duplicates": {
    title: "Review Duplicates",
    summary: "Catch and resolve expense entries that may have been imported twice.",
    details: "After bulk imports or GPay syncs, the same transaction may appear twice. This page automatically flags potential duplicates based on matching date, amount, and vendor. Review each set, select which ones to keep or delete, and clean up your ledger. Use the search input to find specific duplicates, and navigate through pages using the pagination controls.",
    controls: [
      { name: "Search input", description: "Free-text search across flagged duplicate entries.", location: "Top of the page" },
      { name: "Keep (N) button", description: "Marks the selected entries as legitimate (not duplicates) and removes them from the review list.", location: "Next to each duplicate group, N = number of selected rows" },
      { name: "Delete (N) button", description: "Permanently deletes the selected entries from the expense ledger.", location: "Next to each duplicate group, N = number of selected rows" },
      { name: "Checkboxes (per row)", description: "Select individual expense rows within a duplicate group.", location: "Left side of each row" },
      { name: "Select All checkbox", description: "Toggle all rows in the current duplicate group on or off.", location: "Top of each duplicate group" },
      { name: "Pagination Prev button", description: "Go to the previous page of duplicate groups.", location: "Bottom of the page" },
      { name: "Pagination Next button", description: "Go to the next page of duplicate groups.", location: "Bottom of the page" },
    ],
    workflow: [
      { step: "Review flagged duplicates", description: "Each group shows 2+ expenses that look similar. Compare date, amount, and vendor side by side.", example: "₹500 'Swiggy' on 15-Jan appears twice — one from manual entry, one from GPay sync." },
      { step: "Keep legitimate ones", description: "Select the genuine entries and click 'Keep' to leave them in your ledger.", example: "Keep the original ₹500 Swiggy expense and delete the GPay duplicate." },
      { step: "Delete true duplicates", description: "Select the extra entries and click 'Delete' to permanently remove them." },
    ],
    relatedFeatures: [
      { name: "Expenses Ledger", description: "Changes here update your main expense list." },
      { name: "Bulk Import", description: "Always check this page after a bulk import to clean up." },
    ],
  },

  "/expenses/archive": {
    title: "Archived Expenses",
    summary: "View and manage soft-deleted expenses — restore or permanently delete them.",
    details: "Expenses moved to the archive are hidden from the main ledger but still exist in the database. This page shows all archived entries. You can select individual or bulk entries to restore them back to the active ledger, or permanently delete them from the database. Use the Clear button to quickly deselect all rows.",
    controls: [
      { name: "Checkboxes (per row)", description: "Select individual archived expenses for batch operations.", location: "Left side of each row" },
      { name: "Select All checkbox", description: "Toggle all visible archived entries on or off.", location: "Table header, first column" },
      { name: "Restore Selected button", description: "Moves all selected expenses back to the active expenses ledger.", location: "Top toolbar, visible when rows are selected" },
      { name: "Delete Permanently button", description: "Permanently removes selected expenses from the database (irreversible).", location: "Top toolbar, visible when rows are selected" },
      { name: "Clear button", description: "Unchecks all selected rows.", location: "Top toolbar" },
      { name: "Restore icon (per row)", description: "Restores a single expense back to the active ledger.", location: "Each row" },
      { name: "Delete icon (per row)", description: "Permanently deletes a single archived expense.", location: "Each row" },
    ],
    workflow: [
      { step: "Auto-purge old records", description: "Expenses older than a configurable threshold are automatically archived to keep the main list clean." },
      { step: "Restore selected", description: "Select the entries you want back and click 'Restore Selected'.", example: "Restore an accidentally archived ₹2,000 electricity bill." },
      { step: "Permanently delete", description: "Select entries you are sure about and click 'Delete Permanently'.", example: "Delete old test entries that are no longer needed." },
    ],
    relatedFeatures: [
      { name: "Expenses Ledger", description: "Archived entries are hidden from the main view but can be restored here." },
    ],
  },

  "/expenses/merchants": {
    title: "Merchant Mappings",
    summary: "Standardize vendor names from imports — map raw names to clean, categorized merchants.",
    details: "When you import from a bank statement or GPay, vendor names can be inconsistent ('STARBUCKS INDIA', 'Starbucks Coffee'). This page lets you view unmapped merchants in one tab and see all existing mappings in another. Assign an expense type, sub-category, and person to each merchant so future imports are automatically categorized. Use the upload button to bulk-import a mappings file.",
    controls: [
      { name: "Unmapped tab", description: "Shows merchants that have not been mapped yet — needs your attention.", location: "Tab bar at the top" },
      { name: "All Mappings tab", description: "Shows all existing merchant mappings for review and editing.", location: "Tab bar at the top" },
      { name: "Upload mappings button", description: "Upload a CSV/XLSX file with pre-defined merchant mappings.", location: "Top toolbar" },
      { name: "Dismiss (N) button", description: "Removes selected unmapped merchants from the review list without saving mappings.", location: "Top toolbar, Unmapped tab, N = number selected" },
      { name: "Save Mappings (N) button", description: "Saves the selected merchant mappings with their assigned categories.", location: "Top toolbar, Unmapped tab, N = number selected" },
      { name: "Checkboxes", description: "Select individual merchants to map or dismiss.", location: "Left side of each row" },
      { name: "Expense Type dropdown (per row)", description: "Assign an expense category to each merchant (e.g., Food, Transport, Utilities).", location: "Each row in Unmapped tab" },
      { name: "Sub Category input (per row)", description: "Assign a sub-category to each merchant for granular tracking.", location: "Each row in Unmapped tab" },
      { name: "Person input (per row)", description: "Assign a default person/contact to each merchant.", location: "Each row in Unmapped tab" },
      { name: "Search input", description: "Search across all merchant mappings.", location: "Top of the All Mappings tab" },
      { name: "Edit icon (per row)", description: "Opens an edit dialog to modify an existing merchant mapping.", location: "Each row in All Mappings tab" },
    ],
    workflow: [
      { step: "View unmapped merchants", description: "Go to the Unmapped tab to see all merchants from imports that have no mapping yet.", example: "See 'SWIGGY BLR', 'ZOMATO MUM' as unmapped." },
      { step: "Assign categories", description: "For each merchant, select an expense type (e.g., Food), optional sub-category and person.", example: "Map 'SWIGGY BLR' → Type: Food, Sub: Restaurant Delivery." },
      { step: "Save mappings", description: "Select the rows you have configured and click 'Save Mappings'.", example: "Save 15 merchant mappings at once." },
    ],
    relatedFeatures: [
      { name: "Expenses Ledger", description: "Merchant mappings auto-categorize expenses during import." },
      { name: "Bulk Import", description: "Import checks merchant mappings to clean up vendor names." },
      { name: "Reports", description: "Clean vendor data means more accurate category reports." },
    ],
  },

  "/budgets": {
    title: "Budgets",
    summary: "Set monthly spending limits for each category and track your progress with visual bars.",
    details: "Budgets help you plan how much to spend on each category every month. Set a limit for Food, Transport, Shopping, and more. Each budget shows a progress bar (green → yellow → red) indicating how much you have spent vs your limit, plus what percentage of your total income it represents. Use the month/year selectors to review past months or plan future ones. Export your budget data to XLSX for offline review.",
    controls: [
      { name: "Add Budget button", description: "Opens a dialog to create a new budget for a category.", location: "Top-right of the page" },
      { name: "Export button", description: "Downloads budget data as an XLSX file.", location: "Top toolbar" },
      { name: "Month dropdown", description: "Select the month to view or set budgets for.", location: "Top of the budget list" },
      { name: "Year dropdown", description: "Select the financial year.", location: "Next to Month dropdown" },
      { name: "Category dropdown (dialog)", description: "Choose which expense category this budget applies to.", location: "Inside Add Budget dialog" },
      { name: "Monthly Limit input (dialog)", description: "Set the maximum amount you want to spend in this category per month.", location: "Inside Add Budget dialog" },
    ],
    workflow: [
      { step: "Select month and year", description: "Use the Month and Year dropdowns to pick the period you want to plan or review.", example: "Select 'March' and '2026' to set March 2026 budgets." },
      { step: "View progress bars", description: "Each budget shows a progress bar. Green = under 50%, Yellow = 50–90%, Red = over 90% or exceeded.", example: "Food budget of ₹10,000 — spent ₹7,500 → yellow warning." },
      { step: "Add budgets", description: "Click 'Add Budget', pick a category, set your limit, and save.", example: "Add a Transport budget of ₹5,000." },
      { step: "Export", description: "Click 'Export' to download the current month's budget data as Excel." },
    ],
    relatedFeatures: [
      { name: "Expenses Ledger", description: "Your actual spending is compared against budgets automatically." },
      { name: "Income Sources", description: "Total income is used to calculate budget percentages." },
      { name: "Reports", description: "Budget performance is included in the Reports section." },
      { name: "Financial Health", description: "How well you stick to budgets is part of your Health Score." },
    ],
  },

  "/investments": {
    title: "Investments",
    summary: "Track your complete portfolio — stocks, mutual funds, FDs, PPF, NPS, gold, crypto, and more.",
    details: "This page manages everything you have invested in. Different investment types have their own fields (buy price, quantity, purchase date, current value, return rate). Tabs separate 'All', 'Stocks', and 'Other' investments for quick filtering. Returns are displayed per item. Investment data feeds into Net Worth, Tax (capital gains), and can be linked to Goals. Export your portfolio to XLSX anytime.",
    controls: [
      { name: "Add Investment button", description: "Opens a dialog to create a new investment record.", location: "Top-right of the page" },
      { name: "Export button", description: "Downloads the full portfolio as an XLSX file.", location: "Top toolbar" },
      { name: "All tab", description: "Shows every investment across all types.", location: "Tab bar" },
      { name: "Stocks tab", description: "Filters the list to show only stock investments.", location: "Tab bar" },
      { name: "Others tab", description: "Shows all non-stock investments (MF, FD, PPF, NPS, gold, crypto, etc.).", location: "Tab bar" },
      { name: "Edit button (per item)", description: "Opens the investment dialog pre-filled with that item's data.", location: "Each row" },
      { name: "Delete button (per item)", description: "Removes the investment after confirmation.", location: "Each row" },
      { name: "Type dropdown (dialog)", description: "Select investment type: Stocks, Mutual Funds, FD, PPF, NPS, Gold, Silver, Real Estate, Crypto, Bonds, Others.", location: "Inside Add/Edit dialog" },
      { name: "Name input (dialog)", description: "Name of the investment (e.g., 'Reliance Industries' or 'HDFC Balanced Fund').", location: "Inside Add/Edit dialog" },
      { name: "Symbol input (dialog)", description: "Stock ticker or fund symbol (e.g., 'RELIANCE', 'HDFCBAL').", location: "Inside Add/Edit dialog" },
      { name: "Quantity input (dialog)", description: "Number of units or shares purchased.", location: "Inside Add/Edit dialog" },
      { name: "Buy Price input (dialog)", description: "Price per unit at the time of purchase.", location: "Inside Add/Edit dialog" },
      { name: "Invested Amount input (dialog)", description: "Total amount invested (Quantity × Buy Price).", location: "Inside Add/Edit dialog" },
      { name: "Current Value input (dialog)", description: "Current market value of this holding.", location: "Inside Add/Edit dialog" },
      { name: "Purchase Date input (dialog)", description: "Date when the investment was purchased.", location: "Inside Add/Edit dialog" },
      { name: "Return Rate display (dialog)", description: "Auto-calculated return rate based on invested amount and current value.", location: "Inside Add/Edit dialog" },
    ],
    workflow: [
      { step: "View portfolio summary", description: "The header shows total invested amount, current value, and overall return.", example: "Invested ₹5,00,000, Current Value ₹6,20,000 → Return +24%." },
      { step: "Add investments", description: "Click 'Add Investment', choose the type, enter purchase details and current value.", example: "Add 100 shares of Reliance at ₹2,500 each, invested ₹2,50,000." },
      { step: "Edit or delete", description: "Use per-row edit icon to update values or delete to remove outdated entries." },
      { step: "Export portfolio", description: "Click 'Export' to download your complete portfolio as an Excel file." },
    ],
    relatedFeatures: [
      { name: "Goals", description: "Investments can be linked to track goal progress automatically." },
      { name: "Auto-Link", description: "Investment-tagged expenses suggest creating investment records." },
      { name: "Net Worth", description: "Your investments are part of your net worth calculation." },
      { name: "Tax", description: "Capital gains from investments are used in tax calculations." },
      { name: "Reports", description: "Investment performance shows up in the Reports section." },
    ],
  },

  "/goals": {
    title: "Financial Goals",
    summary: "Set and track financial targets — emergency fund, vacation, retirement, or any big purchase.",
    details: "Goals let you define what you are saving for. Each goal has a target amount, current savings, target date, category (Emergency Fund, Vacation, Retirement, Education, Home, Vehicle, Wedding, Other), term (Short/Medium/Long), priority (P0/P1/P2/P3), and an optional monthly contribution target. Progress bars show how close you are. Link investments to a goal for automatic progress tracking. Export your goals to XLSX.",
    controls: [
      { name: "Add Goal button", description: "Opens a dialog to create a new financial goal.", location: "Top-right of the page" },
      { name: "Export button", description: "Downloads all goals as an XLSX file.", location: "Top toolbar" },
      { name: "Edit button (per card)", description: "Opens the goal dialog pre-filled with that goal's data.", location: "Each goal card" },
      { name: "Delete button (per card)", description: "Removes the goal after confirmation.", location: "Each goal card" },
      { name: "Name input (dialog)", description: "Label for your goal (e.g., 'Buy a car' or 'Emergency Fund').", location: "Inside Add/Edit dialog" },
      { name: "Target Amount input (dialog)", description: "How much money you need to achieve this goal.", location: "Inside Add/Edit dialog" },
      { name: "Current Savings input (dialog)", description: "How much you have already saved toward this goal.", location: "Inside Add/Edit dialog" },
      { name: "Target Date input (dialog)", description: "When you want to achieve this goal.", location: "Inside Add/Edit dialog" },
      { name: "Category dropdown (dialog)", description: "Goal category — Emergency Fund, Vacation, Retirement, Education, Home, Vehicle, Wedding, Other.", location: "Inside Add/Edit dialog" },
      { name: "Term dropdown (dialog)", description: "Short-term (<1 year), Medium-term (1–5 years), or Long-term (>5 years).", location: "Inside Add/Edit dialog" },
      { name: "Priority dropdown (dialog)", description: "P0 (Critical), P1 (Important), P2 (Nice to have), P3 (Optional).", location: "Inside Add/Edit dialog" },
      { name: "Type input (dialog)", description: "Optional sub-type or tag for further classification.", location: "Inside Add/Edit dialog" },
      { name: "Description textarea (dialog)", description: "Free-text notes about the goal.", location: "Inside Add/Edit dialog" },
      { name: "Monthly Contribution input (dialog)", description: "Optional target monthly contribution amount.", location: "Inside Add/Edit dialog" },
    ],
    workflow: [
      { step: "Add goals with progress tracking", description: "Click 'Add Goal', set a name, target amount, current savings, and target date.", example: "Goal: 'Emergency Fund' — Target ₹3,00,000, Saved ₹1,20,000, Target Date Dec 2026." },
      { step: "Edit or delete goals", description: "Update current savings as you contribute, or delete completed/abandoned goals." },
      { step: "Link investments", description: "Connect investments to goals so progress updates automatically as investments grow." },
      { step: "Export goals", description: "Click 'Export' to download all goals and progress as an Excel file." },
    ],
    relatedFeatures: [
      { name: "Investments", description: "Link investments to track goal progress automatically." },
      { name: "Dashboard", description: "Active goals appear as a stat card on your home screen." },
      { name: "Reports", description: "Goal progress is tracked in the Goals tab of Reports." },
      { name: "Financial Health", description: "Goal progress contributes 10% to your Health Score." },
    ],
  },

  "/bank-accounts": {
    title: "Bank Accounts",
    summary: "View all your linked bank accounts with balances and sync options.",
    details: "This page shows all your bank accounts in a card layout. Each card displays the account name, type (Savings/Current), account number (masked), bank name, and current balance. Click 'Sync Balances' to update from Gmail alerts, or click an individual account card to view its detailed page with FDs and transactions.",
    controls: [
      { name: "Sync Balances button", description: "Scans Gmail for bank balance alerts and updates account balances automatically.", location: "Top-right of the page" },
      { name: "Add Account link", description: "Navigates to /settings/bank-accounts to add a new bank account.", location: "Top of the page or settings link" },
      { name: "Account card click", description: "Click any account card to navigate to its detail page with FDs and transactions.", location: "Each account card" },
    ],
    workflow: [
      { step: "View accounts with balances", description: "All linked accounts are displayed as cards with current balances.", example: "HDFC Savings — ₹1,50,000, ICICI Current — ₹3,00,000." },
      { step: "Sync from Gmail", description: "Click 'Sync Balances' to automatically read balance emails from Gmail and update each account." },
      { step: "Click for details", description: "Click any account card to go to its detail page to manage FDs and view transactions." },
    ],
    relatedFeatures: [
      { name: "Bank Account Detail", description: "Click an account to view its FDs and transaction history." },
      { name: "Settings / Bank Accounts", description: "Add or remove bank accounts from Settings." },
      { name: "Net Worth", description: "Account balances contribute to your net worth." },
    ],
  },

  "/bank-accounts/[id]": {
    title: "Bank Account Detail",
    summary: "View and manage a single bank account — edit balance, add FDs, and browse transactions.",
    details: "This is the detail view for a specific bank account. Two tabs separate FDs and Transactions. In the FD tab, you can add new fixed deposits (amount, rate, date, duration) and delete existing ones. In the Transactions tab, you can search and browse all expenses and income linked to this account. Use the Edit Balance button to manually update the current balance.",
    controls: [
      { name: "Back arrow", description: "Returns to the main Bank Accounts listing page.", location: "Top-left of the page" },
      { name: "Edit Balance button", description: "Opens an inline or dialog input to update the account's current balance.", location: "Near the account header balance" },
      { name: "Add FD toggle", description: "Shows or hides the form to create a new fixed deposit.", location: "FDs tab" },
      { name: "Save button (balance)", description: "Saves the manually entered balance update.", location: "Balance input area" },
      { name: "Save button (FD)", description: "Saves the new FD record with entered amount, rate, date, and duration.", location: "FD form" },
      { name: "Trash icon (per FD)", description: "Deletes an existing fixed deposit record after confirmation.", location: "Each FD row" },
      { name: "Search input (transactions)", description: "Free-text search across all transactions linked to this account.", location: "Transactions tab" },
      { name: "FDs tab", description: "Shows all fixed deposits for this account with details.", location: "Tab bar" },
      { name: "Transactions tab", description: "Shows all income and expense transactions linked to this account.", location: "Tab bar" },
    ],
    workflow: [
      { step: "View account details", description: "See the account name, type, number, and current balance at a glance." },
      { step: "Edit balance", description: "Click 'Edit Balance' to manually update the balance if auto-sync is off or inaccurate.", example: "Update HDFC balance from ₹1,50,000 to ₹1,65,000 after a deposit." },
      { step: "Add and manage FDs", description: "Toggle 'Add FD', fill in the details, and save. Use the trash icon to remove FDs.", example: "Add FD of ₹1,00,000 at 7.2% for 12 months, maturity ₹1,07,200." },
      { step: "View transactions", description: "Switch to the Transactions tab and search for specific debits or credits.", example: "Search 'Swiggy' to find all food expenses from this account." },
    ],
    relatedFeatures: [
      { name: "Bank Accounts", description: "Back to the main bank accounts listing." },
      { name: "Settings / Bank Accounts", description: "Edit account details like name, type, and account number." },
      { name: "Net Worth", description: "Account balance and FD values contribute to net worth." },
    ],
  },

  "/assets": {
    title: "Physical Assets",
    summary: "Track physical things you own — property, gold, silver, vehicles, and equipment.",
    details: "Assets are tangible items of value. Each asset records its name, type (Property, Building, Gold, Silver, Vehicle, Equipment, Art, Jewelry, Other), current value, purchase price, purchase date, quantity, unit, status (Owned, Sold, Under Maintenance), location, and notes. Type-based tabs let you filter by category. Asset values feed into your Net Worth calculation.",
    controls: [
      { name: "Add Asset button", description: "Opens a dialog to create a new asset record.", location: "Top-right of the page" },
      { name: "All tab", description: "Shows all assets across every type category.", location: "Tab bar" },
      { name: "Properties tab", description: "Filters to show only real estate properties.", location: "Tab bar" },
      { name: "Buildings tab", description: "Filters to show only building assets.", location: "Tab bar" },
      { name: "Gold tab", description: "Filters to show only gold assets.", location: "Tab bar" },
      { name: "Silver tab", description: "Filters to show only silver assets.", location: "Tab bar" },
      { name: "Other type tabs", description: "Additional tabs for Vehicle, Equipment, Art, Jewelry, etc. as available.", location: "Tab bar" },
      { name: "Edit button (per card)", description: "Opens the asset dialog pre-filled with that asset's data.", location: "Each asset card" },
      { name: "Delete button (per card)", description: "Removes the asset after confirmation.", location: "Each asset card" },
      { name: "Name input (dialog)", description: "Asset name (e.g., '2 BHK Flat in Koramangala').", location: "Inside Add/Edit dialog" },
      { name: "Type dropdown (dialog)", description: "Asset type — Property, Building, Gold, Silver, Vehicle, Equipment, Art, Jewelry, Other.", location: "Inside Add/Edit dialog" },
      { name: "Current Value input (dialog)", description: "Current estimated market value.", location: "Inside Add/Edit dialog" },
      { name: "Purchase Price input (dialog)", description: "Original price paid for the asset.", location: "Inside Add/Edit dialog" },
      { name: "Purchase Date input (dialog)", description: "When the asset was acquired.", location: "Inside Add/Edit dialog" },
      { name: "Quantity input (dialog)", description: "Number of units (e.g., 10 grams of gold, 1 apartment).", location: "Inside Add/Edit dialog" },
      { name: "Unit dropdown (dialog)", description: "Unit of measurement — Grams, Kilograms, Square Feet, Number, etc.", location: "Inside Add/Edit dialog" },
      { name: "Status dropdown (dialog)", description: "Current status — Owned, Sold, Under Maintenance.", location: "Inside Add/Edit dialog" },
      { name: "Location input (dialog)", description: "Where the asset is located.", location: "Inside Add/Edit dialog" },
      { name: "Notes textarea (dialog)", description: "Free-text notes about the asset.", location: "Inside Add/Edit dialog" },
    ],
    workflow: [
      { step: "Add assets", description: "Click 'Add Asset', choose the type, enter purchase and current values.", example: "Add '24K Gold — 20 grams' with purchase price ₹1,20,000, current value ₹1,50,000." },
      { step: "Track value changes", description: "Update the current value over time — the page calculates gain or loss automatically.", example: "Gold purchased at ₹6,000/gram, now ₹7,500/gram → +25%." },
      { step: "Organize by type tabs", description: "Use the tab bar to view assets by category for focused review." },
    ],
    relatedFeatures: [
      { name: "Investments", description: "Assets (physical) and investments (financial) together make up what you own." },
      { name: "Net Worth", description: "Asset values add to your net worth." },
      { name: "Reports", description: "Asset summary is included in the Reports section." },
    ],
  },

  "/net-worth": {
    title: "Net Worth",
    summary: "What you own minus what you owe — the single most important view of your financial health.",
    details: "Net Worth is everything you own (assets + investments + bank balances + insurance surrender value + business profit) minus everything you owe (loan balances). The page shows a two-column layout: green for assets (what you own), red for liabilities (what you owe), with the net difference prominently in the center. Each item is clickable to navigate to its source module. Use the 'Add' buttons to quickly create new assets or liabilities from this page.",
    controls: [
      { name: "Add for Assets button", description: "Opens a dialog to add a new net worth asset (name, type, amount, notes).", location: "Assets column" },
      { name: "Add for Liabilities button", description: "Opens a dialog to add a new liability (name, type, amount, interest rate, due date, notes).", location: "Liabilities column" },
      { name: "Trash icon (per item)", description: "Removes the asset or liability item after confirmation.", location: "Each item row" },
      { name: "Name input (dialog)", description: "Label for the asset or liability.", location: "Inside Add Asset/Liability dialog" },
      { name: "Type dropdown (dialog)", description: "Asset types: Cash, Bank, Investment, Property, Vehicle, Gold, Other. Liability types: Loan, Credit Card, Other.", location: "Inside Add Asset/Liability dialog" },
      { name: "Amount input (dialog)", description: "Current value (for assets) or outstanding balance (for liabilities).", location: "Inside Add Asset/Liability dialog" },
      { name: "Notes input (dialog)", description: "Optional description.", location: "Inside Add Asset/Liability dialog" },
      { name: "Interest Rate input (dialog — liabilities)", description: "The interest rate on this liability.", location: "Inside Add Liability dialog" },
      { name: "Due Date input (dialog — liabilities)", description: "When this liability is due or its next payment date.", location: "Inside Add Liability dialog" },
    ],
    workflow: [
      { step: "View net worth", description: "See Total Assets (green) minus Total Liabilities (red) equals your Net Worth.", example: "Assets ₹85,00,000 − Liabilities ₹25,00,000 = Net Worth ₹60,00,000." },
      { step: "Add assets or liabilities", description: "Click the respective 'Add' button to quickly add items from this page." },
      { step: "Delete items", description: "Use the trash icon to remove items that are no longer relevant." },
    ],
    relatedFeatures: [
      { name: "Investments", description: "Financial investments add to what you own." },
      { name: "Assets", description: "Physical assets add to what you own." },
      { name: "Loans", description: "Loan balances are what you owe." },
      { name: "Bank Accounts", description: "Bank balances add to what you own." },
      { name: "Insurance", description: "Policies with surrender value add to what you own." },
    ],
  },

  "/subscriptions": {
    title: "Subscriptions",
    summary: "Track all recurring services — Netflix, Prime, gym, SaaS apps — and control spending.",
    details: "Subscriptions tracks everything you pay for regularly. Each entry captures the service name, provider, amount, billing cycle (Monthly, Quarterly, Half-Yearly, Yearly), next due date, category, and status. Toggle a subscription active or paused with a single switch. Delete old subscriptions you no longer use. The page calculates total monthly and yearly spend so you can see the full impact.",
    controls: [
      { name: "Add Subscription button", description: "Opens a dialog to create a new subscription.", location: "Top-right of the page" },
      { name: "Status toggle (active/paused)", description: "Toggle switch to mark a subscription as active or paused.", location: "Each subscription row" },
      { name: "More actions button", description: "Opens a menu with the Delete option.", location: "Each subscription row" },
      { name: "Name input (dialog)", description: "Service name (e.g., 'Netflix Premium').", location: "Inside Add/Edit dialog" },
      { name: "Provider input (dialog)", description: "Provider or company name (e.g., 'Netflix Inc.').", location: "Inside Add/Edit dialog" },
      { name: "Amount input (dialog)", description: "Billing amount per cycle.", location: "Inside Add/Edit dialog" },
      { name: "Billing Cycle dropdown (dialog)", description: "Monthly, Quarterly, Half-Yearly, or Yearly.", location: "Inside Add/Edit dialog" },
      { name: "Next Due Date input (dialog)", description: "When the next payment is due.", location: "Inside Add/Edit dialog" },
      { name: "Category dropdown (dialog)", description: "Subscription category — Entertainment, Productivity, Health, Finance, Utilities, Other.", location: "Inside Add/Edit dialog" },
      { name: "Notes textarea (dialog)", description: "Optional notes.", location: "Inside Add/Edit dialog" },
    ],
    workflow: [
      { step: "View subscriptions with due dates", description: "See all subscriptions sorted by next due date, with monthly and yearly totals at the top.", example: "Netflix ₹799/mo, Prime ₹1499/yr → Total ₹11,087/yr." },
      { step: "Add new subscription", description: "Click 'Add Subscription', fill in the details, set billing cycle and next due date." },
      { step: "Toggle status", description: "Use the toggle to pause a subscription (bills will not count in totals) or reactivate it." },
      { step: "Delete old subscriptions", description: "Use the More actions menu to delete subscriptions you have cancelled." },
    ],
    relatedFeatures: [
      { name: "Reminders", description: "Subscription renewal dates auto-create reminders." },
      { name: "Expenses Ledger", description: "Subscription payments can also be recorded as expenses." },
      { name: "Reports", description: "Subscription spending analysis is included in Reports." },
    ],
  },

  "/insurance": {
    title: "Insurance Policies",
    summary: "Manage all your policies — health, life, motor — and never miss a renewal date.",
    details: "Insurance stores all your policies in one place. Each record includes the policy name, type (Health, Term Life, Motor, Other), provider, policy number, sum assured, premium amount, premium frequency, start date, renewal date, nominee, and notes. Filter tabs let you view by type. Renewal dates auto-create reminders. Premiums are tax-deductible (Section 80C for life, 80D for health). Policies with surrender value contribute to Net Worth.",
    controls: [
      { name: "Add Insurance button", description: "Opens a dialog to create a new insurance policy.", location: "Top-right of the page" },
      { name: "All tab", description: "Shows all insurance policies regardless of type.", location: "Tab bar" },
      { name: "Health tab", description: "Filters to show only health insurance policies.", location: "Tab bar" },
      { name: "Term Life tab", description: "Filters to show only term life insurance policies.", location: "Tab bar" },
      { name: "Motor tab", description: "Filters to show only motor/vehicle insurance policies.", location: "Tab bar" },
      { name: "Other tab", description: "Filters to show other insurance types.", location: "Tab bar" },
      { name: "Edit button (per row)", description: "Opens the policy dialog pre-filled with that policy's data.", location: "Each row" },
      { name: "Delete button (per row)", description: "Removes the policy after confirmation.", location: "Each row" },
      { name: "Policy Name input (dialog)", description: "Name or label for the policy (e.g., 'HDFC Life ProHealth').", location: "Inside Add/Edit dialog" },
      { name: "Type dropdown (dialog)", description: "Health, Term Life, Motor, or Other.", location: "Inside Add/Edit dialog" },
      { name: "Provider input (dialog)", description: "Insurance company name (e.g., 'HDFC Life', 'ICICI Lombard').", location: "Inside Add/Edit dialog" },
      { name: "Policy Number input (dialog)", description: "Your unique policy number.", location: "Inside Add/Edit dialog" },
      { name: "Sum Assured input (dialog)", description: "The coverage amount of the policy.", location: "Inside Add/Edit dialog" },
      { name: "Premium input (dialog)", description: "Premium amount per cycle.", location: "Inside Add/Edit dialog" },
      { name: "Premium Frequency dropdown (dialog)", description: "Monthly, Quarterly, Half-Yearly, or Yearly.", location: "Inside Add/Edit dialog" },
      { name: "Start Date input (dialog)", description: "When the policy was started or will start.", location: "Inside Add/Edit dialog" },
      { name: "Renewal Date input (dialog)", description: "When the policy needs to be renewed.", location: "Inside Add/Edit dialog" },
      { name: "Nominee input (dialog)", description: "Name of the nominee for the policy.", location: "Inside Add/Edit dialog" },
      { name: "Notes textarea (dialog)", description: "Optional notes or comments.", location: "Inside Add/Edit dialog" },
    ],
    workflow: [
      { step: "View policies with summary", description: "The header shows total policies, total premium outgo, and total sum assured.", example: "3 policies, ₹45,000/yr premium, ₹50,00,000 total coverage." },
      { step: "Filter by type", description: "Use the tab bar to view Health, Life, Motor, or Other policies separately." },
      { step: "Add, edit, or delete policies", description: "Create new policies, update details when you renew, or remove old ones." },
    ],
    relatedFeatures: [
      { name: "Auto-Link", description: "Insurance-tagged expenses can be linked to your policies automatically." },
      { name: "Reminders", description: "Policy renewal dates auto-create reminders." },
      { name: "Net Worth", description: "Policies with surrender value add to net worth." },
      { name: "Tax", description: "Premiums are deductible under Section 80C (life) and 80D (health)." },
    ],
  },

  "/loans": {
    title: "Loans",
    summary: "Track every loan you have — home, car, personal, education — and monitor outstanding balances.",
    details: "Loans tracks all your borrowings. Each entry records the name, type (Home, Car, Personal, Education, Vehicle, Electronics, Equipment, Other), principal amount, interest rate, tenure (months), EMI amount, lender, start date, and notes. The EMI is auto-calculated from principal, rate, and tenure, but can be overridden manually. Outstanding balances feed into Net Worth as liabilities. Home loan interest qualifies for tax deduction under Section 24(b).",
    controls: [
      { name: "Add Loan button", description: "Opens a dialog to create a new loan record.", location: "Top-right of the page" },
      { name: "Edit button (per row)", description: "Opens the loan dialog pre-filled with that loan's data.", location: "Each row" },
      { name: "Delete button (per row)", description: "Removes the loan after confirmation.", location: "Each row" },
      { name: "Name input (dialog)", description: "Loan name (e.g., 'Home Loan — SBI').", location: "Inside Add/Edit dialog" },
      { name: "Type dropdown (dialog)", description: "Home, Car, Personal, Education, Vehicle, Electronics, Equipment, Other.", location: "Inside Add/Edit dialog" },
      { name: "Principal input (dialog)", description: "Original loan amount borrowed.", location: "Inside Add/Edit dialog" },
      { name: "Interest Rate input (dialog)", description: "Annual interest rate in percentage.", location: "Inside Add/Edit dialog" },
      { name: "Tenure input (dialog)", description: "Loan tenure in months.", location: "Inside Add/Edit dialog" },
      { name: "EMI display/input (dialog)", description: "Auto-calculated EMI from principal, rate, and tenure. Can be overridden.", location: "Inside Add/Edit dialog" },
      { name: "Lender input (dialog)", description: "Bank or lender name (e.g., 'SBI', 'HDFC Bank').", location: "Inside Add/Edit dialog" },
      { name: "Start Date input (dialog)", description: "When the loan was disbursed.", location: "Inside Add/Edit dialog" },
      { name: "Notes textarea (dialog)", description: "Optional notes.", location: "Inside Add/Edit dialog" },
    ],
    workflow: [
      { step: "View loans with summary", description: "Header cards show total outstanding, total monthly EMI, and number of active loans.", example: "Home Loan ₹25,00,000 outstanding, EMI ₹28,000 → Total EMI ₹28,000/mo." },
      { step: "Add a new loan", description: "Click 'Add Loan', fill in principal, rate, tenure, and the EMI is calculated automatically.", example: "Car Loan ₹8,00,000 @ 9% for 60 months → EMI ₹16,607." },
      { step: "EMI auto-calculated", description: "The system calculates EMI using the standard formula. Override if your actual EMI differs.", example: "Your bank says EMI is ₹16,700 — override the calculated value to match." },
      { step: "Edit or delete loans", description: "Update loan details when rates change or delete fully repaid loans." },
    ],
    relatedFeatures: [
      { name: "Auto-Link", description: "Expenses matching your loan provider suggest linking to EMI." },
      { name: "Net Worth", description: "Outstanding loan balances are your liabilities." },
      { name: "Financial Health", description: "Your debt-to-income ratio is part of your Health Score." },
      { name: "Tax", description: "Home loan interest is tax-deductible under Section 24(b)." },
    ],
  },

  "/insights": {
    title: "Deep Insights",
    summary: "Visual analysis of your finances — trends, category breakdowns, YoY comparisons, and AI suggestions.",
    details: "Insights goes beyond the Dashboard with deeper, interactive charts. Filter by period (All Time, Year, Quarter, Month, or Custom) to analyze specific timeframes. Click any category in a chart to drill into its details. Use the Year-over-Year comparison to see how your finances have changed. The AI suggests optimization opportunities — like 'Set a budget for Dining Out' — with a direct 'Set Budget' action.",
    controls: [
      { name: "Period dropdown", description: "Filter analysis by All Time, Year, Quarter, Month, or Custom date range.", location: "Top of the page" },
      { name: "Year dropdown", description: "Select a specific year for analysis.", location: "Next to Period dropdown" },
      { name: "Category click in charts", description: "Click any category segment or bar to drill into that category's detailed breakdown.", location: "Interactive charts" },
      { name: "YoY Category dropdown", description: "Select a category to compare its spending year-over-year.", location: "YoY comparison section" },
      { name: "Set Budget button (on suggestions)", description: "One-click action to create a budget for a suggested category.", location: "AI suggestion cards" },
    ],
    workflow: [
      { step: "Filter by period", description: "Use the Period and Year dropdowns to narrow the analysis scope.", example: "Select 'Q1 2026' to analyze January–March trends." },
      { step: "View charts and drill down", description: "Review trend lines, bar charts, and pie charts. Click any category to see sub-breakdowns.", example: "Click 'Food' in the pie chart to see Restaurant vs Grocery split." },
      { step: "Review YoY comparisons", description: "Select a category in the YoY dropdown to compare this year's spending vs last year.", example: "Compare 'Travel' spend in 2026 vs 2025." },
      { step: "Check optimization suggestions", description: "AI-generated suggestions appear with 'Set Budget' buttons for quick action.", example: "Suggestion: 'You spent ₹8,000 on Dining Out — set a budget of ₹5,000.'" },
    ],
    relatedFeatures: [
      { name: "Expenses Ledger", description: "Insights analyzes the same data from your expense ledger." },
      { name: "Budgets", description: "You can set budgets directly from AI suggestions." },
      { name: "Reports", description: "Reports offers exportable versions of similar analysis." },
      { name: "Financial Health", description: "Insights informs the recommendations in your Health report." },
    ],
  },

  "/reports": {
    title: "Reports",
    summary: "Comprehensive reports across all financial dimensions — exportable to XLSX and PDF.",
    details: "Reports provides seven tabbed sections: Overview (key financial stats), Income (trends and comparisons), Expenses (category breakdown and trends), Investments (portfolio performance and returns), Goals (progress toward targets), Recurrence (recurring transaction analysis), and Data (raw table view with search and category filter). Use the Year/Month/Quarter selectors at the top to set the reporting period. Each tab can be exported independently to XLSX, or generate a consolidated PDF report.",
    controls: [
      { name: "Enhanced XLSX button", description: "Exports the current tab's data as a detailed Excel file with formatting.", location: "Top toolbar" },
      { name: "Export as... dropdown", description: "Choose export format — XLSX or other options per tab.", location: "Top toolbar" },
      { name: "Export PDF button", description: "Generates a consolidated PDF report of all data for the selected period.", location: "Top toolbar" },
      { name: "Year dropdown", description: "Select the financial year for the report.", location: "Top of the page" },
      { name: "Month dropdown", description: "Select a specific month for the report.", location: "Next to Year dropdown" },
      { name: "Quarter dropdown", description: "Select a quarter for the report.", location: "Next to Month dropdown" },
      { name: "Overview tab", description: "Key financial stats — income, expenses, savings rate, net worth.", location: "Tab bar" },
      { name: "Income tab", description: "Income trends, comparisons, and breakdown by source.", location: "Tab bar" },
      { name: "Expenses tab", description: "Expense category breakdown, trends over time, and vendor analysis.", location: "Tab bar" },
      { name: "Investments tab", description: "Portfolio summary, returns, and performance by type.", location: "Tab bar" },
      { name: "Goals tab", description: "Goal progress, timelines, and contribution analysis.", location: "Tab bar" },
      { name: "Recurrence tab", description: "Analysis of recurring vs one-time transactions.", location: "Tab bar" },
      { name: "Data tab", description: "Raw transaction table with search and category filter.", location: "Tab bar" },
      { name: "Search input (Data tab)", description: "Free-text search across all transactions in the Data tab.", location: "Data tab" },
      { name: "Category filter (Data tab)", description: "Filter the Data tab by expense category.", location: "Data tab" },
      { name: "Export Table button (Data tab)", description: "Exports the filtered data table as XLSX.", location: "Data tab" },
    ],
    workflow: [
      { step: "Select period", description: "Choose the Year, Month, or Quarter to define the reporting period." },
      { step: "Navigate tabs", description: "Switch between Overview, Income, Expenses, Investments, Goals, Recurrence, and Data tabs.", example: "Go to the Expenses tab to see a category-wise breakdown of Q2 spending." },
      { step: "Export per section or full report", description: "Use 'Enhanced XLSX' per tab or 'Export PDF' for a consolidated report." },
    ],
    relatedFeatures: [
      { name: "Expenses Ledger", description: "The Expenses tab aggregates all your expense ledger data." },
      { name: "Income Sources", description: "The Income tab aggregates all your income source data." },
      { name: "Investments", description: "The Investments tab tracks portfolio performance." },
      { name: "Goals", description: "The Goals tab shows progress toward your targets." },
      { name: "Dashboard", description: "Reports gives you the drill-down behind Dashboard numbers." },
    ],
  },

  "/reminders": {
    title: "Reminders",
    summary: "One place for every upcoming financial event — bill due dates, EMI payments, renewals, and custom alerts.",
    details: "Reminders collects all time-sensitive events across the app: EMI payments from Loans, insurance renewals, subscription renewals, and custom reminders you create yourself. Each reminder has a title, type (Payment, Renewal, Task, Custom), priority (High, Medium, Low), due date, optional amount and category. Use filter buttons to view Upcoming, Completed, or All reminders. The auto-detect feature scans your expenses to suggest reminder-worthy entries.",
    controls: [
      { name: "Auto-Detect button", description: "Scans your expenses to suggest reminder-worthy recurring entries.", location: "Top toolbar" },
      { name: "Add Reminder button", description: "Opens a dialog to create a custom reminder.", location: "Top toolbar" },
      { name: "Upcoming filter button", description: "Shows only reminders that are not yet completed.", location: "Filter bar" },
      { name: "Completed filter button", description: "Shows only reminders marked as done.", location: "Filter bar" },
      { name: "All filter button", description: "Shows every reminder regardless of status.", location: "Filter bar" },
      { name: "Toggle complete (per card)", description: "Checkbox or toggle to mark a reminder as done or pending.", location: "Each reminder card" },
      { name: "Delete button (per card)", description: "Removes the reminder after confirmation.", location: "Each reminder card" },
      { name: "Title input (dialog)", description: "Reminder title (e.g., 'Pay Credit Card Bill').", location: "Inside Add/Edit dialog" },
      { name: "Type dropdown (dialog)", description: "Payment, Renewal, Task, or Custom.", location: "Inside Add/Edit dialog" },
      { name: "Priority dropdown (dialog)", description: "High, Medium, or Low.", location: "Inside Add/Edit dialog" },
      { name: "Due Date input (dialog)", description: "When the reminder is due.", location: "Inside Add/Edit dialog" },
      { name: "Amount input (dialog)", description: "Optional associated amount.", location: "Inside Add/Edit dialog" },
      { name: "Category dropdown (dialog)", description: "Associate with a category (e.g., Credit Card, Loan EMI, Insurance).", location: "Inside Add/Edit dialog" },
      { name: "Recurring dropdown (dialog)", description: "None, Daily, Weekly, Monthly, Yearly.", location: "Inside Add/Edit dialog" },
    ],
    workflow: [
      { step: "View upcoming reminders", description: "The default view shows all upcoming reminders sorted by due date with priority badges.", example: "HPCL Credit Card bill due on 15th — High priority." },
      { step: "Add reminders manually or auto-detect", description: "Click 'Add Reminder' for custom reminders, or 'Auto-Detect' to scan expenses for suggestions.", example: "Auto-detect finds 'Swiggy' every week → suggests a weekly reminder." },
      { step: "Toggle completion", description: "Mark reminders as done when you complete them, or unmark if still pending." },
    ],
    relatedFeatures: [
      { name: "Loans", description: "EMI due dates create reminders automatically." },
      { name: "Insurance", description: "Policy renewal dates create reminders automatically." },
      { name: "Subscriptions", description: "Subscription renewal dates create reminders automatically." },
      { name: "Expenses Ledger", description: "Auto-detect scans expenses for recurring patterns." },
    ],
  },

  "/auto-link": {
    title: "Auto-Link Suggestions",
    summary: "Automatically connect your expenses to income, investments, insurance, and loans.",
    details: "Auto-Link scans your expenses and suggests connections you may have missed. A GPay rent payment matching your rental income source gets linked as income. An expense tagged 'Investment' creates an investment record. An insurance premium expense links to your policy. A loan EMI payment links to your loan record. Each suggestion shows the expense and the suggested target item — accept to create the link or dismiss if incorrect. Linked items update their source modules automatically.",
    controls: [
      { name: "Accept button (per suggestion)", description: "Creates the link between the expense and the suggested target item.", location: "Each suggestion card" },
    ],
    workflow: [
      { step: "Review suggestions", description: "Each suggestion shows an expense card and what it could link to — income source, investment, insurance policy, or loan.", example: "Expense: ₹15,000 'Rent to Sharma Properties' → Link to Income Source: 'Rental Income'." },
      { step: "Accept links", description: "Click 'Accept' to confirm the link. The linked item updates in its respective module.", example: "Accept → 'Rental Income' now shows the ₹15,000 as a received payment." },
    ],
    relatedFeatures: [
      { name: "Income Sources", description: "GPay receipts matching your income source merchant get linked automatically." },
      { name: "Expenses Ledger", description: "All suggestions start from your expenses." },
      { name: "Investments", description: "Investment-tagged expenses suggest creating investment records." },
      { name: "Insurance", description: "Insurance-tagged expenses suggest linking to your policy." },
      { name: "Loans", description: "Expenses to loan providers suggest linking to your loan EMI." },
    ],
  },

  "/deals": {
    title: "Deals & Offers",
    summary: "Track coupons, discounts, and special offers from merchants you frequently use.",
    details: "Deals & Offers lets you record promotional offers from merchants. Each deal stores the merchant name, title, description, discount amount or percentage, coupon code, URL, validity date, and category. Active deals are displayed for reference when adding expenses. Delete expired deals to keep the list current.",
    controls: [
      { name: "Add Deal button", description: "Opens a dialog to create a new deal or offer.", location: "Top-right of the page" },
      { name: "Trash icon (per deal)", description: "Deletes an expired or unwanted deal.", location: "Each deal card" },
      { name: "View Deal link", description: "Opens the deal URL in a new tab.", location: "Each deal card" },
      { name: "Merchant input (dialog)", description: "Name of the merchant or store (e.g., 'Myntra', 'Swiggy').", location: "Inside Add/Edit dialog" },
      { name: "Title input (dialog)", description: "Deal title (e.g., '50% Off on First Order').", location: "Inside Add/Edit dialog" },
      { name: "Description textarea (dialog)", description: "Detailed description of the offer and terms.", location: "Inside Add/Edit dialog" },
      { name: "Discount input (dialog)", description: "Discount amount or percentage (e.g., '50%' or '₹500 off').", location: "Inside Add/Edit dialog" },
      { name: "Coupon Code input (dialog)", description: "The coupon code to apply at checkout.", location: "Inside Add/Edit dialog" },
      { name: "URL input (dialog)", description: "Link to the deal or offer page.", location: "Inside Add/Edit dialog" },
      { name: "Valid Until input (dialog)", description: "The date the offer expires.", location: "Inside Add/Edit dialog" },
      { name: "Category dropdown (dialog)", description: "Deal category — Food, Shopping, Travel, Entertainment, Utilities, Other.", location: "Inside Add/Edit dialog" },
    ],
    workflow: [
      { step: "View deals", description: "All active deals are displayed sorted by validity date, with upcoming expiring ones highlighted." },
      { step: "Add new deals", description: "Click 'Add Deal' and enter the merchant, discount details, coupon code, and validity.", example: "Add 'Swiggy — 40% off on orders above ₹500' with code SWIGGY40, valid till 31 Aug." },
      { step: "Delete expired deals", description: "Use the trash icon to remove offers that are no longer valid." },
    ],
    relatedFeatures: [
      { name: "Expenses Ledger", description: "Check active deals from this page when adding expenses to save money." },
      { name: "Merchants", description: "Deals are tied to specific merchant names you have mapped." },
    ],
  },

  "/health": {
    title: "Financial Health",
    summary: "A comprehensive financial health score across six areas with personalized recommendations.",
    details: "Your Financial Health Score rates you from 0–100 across six components: Cash Flow (savings rate), Investments (diversification and returns), Insurance (adequate coverage), Tax (deduction optimization), Debt (debt-to-income ratio), and Goals (progress tracking). Each component has its own score and specific, actionable recommendations. The overall score is displayed as a gauge. Navigation cards provide quick access to Risk Profile quiz, What-If Simulator, and detailed Insights. Download a PDF report of your complete health assessment.",
    controls: [
      { name: "Refresh button", description: "Recalculates the health score with the latest data.", location: "Top toolbar" },
      { name: "Download PDF button", description: "Generates and downloads a PDF report of your full health assessment.", location: "Top toolbar" },
      { name: "Risk Profile navigation card", description: "Click to navigate to the Risk Profile quiz page.", location: "Navigation cards section" },
      { name: "What-If navigation card", description: "Click to navigate to the What-If Simulator page.", location: "Navigation cards section" },
      { name: "Insights navigation card", description: "Click to navigate to the Deep Insights page.", location: "Navigation cards section" },
    ],
    workflow: [
      { step: "View health score and 6 components", description: "See your overall gauge score (0–100) and individual scores for Cash Flow, Investments, Insurance, Tax, Debt, and Goals.", example: "Score 72/100 — Cash Flow 80, Investments 65, Insurance 90, Tax 70, Debt 75, Goals 55." },
      { step: "Review recommendations", description: "Each component has specific suggestions to improve your score.", example: "Goals — 'You are 40% toward your Emergency Fund. Increase monthly contribution by ₹2,000.'" },
      { step: "Download PDF report", description: "Click 'Download PDF' to save a formatted report with all scores and recommendations." },
    ],
    relatedFeatures: [
      { name: "Risk Profile", description: "Take the SEBI-based quiz to calibrate your health assessment." },
      { name: "What-If Simulator", description: "See how changes would affect your score before making them." },
      { name: "Insights", description: "Deep-dive analysis behind the numbers." },
      { name: "Dashboard", description: "The health gauge on your Dashboard links directly here." },
      { name: "Reports", description: "Generate a monthly PDF report from this page." },
    ],
  },

  "/risk-profile": {
    title: "Risk Profile",
    summary: "Answer 10 SEBI-based questions to discover your investor personality and optimal asset allocation.",
    details: "This quiz follows SEBI RIA (Registered Investment Adviser) guidelines to determine your risk tolerance. Questions cover investment horizon, reaction to market volatility, financial goals, income stability, and loss tolerance. Based on your answers, you are classified as Conservative, Moderate, or Aggressive, with a recommended asset allocation (equity/debt/gold percentages). The result influences your Financial Health Score and investment recommendations.",
    controls: [
      { name: "Answer option buttons", description: "Select one answer per question from multiple-choice options.", location: "Each question card" },
      { name: "Back button", description: "Go to the previous question to change your answer.", location: "Bottom of the quiz" },
      { name: "Next button", description: "Proceed to the next question.", location: "Bottom of the quiz" },
      { name: "See Results button", description: "Submit all answers and view your risk profile result.", location: "Bottom of the quiz, last question" },
      { name: "Retake button", description: "Reset the quiz and answer all questions again.", location: "Result page" },
      { name: "Dashboard button", description: "Return to the Dashboard after viewing results.", location: "Result page" },
    ],
    workflow: [
      { step: "Answer SEBI-based questions", description: "Answer 10 multiple-choice questions about your investment knowledge, horizon, and risk comfort.", example: "Q: 'How would you react if your portfolio dropped 20%?' — A: 'Hold and wait for recovery.'" },
      { step: "View profile result with allocation", description: "See your risk profile (Conservative/Moderate/Aggressive) with recommended asset allocation percentages.", example: "Moderate — 50% Equity, 30% Debt, 10% Gold, 10% Cash." },
    ],
    relatedFeatures: [
      { name: "Financial Health", description: "Your risk profile calibrates the Health Score recommendations." },
      { name: "Investments", description: "Investment recommendations consider your risk profile." },
      { name: "What-If Simulator", description: "Use scenarios to test allocations that match your risk profile." },
    ],
  },

  "/what-if": {
    title: "What-If Simulator",
    summary: "Play with financial variables — see how changes in income, spending, or returns affect your future.",
    details: "The What-If Simulator lets you model different financial scenarios without real-world consequences. Choose from pre-built scenarios (e.g., 'Save More', 'Prepay Loan', 'Higher Returns', 'Reduce Spending', 'Retire Early') or build a custom scenario using sliders. Adjust variables like monthly savings, expense reduction, investment return rate, loan prepayment amount, and retirement contribution. Run the simulation to see projected impact on Net Worth, savings rate, and goal timelines. Export results for comparison.",
    controls: [
      { name: "Pre-built scenario cards (5)", description: "Click 'Simulate' on any pre-built scenario to load its parameters. Scenarios: 'Save More', 'Prepay Loan', 'Higher Returns', 'Reduce Spending', 'Retire Early'.", location: "Pre-built tab" },
      { name: "Pre-built tab", description: "Shows pre-configured scenario cards for quick simulation.", location: "Tab bar" },
      { name: "Custom tab", description: "Build your own scenario from scratch with custom parameters.", location: "Tab bar" },
      { name: "Results tab", description: "View the projected impact of the current scenario on key metrics.", location: "Tab bar" },
      { name: "Custom sliders (5)", description: "Adjust financial variables — Monthly Savings, Expense Reduction, Return Rate, Loan Prepayment, Retirement Contribution.", location: "Custom tab" },
      { name: "Run button", description: "Execute the simulation and generate results.", location: "Bottom of the scenario configuration" },
      { name: "Try Another button", description: "Reset the current scenario and start fresh.", location: "Results tab" },
      { name: "Export button", description: "Download the simulation results for offline reference.", location: "Results tab" },
    ],
    workflow: [
      { step: "Choose a pre-built or custom scenario", description: "Click 'Simulate' on a pre-built card or go to the Custom tab to adjust sliders.", example: "Choose 'Save More' to see the impact of saving an extra ₹5,000/month." },
      { step: "Build custom scenario", description: "In the Custom tab, adjust the 5 sliders to match your assumptions.", example: "Reduce spending by 10%, increase investment return to 12%, prepay ₹50,000 loan." },
      { step: "Run simulation and view results", description: "Click 'Run' to see projected Net Worth, savings rate, and goal timelines over 1–30 years." },
    ],
    relatedFeatures: [
      { name: "Financial Health", description: "See how scenario changes affect your Health Score." },
      { name: "Risk Profile", description: "Test allocations that match your risk profile." },
      { name: "Goals", description: "Model how increased savings accelerate goal achievement." },
    ],
  },

  "/tax": {
    title: "Tax Management",
    summary: "Complete tax toolkit — calculate income, upload documents, track ITR filings, and project future tax.",
    details: "The Tax section consolidates everything tax-related into four tabs. Income tab: auto-calculates Gross Total Income from all sources, lets you add deductions (80C, 80D, 24(b), HRA, NPS, Standard Deduction), and compares Old vs New tax regime side by side. Documents tab: upload and organize tax-related PDFs (Form 16, Form 26AS, investment proofs, rent receipts, donation receipts). ITR tab: track filings by assessment year, form type (ITR-1/ITR-2/ITR-3/ITR-4), status (Filed/Processing/Completed/Refund Received), and amounts. Projections tab: estimate current year tax, view advance tax due dates, and get optimization suggestions.",
    controls: [
      { name: "FY dropdown", description: "Select the Financial Year (e.g., 2025–2026) to view or manage tax data.", location: "Top of the page" },
      { name: "Income tab", description: "View Gross Total Income, add deductions, compare Old vs New regime.", location: "Tab bar" },
      { name: "Documents tab", description: "Upload and organize tax-related documents.", location: "Tab bar" },
      { name: "ITR tab", description: "Track ITR filings, status, and refunds.", location: "Tab bar" },
      { name: "Projections tab", description: "Estimate current year tax and plan deductions.", location: "Tab bar" },
      { name: "Upload Document button", description: "Opens a dialog to upload a tax document (type, label, file, metadata).", location: "Documents tab" },
      { name: "Add ITR Record button", description: "Opens a dialog to add an ITR filing record.", location: "ITR tab" },
      { name: "Edit button (per record)", description: "Edits an existing document or ITR record.", location: "Each row in Documents and ITR tabs" },
      { name: "Delete button (per record)", description: "Removes a document or ITR record.", location: "Each row in Documents and ITR tabs" },
      { name: "Type dropdown (document dialog)", description: "Document type — Form 16, Form 26AS, Investment Proof, Rent Receipt, Donation Receipt, Other.", location: "Document upload dialog" },
      { name: "Label input (document dialog)", description: "A descriptive label for the document.", location: "Document upload dialog" },
      { name: "File input (document dialog)", description: "Select and upload the PDF file.", location: "Document upload dialog" },
      { name: "AY input (ITR dialog)", description: "Assessment Year (e.g., '2026–2027').", location: "ITR record dialog" },
      { name: "Form dropdown (ITR dialog)", description: "ITR form type — ITR-1, ITR-2, ITR-3, ITR-4.", location: "ITR record dialog" },
      { name: "Status dropdown (ITR dialog)", description: "Filing status — Filed, Processing, Completed, Refund Received.", location: "ITR record dialog" },
      { name: "Amount inputs (ITR dialog)", description: "Fields for Gross Income, Total Deductions, Taxable Income, Tax Paid, Refund Amount.", location: "ITR record dialog" },
    ],
    workflow: [
      { step: "Select FY and compare regimes", description: "Choose the financial year. The Income tab auto-calculates total income and lets you compare Old vs New tax regime.", example: "FY 2025–2026 — Gross Income ₹18,00,000, Old Regime Tax ₹2,10,000, New Regime Tax ₹1,80,000." },
      { step: "Upload documents", description: "Go to the Documents tab, click 'Upload Document', select type, label, and file.", example: "Upload Form 16 PDF from your employer." },
      { step: "Track ITR filings", description: "Go to the ITR tab, click 'Add ITR Record', fill in AY, form type, status, and amounts.", example: "AY 2025–2026 — ITR-3, Filed on 15-Jul-2025, Refund ₹12,000 received." },
      { step: "Project tax for current year", description: "Go to the Projections tab to estimate tax and plan additional deductions before year-end.", example: "Still need ₹50,000 in 80C to maximize deduction → invest in ELSS." },
    ],
    relatedFeatures: [
      { name: "Income Sources", description: "Your Gross Total Income comes from all your income sources." },
      { name: "Investments", description: "Capital gains from investments feed into tax calculations." },
      { name: "Loans", description: "Home loan interest is deductible under Section 24(b)." },
      { name: "Insurance", description: "Premiums are deductible under 80C/80D." },
      { name: "Gmail Import", description: "Form 16 emails can be auto-imported directly as tax documents." },
    ],
  },

  "/plans": {
    title: "Pricing Plans",
    summary: "Compare subscription tiers and upgrade to unlock more features.",
    details: "MyMoney offers multiple subscription tiers: Free (₹0 — 1 profile, manual import only, no AI features), Pro (₹99/month or ₹999/year — 3 profiles, all features including AI chat, auto-import), and Enterprise (custom pricing — unlimited profiles, admin access, dedicated support). Each plan card shows the features included at that tier. Click 'Upgrade' to pay via Razorpay — the payment is processed instantly and your account upgrades automatically.",
    controls: [
      { name: "Upgrade button (per plan)", description: "Initiates Razorpay checkout to upgrade to the selected plan.", location: "Each plan card" },
    ],
    workflow: [
      { step: "View plans and compare features", description: "See Free, Pro, and Enterprise tiers side by side with features and pricing." },
      { step: "Upgrade via Razorpay", description: "Click 'Upgrade' on your chosen plan, complete the Razorpay payment, and your account upgrades instantly.", example: "Click 'Upgrade' on Pro ₹999/yr → Razorpay checkout → Account upgraded." },
    ],
    relatedFeatures: [
      { name: "Settings", description: "See your current plan tier in your profile settings." },
      { name: "Admin / Features", description: "Admins manage feature flags per tier from the admin panel." },
    ],
  },

  "/family": {
    title: "Family Sharing",
    summary: "Share your financial data with family members — choose who can view or edit.",
    details: "Family Sharing lets you invite others to access your MyMoney data. Select which profile to share from the profile dropdown, enter the invitee's email, and choose their role — Viewer (read-only, can see all data but not make changes) or Editor (can add, edit, and manage data). Invitations are sent by email. The invitee accepts and gains access. Revoke access anytime.",
    controls: [
      { name: "Profile dropdown", description: "Select which profile you want to share data from.", location: "Top of the sharing section" },
      { name: "Email input", description: "Enter the email address of the person you want to invite.", location: "Invite form" },
      { name: "Role dropdown", description: "Choose Viewer (read-only) or Editor (can add/edit).", location: "Invite form" },
      { name: "Send Invitation button", description: "Sends the sharing invitation email.", location: "Invite form" },
      { name: "Accept button", description: "Accept a pending invitation received from another family member.", location: "Pending invitations section" },
      { name: "Revoke button", description: "Remove a family member's access to your data.", location: "Active shares section" },
    ],
    workflow: [
      { step: "Share a profile", description: "Select a profile, enter the invitee's email, choose Viewer or Editor, and send the invitation.", example: "Share 'Household' profile with spouse as Editor so they can add expenses too." },
      { step: "Accept invitations", description: "If someone shares their profile with you, click 'Accept' to start viewing or managing their data." },
      { step: "Revoke access", description: "Click 'Revoke' next to any family member to immediately remove their access." },
    ],
    relatedFeatures: [
      { name: "Multi-Profile", description: "Each family member can have their own profile or share one." },
      { name: "Admin Users", description: "Admins can manage all profiles and sharing across the system." },
    ],
  },

  "/audit-log": {
    title: "Audit Log",
    summary: "Track changes made to your account — who did what and when.",
    details: "The Audit Log records all significant actions on your account. Each entry shows the timestamp, user, action performed, entity affected, and details. Use filters to narrow by action type (Create, Update, Delete, Login), entity type (Expense, Income, Budget, etc.), or date range. Search across all entries with the search input. Export the filtered log as CSV for external auditing.",
    controls: [
      { name: "Filters toggle", description: "Shows or hides the filter panel with action, entity, and date range controls.", location: "Top toolbar" },
      { name: "Refresh button", description: "Reloads the audit log from the server.", location: "Top toolbar" },
      { name: "Export CSV button", description: "Downloads the current filtered view as a CSV file.", location: "Top toolbar" },
      { name: "Search input", description: "Free-text search across all audit log entries.", location: "Top toolbar" },
      { name: "Action dropdown", description: "Filter by action type — Create, Update, Delete, Login, Export.", location: "Filter panel" },
      { name: "Entity dropdown", description: "Filter by entity type — Expense, Income, Budget, Investment, Goal, Loan, Insurance, etc.", location: "Filter panel" },
      { name: "Date range inputs", description: "Start and end date pickers to filter by time period.", location: "Filter panel" },
      { name: "Clear all filters button", description: "Resets all filters to their default values.", location: "Filter panel" },
      { name: "Pagination controls", description: "Navigate through pages of audit log entries.", location: "Bottom of the table" },
    ],
    workflow: [
      { step: "View logged actions", description: "The default view shows all recent actions sorted by timestamp, most recent first." },
      { step: "Filter by type, entity, or date", description: "Open the Filters panel and use dropdowns and date pickers to narrow results.", example: "Show all 'Delete' actions on 'Expense' entities from last 7 days." },
      { step: "Export CSV", description: "Click 'Export CSV' to download the filtered results for offline review." },
    ],
    relatedFeatures: [
      { name: "Admin Audit Log", description: "Admins can see changes across all users in the system." },
    ],
  },

  "/gmail-import": {
    title: "Gmail Import",
    summary: "Scan your Gmail inbox and import financial transactions — expenses, income, investments, and more.",
    details: "Connect your Gmail with read-only access. The app scans for financial emails: UPI payment receipts, bank alerts, salary credits, mutual fund transactions, stock trades, insurance premium receipts, subscription renewal emails, and tax documents (Form 16, ITR). Each detected email is parsed and displayed with a type badge. Select individual transactions or use the checkbox to select all, then click 'Import Selected' to add them to the appropriate module.",
    controls: [
      { name: "Scan Gmail button", description: "Triggers a scan of your Gmail inbox for financial emails from the last 90 days.", location: "Top-right of the page" },
      { name: "Checkbox (per transaction)", description: "Select individual parsed transactions to import.", location: "Left side of each row" },
      { name: "Import Selected button", description: "Imports all checked transactions into their respective modules (expenses, income, investments, etc.).", location: "Top toolbar, visible when items are selected" },
    ],
    workflow: [
      { step: "Scan Gmail", description: "Click 'Scan Gmail' to scan your inbox. The scan looks for financial emails from the last 90 days.", example: "Scans 500 recent emails → finds 45 financial transactions." },
      { step: "Select transactions", description: "Each result shows the email preview, parsed amount, date, and type badge. Check the ones you want.", example: "Check 3 UPI payments, 1 salary credit email, and 1 mutual fund statement." },
      { step: "Import selected", description: "Click 'Import Selected'. UPI payments become expenses, salary becomes income, MF statement becomes an investment record." },
    ],
    relatedFeatures: [
      { name: "Expenses Ledger", description: "UPI payments and debit alerts become expense records." },
      { name: "Income Sources", description: "Salary credit emails create monthly income records." },
      { name: "Investments", description: "Mutual fund and stock emails create investment records." },
      { name: "Insurance", description: "Premium emails create insurance policy records." },
      { name: "Subscriptions", description: "Renewal emails create subscription records." },
      { name: "Tax", description: "Form 16 emails are saved as tax documents." },
    ],
  },

  "/settings": {
    title: "Settings Hub",
    summary: "Central navigation to all configuration pages — API keys, integrations, bank accounts, and more.",
    details: "Settings is the central hub for configuring MyMoney. Clickable cards link to sub-pages: API Keys (manage OpenAI, Claude, Resend, Zerodha, Sharekhan keys), Bank Accounts (add/edit account details), Environment (view/override config variables), Gmail Parser (customize email parsing keywords), Integrations (connect Zerodha, Sharekhan, Groww, MF Central, Drive, GPay), and Session Link (generate pairing link for mobile app).",
    controls: [
      { name: "Clickable setting cards", description: "Each card represents a settings sub-page. Click to navigate.", location: "Full page grid of cards" },
    ],
    workflow: [
      { step: "Navigate to specific settings", description: "Click the card for the settings area you need to configure.", example: "Click 'API Keys' to configure your OpenAI and Zerodha API keys." },
    ],
    relatedFeatures: [
      { name: "API Keys", description: "Configure API keys for AI and broker integrations." },
      { name: "Bank Accounts", description: "Add or edit bank account details." },
      { name: "Integrations", description: "Connect third-party services." },
    ],
  },

  "/settings/api-keys": {
    title: "API Keys",
    summary: "Configure API keys for OpenAI, Claude, Resend, Zerodha, Sharekhan, and other integrations.",
    details: "Enter and save API keys for the services MyMoney integrates with. OpenAI and Claude keys enable AI features (chatbot, auto-categorization, insights). Resend key enables email notifications. Zerodha and Sharekhan keys enable portfolio auto-sync. Keys are stored encrypted. Each field has its own Save button. Leave a field empty to keep the existing key unchanged.",
    controls: [
      { name: "OpenAI API Key input", description: "Enter your OpenAI API key for AI features.", location: "API Keys form" },
      { name: "Claude API Key input", description: "Enter your Claude/Anthropic API key for AI features.", location: "API Keys form" },
      { name: "Resend API Key input", description: "Enter your Resend API key for email notifications.", location: "API Keys form" },
      { name: "Zerodha API Key input", description: "Enter your Zerodha Kite API key for portfolio sync.", location: "API Keys form" },
      { name: "Sharekhan API Key input", description: "Enter your Sharekhan API key for portfolio sync.", location: "API Keys form" },
      { name: "Save buttons", description: "Each API key field has its own Save button to update that key individually.", location: "Next to each input field" },
    ],
    workflow: [
      { step: "Configure API keys for integrations", description: "Enter each API key in its respective field and click Save.", example: "Enter your OpenAI key to enable the AI chatbot and auto-categorization features." },
    ],
    relatedFeatures: [
      { name: "Settings Hub", description: "All configuration pages are accessible from Settings." },
      { name: "Integrations", description: "API keys for broker integrations enable portfolio sync." },
    ],
  },

  "/settings/bank-accounts": {
    title: "Bank Accounts Settings",
    summary: "Add, edit, or remove bank account details used across the app.",
    details: "Manage the master list of bank accounts that appear in the Bank Accounts page and are available as options in income and expense forms. Each account entry stores the account name, account number (masked), account type (Savings/Current), and bank name. Use Save to create or update, and Delete to remove an account. Changes reflect immediately across the app.",
    controls: [
      { name: "Name input", description: "Account nickname (e.g., 'HDFC Salary Account').", location: "Add/Edit account form" },
      { name: "Account Number input", description: "Your bank account number.", location: "Add/Edit account form" },
      { name: "Type dropdown", description: "Account type — Savings or Current.", location: "Add/Edit account form" },
      { name: "Bank Name input", description: "Name of the bank (e.g., 'HDFC Bank').", location: "Add/Edit account form" },
      { name: "Save button", description: "Creates a new account or saves changes to an existing one.", location: "Add/Edit account form" },
      { name: "Delete button (per account)", description: "Removes the bank account from the system.", location: "Each existing account row" },
    ],
    workflow: [
      { step: "Add or manage bank account details", description: "Fill in the account fields and click Save to add. Use Delete to remove accounts no longer in use.", example: "Add 'ICICI Salary' — Account No: ****1234, Type: Savings, Bank: ICICI Bank." },
    ],
    relatedFeatures: [
      { name: "Bank Accounts", description: "Accounts added here appear on the Bank Accounts page." },
      { name: "Sync Balances", description: "Use the Sync Balances feature on the Bank Accounts page to update balances." },
    ],
  },

  "/settings/environment": {
    title: "Environment Config",
    summary: "View and override environment variables for self-hosted deployments.",
    details: "For self-hosted instances, this page lists environment variables and their current values. You can override certain variables directly from the UI without editing server files. Useful for quickly switching between development, staging, and production configurations, or for testing feature flags locally.",
    controls: [
      { name: "Environment variable list", description: "Displays all configurable environment variables with their current values.", location: "Main content area" },
      { name: "Override inputs", description: "Edit the value of any overridable environment variable.", location: "Next to each variable" },
    ],
    workflow: [
      { step: "Check configuration", description: "Review the current values of all environment variables." },
      { step: "Override if needed", description: "Edit a variable's value and save. The change takes effect on next app restart or immediately for hot-reloadable variables." },
    ],
    relatedFeatures: [
      { name: "Settings Hub", description: "All configuration pages are accessible from Settings." },
    ],
  },

  "/settings/gmail-parser": {
    title: "Gmail Parser Keywords",
    summary: "Customize the keywords and rules used to parse financial emails from Gmail.",
    details: "Fine-tune how the Gmail Parser recognizes financial emails. Configure keywords for bank names, UPI IDs, transaction categories, and other patterns. For example, if your bank sends alerts with a specific subject line format, you can add matching keywords here. Changes apply to future Gmail scans.",
    controls: [
      { name: "Bank keywords input", description: "Keywords to identify bank alert emails (e.g., 'HDFCB', 'ICICI Bank Alert').", location: "Keywords configuration form" },
      { name: "UPI keywords input", description: "Keywords to identify UPI transaction emails (e.g., 'UPI', 'Google Pay', 'PhonePe').", location: "Keywords configuration form" },
      { name: "Category keywords input", description: "Keywords to auto-categorize transactions (e.g., 'Swiggy' → Food, 'Uber' → Transport).", location: "Keywords configuration form" },
    ],
    workflow: [
      { step: "Customize Gmail parsing keywords", description: "Add or update keywords for banks, UPI, and categories to improve email parsing accuracy.", example: "Add 'Kotak Mahindra' to bank keywords so Kotak alerts are recognized correctly." },
    ],
    relatedFeatures: [
      { name: "Gmail Import", description: "Configured keywords are used when scanning Gmail for transactions." },
      { name: "Settings Hub", description: "All configuration pages are accessible from Settings." },
    ],
  },

  "/settings/integrations": {
    title: "Integrations",
    summary: "Connect third-party services — Zerodha, Sharekhan, Groww, MF Central, Google Drive, and Google Pay.",
    details: "Connect external accounts for automatic data sync. Broker integrations (Zerodha, Sharekhan, Groww, MF Central) enable portfolio auto-import and balance sync. Google Drive integration lets you import expense files directly from Drive. GPay integration enables auto-syncing of UPI transactions. Each integration has a Connect/Disconnect button and shows its current status (Connected/Disconnected/Error).",
    controls: [
      { name: "Connect button — Zerodha", description: "OAuth flow to connect your Zerodha account for portfolio sync.", location: "Integration card for Zerodha" },
      { name: "Connect button — Sharekhan", description: "OAuth flow to connect your Sharekhan account.", location: "Integration card for Sharekhan" },
      { name: "Connect button — Groww", description: "OAuth flow to connect your Groww account.", location: "Integration card for Groww" },
      { name: "Connect button — MF Central", description: "OAuth flow to connect your MF Central account for mutual fund imports.", location: "Integration card for MF Central" },
      { name: "Connect button — Drive", description: "Google Drive OAuth to enable file imports from Drive.", location: "Integration card for Drive" },
      { name: "Connect button — GPay", description: "Google Pay connection for auto-syncing UPI transactions.", location: "Integration card for GPay" },
    ],
    workflow: [
      { step: "Connect third-party services", description: "Click 'Connect' on any service, follow the OAuth authorization flow, and the service links to your account.", example: "Connect Zerodha → redirected to Zerodha login → authorize → portfolio data syncs automatically." },
    ],
    relatedFeatures: [
      { name: "Settings Hub", description: "All configuration pages are accessible from Settings." },
      { name: "API Keys", description: "Some integrations also need API keys configured." },
      { name: "Gmail Import", description: "GPay integration enables auto-sync of UPI transactions." },
    ],
  },

  "/settings/session-link": {
    title: "Session Link",
    summary: "Generate a link or QR code to pair your mobile app with this web session.",
    details: "Session Link lets you connect your mobile app (Expo/React Native) to your web session without re-entering credentials. Click to generate a secure session link and QR code. On your mobile app, scan the QR code or enter the session code to authenticate instantly. The link expires after use or after a set timeout for security.",
    controls: [
      { name: "Generate session link button", description: "Creates a new secure session link and displays it along with a QR code.", location: "Main content area" },
      { name: "QR code display", description: "QR code that the mobile app can scan for instant pairing.", location: "Below the session link" },
    ],
    workflow: [
      { step: "Generate link for mobile app pairing", description: "Click to generate a session link. Scan the QR code with your mobile app or enter the code manually.", example: "Open MyMoney mobile app → tap 'Pair with Web' → scan QR code → session linked." },
    ],
    relatedFeatures: [
      { name: "Mobile App", description: "The mobile app uses Session Link to authenticate with the web backend." },
    ],
  },

  "/settings/database": {
    title: "Database Mode",
    summary: "Switch between production and test databases. Admin-only setting.",
    details: "This page allows administrators to switch the entire application between the production database (DATABASE_URL) and the test database (TEST_DATABASE_URL). When test mode is active, all users see test data. Use this to verify features, test integrations, or run automated tests without affecting real user data. The setting persists across server restarts via the .db-mode.json file.",
    controls: [
      { name: "Production DB button", description: "Switch the app to use the production database (DATABASE_URL).", location: "Main content area" },
      { name: "Test DB button", description: "Switch the app to use the test database (TEST_DATABASE_URL). Requires TEST_DATABASE_URL to be set in .env.", location: "Main content area" },
      { name: "Current mode badge", description: "Shows which database is currently active (Production or Test).", location: "Status card" },
      { name: "Warning banner", description: "Shown when TEST_DATABASE_URL is not configured.", location: "Status card" },
    ],
    workflow: [
      { step: "Check current mode", description: "The page shows which database is currently active — Production or Test.", example: "You see 'Production Database' with a green badge." },
      { step: "Switch to test mode", description: "Click 'Test DB' to switch the app to the test database. The connection is recreated and all subsequent queries use TEST_DATABASE_URL.", example: "Click 'Test DB' → badge changes to 'Test' → app now uses test data." },
      { step: "Switch back to production", description: "Click 'Production DB' to return to the production database.", example: "Click 'Production DB' → badge changes to 'Production' → app now uses real data." },
    ],
    relatedFeatures: [
      { name: "Environment Settings", description: "View and override environment variables including database URLs." },
      { name: "Admin Users", description: "Test user management in the test database before applying to production." },
      { name: "Feature Flags", description: "Test feature flag configurations in the test database." },
    ],
  },

  "/guide": {
    title: "User Guide",
    summary: "Comprehensive documentation for all MyMoney features — from basics to advanced topics.",
    details: "The User Guide covers everything from getting started (setting up your account, adding your first expense) to advanced features (tax planning, what-if simulations, family sharing, API access). Content is organized in collapsible sections with a table of contents. Use it as a reference whenever you need help with a specific feature.",
    controls: [
      { name: "Collapsible sections", description: "Click any section heading to expand or collapse its content.", location: "Full page" },
    ],
    workflow: [
      { step: "Browse documentation", description: "Navigate through the table of contents or scroll through sections. Expand the topic you need help with.", example: "Expand 'Tax Management' to learn how to upload Form 16 and file ITR." },
    ],
    relatedFeatures: [
      { name: "Help system", description: "Click the floating ? button on any page for context-specific help." },
    ],
  },

  "/privacy": {
    title: "Privacy Policy",
    summary: "How MyMoney handles your data — encryption, sharing, and your rights.",
    details: "MyMoney takes data privacy seriously. Your financial data is encrypted at rest (AES-256) and in transit (TLS 1.3). Data is never shared with third parties except as required for the services you explicitly connect (e.g., Razorpay for payments, Gmail for import). You can export all your data as XLSX/CSV or permanently delete your account and all associated data at any time. See the full privacy policy for complete details.",
    controls: [],
    workflow: [],
    relatedFeatures: [
      { name: "Settings Hub", description: "Access privacy settings and data export from Settings." },
    ],
  },

  "/admin/users": {
    title: "Admin — Users",
    summary: "Create and manage user accounts — set roles, tiers, and permissions across the system.",
    details: "Admin panel for user management. Create new users with email/password or Google-only login. Each user has a role (Admin, Manager, Viewer, User) that controls their permissions, and a tier (Free, Pro, Enterprise) that controls which features they can access. Click a user to open a detail dialog where you can edit role and tier, view their associated profiles, and manage their account. Delete users when needed. All user changes are recorded in the Audit Log.",
    controls: [
      { name: "Create User button", description: "Opens a dialog to create a new user account with name, email, password/Google login, role, and tier.", location: "Top-right of the page" },
      { name: "Role dropdown (per user)", description: "Change a user's role — Admin, Manager, Viewer, or User.", location: "Each user row" },
      { name: "Tier dropdown (per user)", description: "Change a user's subscription tier — Free, Pro, or Enterprise.", location: "Each user row" },
      { name: "Delete button (per user)", description: "Permanently deletes the user account and all associated data.", location: "Each user row" },
      { name: "User detail dialog", description: "Opens on user click to show full details: edit role/tier, view profiles, manage account.", location: "Click any user row" },
    ],
    workflow: [
      { step: "Create users", description: "Click 'Create User', fill in name, email, set password or toggle Google login, assign role and tier.", example: "Create user 'Rahul' — email rahul@email.com, role: Manager, tier: Pro." },
      { step: "Manage roles and tiers", description: "Use inline dropdowns to change roles or tiers. Changes take effect immediately.", example: "Promote a User to Admin to give them access to the admin panel." },
      { step: "Delete users", description: "Click Delete on a user row and confirm. All their associated data is also removed." },
    ],
    relatedFeatures: [
      { name: "Admin / Profiles", description: "Each user can have multiple profiles — managed from Admin Profiles." },
      { name: "Admin / Features", description: "Control which features each tier can access." },
      { name: "Admin / Audit Log", description: "All user management actions are logged here." },
    ],
  },

  "/admin/profiles": {
    title: "Admin — Profiles",
    summary: "View and manage all user profiles across the system.",
    details: "Lists every profile for every user in the system. Each profile shows the owner, profile name, and data counts (number of expenses, budgets, goals, investments, etc.). Admin can delete any profile if needed. Use this page to audit data usage or clean up orphaned profiles.",
    controls: [
      { name: "Profile list", description: "Displays all profiles with owner, name, and data counts.", location: "Main content area" },
      { name: "Delete button (per profile)", description: "Permanently deletes the profile and all its associated data.", location: "Each profile row" },
    ],
    workflow: [
      { step: "Manage all user profiles", description: "Review profiles, check data counts, and delete profiles that are no longer needed.", example: "Delete a test profile that has 0 expenses, 0 budgets, and no goals." },
    ],
    relatedFeatures: [
      { name: "Admin / Users", description: "Profiles belong to users — manage users from the Admin Users page." },
      { name: "Admin / Audit Log", description: "Profile deletion actions are recorded in the Audit Log." },
    ],
  },

  "/admin/features": {
    title: "Admin — Feature Flags",
    summary: "Toggle features on/off per subscription tier, and override access for individual users.",
    details: "Feature Flags control which parts of the app are available to each subscription tier. Toggle any feature on or off for Free, Pro, and Enterprise tiers independently. The search input helps find features quickly. Bulk actions let you enable or disable all features at once. Additionally, you can expand user cards to see per-user feature overrides — useful for granting beta features to specific users regardless of their tier.",
    controls: [
      { name: "Toggle (per feature)", description: "Turn a feature on or off for the selected tier.", location: "Each feature row" },
      { name: "Tier dropdown (per feature)", description: "Select which tier this feature toggle applies to — Free, Pro, or Enterprise.", location: "Each feature row" },
      { name: "Delete button (per feature)", description: "Remove a feature flag entirely from the system.", location: "Each feature row" },
      { name: "Add Feature button", description: "Opens a dialog to create a new feature flag with name and initial toggle states.", location: "Top toolbar" },
      { name: "Search input", description: "Search across feature flag names.", location: "Top toolbar" },
      { name: "Enable All button", description: "Turns on all feature flags for the currently selected tier.", location: "Top toolbar, bulk actions" },
      { name: "Disable All button", description: "Turns off all feature flags for the currently selected tier.", location: "Top toolbar, bulk actions" },
      { name: "User cards (expandable)", description: "Expand to see per-user feature overrides — toggle features for specific users.", location: "Bottom of the page" },
      { name: "Per-feature toggle (user overrides)", description: "Override a feature flag for a specific user, regardless of their tier.", location: "Inside expanded user cards" },
    ],
    workflow: [
      { step: "Manage features and tier access", description: "Toggle features on/off per tier. Use bulk actions for quick changes.", example: "Disable 'AI Chatbot' for Free tier, enable it for Pro and Enterprise." },
      { step: "Override per user", description: "Expand a user card and toggle features for that individual user.", example: "Enable 'Beta Reports' feature for user 'Rahul' even though he is on Free tier." },
    ],
    relatedFeatures: [
      { name: "Admin / Users", description: "Change a user's tier from the Admin Users page to grant feature access." },
      { name: "Admin / Audit Log", description: "Feature flag changes are recorded in the Audit Log." },
      { name: "Pricing Plans", description: "Feature flags implement the feature matrix shown on the Plans page." },
    ],
  },

  "/admin/audit-log": {
    title: "Admin — Audit Log",
    summary: "Full audit trail of all admin actions — user management, profile changes, feature flag toggles.",
    details: "The Admin Audit Log records every administrative action across the system: user creation, role changes, tier changes, profile management, feature flag toggles, and bulk operations. Each entry shows the admin who performed the action, the action type, the affected entity, and a timestamp. Use the filter panel to narrow by action type, entity type, or date range. Search across entries and export to CSV for external auditing.",
    controls: [
      { name: "Filters toggle", description: "Shows or hides the filter panel.", location: "Top toolbar" },
      { name: "Refresh button", description: "Reloads the audit log data.", location: "Top toolbar" },
      { name: "Export CSV button", description: "Downloads the current filtered view as a CSV file.", location: "Top toolbar" },
      { name: "Search input", description: "Free-text search across all audit log entries.", location: "Top toolbar" },
      { name: "Action dropdown", description: "Filter by administrative action type — Create, Update, Delete, Toggle, etc.", location: "Filter panel" },
      { name: "Entity dropdown", description: "Filter by entity — User, Profile, FeatureFlag, etc.", location: "Filter panel" },
      { name: "Date range inputs", description: "Filter by date range with start and end date pickers.", location: "Filter panel" },
      { name: "Pagination controls", description: "Navigate through pages of audit log entries.", location: "Bottom of the table" },
    ],
    workflow: [
      { step: "Review admin actions", description: "Browse all admin actions sorted by timestamp, most recent first." },
      { step: "Filter and search", description: "Use the filter panel and search to find specific actions.", example: "Filter by Action 'Delete' and Entity 'User' to see all user deletions." },
      { step: "Export CSV", description: "Click 'Export CSV' to download the filtered audit trail." },
    ],
    relatedFeatures: [
      { name: "Admin / Users", description: "User management actions are logged here." },
      { name: "Admin / Profiles", description: "Profile changes are logged here." },
      { name: "Admin / Features", description: "Feature flag changes are logged here." },
    ],
  },

  "/onboarding": {
    title: "Onboarding Wizard",
    summary: "Step-by-step setup to get you started with MyMoney after your first login.",
    details: "The Onboarding Wizard appears after your first login (or when you reset onboarding). It walks you through essential setup: enter your name and preferences, optionally connect your Gmail for auto-import, link bank accounts, and set up key integrations. Completing the wizard unlocks the full Dashboard experience. You can skip any step and configure it later from Settings.",
    workflow: [
      { step: "Fill in your details", description: "Enter your name, preferred currency (INR/USD/etc.), and timezone.", example: "Name: Srinivas, Currency: INR, Timezone: Asia/Kolkata." },
      { step: "Connect accounts (optional)", description: "Optionally link your Gmail, bank accounts, or broker accounts during setup.", example: "Sign in with Google to enable Gmail import." },
      { step: "Finish setup", description: "Complete the wizard to go to your Dashboard, now fully configured." },
    ],
    relatedFeatures: [
      { name: "Dashboard", description: "The final step of onboarding takes you to the Dashboard." },
      { name: "Settings Hub", description: "Configure anything you skipped during onboarding from Settings." },
    ],
  },

  "/login": {
    title: "Login",
    summary: "Sign in to MyMoney with email/password or Google OAuth.",
    details: "The Login page provides two authentication methods: email + password for existing accounts, and Google OAuth for one-click login using your Google account. If this is the first time running the app and no admin account exists, you are automatically redirected to the Setup page to create the initial admin account.",
    controls: [
      { name: "Email input", description: "Enter your registered email address.", location: "Login form" },
      { name: "Password input", description: "Enter your account password.", location: "Login form" },
      { name: "Sign In with Email button", description: "Authenticates with your email and password.", location: "Login form" },
      { name: "Continue with Google button", description: "One-click login using your Google account.", location: "Login form" },
    ],
    workflow: [
      { step: "Enter your credentials", description: "Type your registered email and password, then click 'Sign in with Email'.", example: "Email: srinikc@gmail.com, Password: ********" },
      { step: "Or use Google", description: "Click 'Continue with Google' to sign in with your Google account (must match the email on your account)." },
      { step: "First time setup", description: "If no admin account exists yet, you are automatically redirected to the Setup page." },
    ],
    relatedFeatures: [
      { name: "Setup", description: "First-time users are redirected here to create the admin account." },
      { name: "Onboarding", description: "After login, new users are guided through the Onboarding Wizard." },
    ],
  },

  "/setup": {
    title: "Admin Setup",
    summary: "Create the first admin account for a fresh MyMoney installation.",
    details: "On first run, when no admin user exists in the database, all visitors are redirected to this page. Create the initial admin account by providing an email, setting a strong password (minimum 8 characters, with a mix of letters, numbers, and symbols), and confirming the password. Once created, you are redirected to the Login page to sign in with your new credentials. Only one admin account can be created this way — subsequent users must be invited by the admin.",
    workflow: [
      { step: "Enter email", description: "Your admin email address.", example: "srinikc@gmail.com." },
      { step: "Set a password", description: "At least 8 characters. Use a mix of uppercase, lowercase, numbers, and symbols.", example: "MyStr0ng!Pass" },
      { step: "Confirm password", description: "Re-enter the same password to confirm.", example: "MyStr0ng!Pass" },
      { step: "Create admin account", description: "Click submit. The admin account is created. You are redirected to the Login page." },
    ],
    relatedFeatures: [
      { name: "Login", description: "After setup, sign in with your new admin credentials." },
      { name: "Onboarding", description: "After first login, the Onboarding Wizard helps you configure the app." },
    ],
  },

  "/setup-guide": {
    title: "Setup & Installation Guide",
    summary: "Comprehensive admin guide for deploying, configuring, and managing MyMoney.",
    details: "This guide covers Docker setup, environment configuration, first admin creation, integrations (Gmail, GPay, Razorpay, brokers), user management, feature flags, maintenance tips, and troubleshooting steps for administrators.",
    controls: [
      { name: "Section accordions", description: "Click any section card to expand and read its detailed instructions.", location: "Page body" },
      { name: "Collapse/Expand", description: "Click a section again to collapse it. Only one section can be open at a time.", location: "Page body" },
    ],
    workflow: [
      { step: "Follow Installation", description: "Start with the Installation section — choose Docker (recommended) or manual setup.", example: "Run docker compose up -d to start all services." },
      { step: "Configure .env", description: "Set up environment variables in the Configuration section.", example: "Copy .env.template to .env and set DATABASE_URL." },
      { step: "Create admin account", description: "Follow First Admin Setup to create your initial admin user.", example: "Visit /setup and enter email + password." },
      { step: "Set up integrations", description: "Configure Gmail, GPay, Razorpay, or broker integrations as needed." },
    ],
    relatedFeatures: [
      { name: "Setup Page", description: "The first-run admin creation wizard at /setup." },
      { name: "User Guide", description: "End-user documentation at /guide." },
      { name: "Admin Users", description: "Manage user accounts and subscriptions." },
      { name: "Admin Feature Flags", description: "Control feature access by tier." },
    ],
  },
}

export function getHelpForPath(path: string): HelpSection | null {
  if (helpContent[path]) return helpContent[path]

  const dynamicPatterns = ["/bank-accounts/[id]"]
  for (const pattern of dynamicPatterns) {
    const regex = new RegExp(
      "^" + pattern.replaceAll("[id]", "[^/]+") + "$",
    )
    if (regex.test(path)) return helpContent[pattern]
  }

  const parts = path.split("/").filter(Boolean)
  while (parts.length > 0) {
    parts.pop()
    const parent = "/" + parts.join("/")
    if (helpContent[parent]) return helpContent[parent]
  }

  return null
}
