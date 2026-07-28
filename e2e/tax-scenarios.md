# Tax Section — Gherkin Scenarios

## Overview
The Tax page (`/tax`) has 4 tabs: **Income & Deductions**, **Documents**, **ITR Filings**, **Projections**.

---

## Tab 1: Income & Deductions Summary

### Positive Scenarios

**SCENARIO: View gross total income when income sources exist**
Given the user has income sources with monthly/yearly amounts
When they navigate to `/tax`
Then the Income & Deductions tab shows Gross Total Income calculated from all sources
And shows the selected financial year

**SCENARIO: View deductions summary**
Given the user has income sources
When they navigate to `/tax`
Then the 80C, 80D, HRA, NPS sections are displayed with ₹0 defaults
And each deduction has an editable input field

**SCENARIO: Regime comparison shows side-by-side**
Given the user has income and deduction data
When they scroll to the regime comparison section
Then Old regime tax and New regime tax are calculated side-by-side
And the recommended regime is highlighted

### Negative/Edge Scenarios

**SCENARIO: Empty state when no income sources exist**
Given the user has no income sources
When they navigate to `/tax`
Then the page shows "No income sources found. Add income sources first."

---

## Tab 2: Documents

### Positive Scenarios

**SCENARIO: Upload a Form 16 PDF**
Given the user is on the Documents tab
When they click "Upload Document"
And select type "Form 16"
And fill FY "2024-25"
And attach a valid PDF file
Then the document appears in the documents list
And shows the correct type, FY, and file name

**SCENARIO: Upload a Form 26AS PDF**
Given the user is on the Documents tab
When they upload a Form 26AS for FY 2024-25
Then it appears in the list with type "Form 26AS"

**SCENARIO: View uploaded documents list**
Given the user has uploaded 3 documents for different FYs
When they view the Documents tab
Then all 3 documents are listed with type, FY, and upload date

**SCENARIO: Delete a document**
Given the user has an uploaded document
When they click delete on that document
And confirm the deletion
Then the document is removed from the list

### Negative/Edge Scenarios

**SCENARIO: Upload unsupported file type shows error**
Given the user is on the Documents tab
When they try to upload a `.exe` file
Then an error message "Unsupported file type. Allowed: PDF, PNG, JPG, JPEG" is shown

**SCENARIO: Upload without required fields**
Given the user is on the Documents tab
When they click "Upload" without selecting a file
Then the form shows "File is required"
And no upload is performed

**SCENARIO: Upload without selecting document type**
Given the user is on the Documents tab
When they select a file but don't choose a document type
Then the form shows "Document type is required"

**SCENARIO: Upload without financial year**
Given the user is on the Documents tab
When they select a file and type but not FY
Then the form shows "Financial year is required"

**SCENARIO: File too large (>10MB)**
Given the user tries to upload a file larger than 10MB
When they submit the upload
Then an error "File size exceeds 10MB limit" is shown

**SCENARIO: Duplicate document type for same FY**
Given the user already uploaded Form 16 for FY 2024-25
When they try to upload another Form 16 for the same FY
Then a warning "Form 16 for FY 2024-25 already exists. Replace?" is shown
And they can confirm to replace or cancel

**SCENARIO: View document metadata after upload**
Given the user uploaded a Form 16
When they click "View Details" on the document
Then the extracted metadata is displayed (employer, TAN, gross salary, TDS)

---

## Tab 3: ITR Filings

### Positive Scenarios

**SCENARIO: View empty ITR filings list**
Given the user has no ITR records
When they navigate to the ITR Filings tab
Then an empty state "No ITR filings yet" is shown
And "Add ITR Record" button is visible

**SCENARIO: Create a new ITR record**
Given the user is on the ITR Filings tab
When they click "Add ITR Record"
And select AY "2025-26"
And select ITR form "ITR-1"
And set status "Filed"
And fill acknowledgment number
And click "Save"
Then the ITR record appears in the list
And shows the correct AY, form, and status

**SCENARIO: Update ITR record status**
Given the user has an ITR record with status "Filed"
When they edit the record
And change status to "Refund Received"
And enter refund amount "₹5,000"
Then the record shows updated status and refund amount

**SCENARIO: Delete an ITR record**
Given the user has an ITR record
When they click delete on that record
And confirm deletion
Then the record is removed

**SCENARIO: View ITR records grouped by AY**
Given the user has ITR records for AY 2024-25 and 2025-26
When they view the ITR Filings tab
Then records are grouped by assessment year
And each group shows the total tax liability

### Negative/Edge Scenarios

**SCENARIO: Create duplicate ITR for same AY**
Given the user already has an ITR record for AY 2025-26
When they try to add another record for the same AY
Then an error "ITR record for AY 2025-26 already exists" is shown

---

## Tab 4: Tax Projections

### Positive Scenarios

**SCENARIO: View projected tax for current FY**
Given the user has income sources
When they navigate to the Projections tab
Then the projected annual income is shown
And estimated tax under Old and New regime is displayed

**SCENARIO: Advance tax recommendations**
Given the user's projected tax liability exceeds ₹10,000
When they view the Projections tab
Then advance tax installment dates and amounts are shown
And a warning "Advance tax payment recommended" is displayed

**SCENARIO: 80C top-up suggestion**
Given the user's 80C deduction is below ₹1,50,000
When they view the Projections tab
Then a suggestion "You can invest ₹X more to utilize 80C limit" is shown

### Negative/Edge Scenarios

**SCENARIO: No income sources for projection**
Given the user has no income sources
When they navigate to the Projections tab
Then "Add income sources to see tax projections" is shown

---

## Cross-cutting Scenarios

**SCENARIO: Access tax page without authentication**
Given the user is not logged in
When they navigate to `/tax`
Then they are redirected to the login page

**SCENARIO: FY selector changes all tabs**
Given the user is on any tax tab with FY "2024-25"
When they change the FY selector to "2025-26"
Then all tabs refresh to show data for the selected FY

**SCENARIO: FY selector offers correct range**
Given the user opens the FY dropdown
Then options include current FY and 3 previous years
