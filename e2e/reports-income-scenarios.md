# Reports Income Section — Gherkin Scenarios

## Overview
Add income tab/section to the Reports page showing income trend, income vs expense comparison, and income stat cards.

---

## Positive Scenarios

**SCENARIO: Reports Overview shows Total Income stat card**
Given the user has income sources
When they navigate to `/reports`
Then the Overview tab shows a "Total Income" stat card
And it displays the annual income amount

**SCENARIO: Reports Income tab shows monthly trend chart**
Given the user has monthly income sources
When they view the Reports Income tab
Then a monthly income trend chart (line/bar) is displayed
And each month shows the income amount

**SCENARIO: Income vs Expense comparison chart**
Given the user has both income and expenses
When they view the Reports Income tab
Then a comparison chart shows income vs expense side-by-side per month

**SCENARIO: Reports income data changes with year/month filter**
Given the user selects a different year in the filter
When the Reports page reloads
Then the income data updates to match the selected period

## Negative/Edge Scenarios

**SCENARIO: No income sources shows empty state**
Given the user has no income sources
When they view the Reports Income tab
Then "No income data available" message is shown
And the rest of the page continues to work

**SCENARIO: Income tab not visible without income sources**
Given the user has no income sources and no expenses
When they view the Reports page
Then the Income tab may still be visible showing empty state
