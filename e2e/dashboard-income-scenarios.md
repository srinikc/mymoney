# Dashboard/Reports Income Cards — Gherkin Scenarios

## Overview
Add income summary card to the main Dashboard page and income sections to Reports.

---

## Dashboard Income Card

### Positive Scenarios

**SCENARIO: Dashboard shows income stat card when income sources exist**
Given the user has monthly income sources (e.g., Salary ₹50,000)
When they navigate to the dashboard
Then a stat card "Total Income" is shown
And it displays the total monthly income amount
And the value updates when FY/month filter changes

**SCENARIO: Income stat card shows formatted currency**
Given the user has income sources with amount ₹1,25,000
When they view the dashboard
Then the income card shows "₹1,25,000" in Indian number format

**SCENARIO: Income card shows zero when no income sources**
Given the user has no income sources
When they navigate to the dashboard
Then the income stat card shows "₹0"

### Negative/Edge Scenarios

**SCENARIO: Income API fails gracefully**
Given the income API returns an error
When the dashboard loads
Then the income card shows "—" or "N/A"
And the other stat cards still display correctly

---

## Reports Income Section

### Positive Scenarios

**SCENARIO: Reports tab shows income trend chart**
Given the user has income sources across multiple months
When they navigate to `/reports`
Then an "Income" tab or section is visible
And shows a monthly income trend chart (bar or area)
And shows total income for the selected period

**SCENARIO: Income vs Expense comparison chart**
Given the user has both income and expenses
When they view the Reports income section
Then a comparison chart shows income vs expenses side-by-side
And the chart updates when date filters change

**SCENARIO: Export includes income data**
Given the user views the Reports page
When they click "Export"
Then the exported file includes income data alongside expenses

### Negative/Edge Scenarios

**SCENARIO: No income data shows empty state**
Given the user has no income sources
When they view Reports income section
Then "No income data available" is shown
And the expense data continues to display normally
