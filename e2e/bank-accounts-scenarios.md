# Bank Accounts — Gherkin Scenarios

## Overview
Bank Accounts page showing all bank accounts with balances, FD summaries, and per-account transaction views. Supports both manual entry and future AA (Account Aggregator) auto-population.

---

## API Contract

### GET /api/bank-accounts
```json
{
  "accounts": [{
    "id": 1, "name": "Salary Account", "bankName": "HDFC Bank",
    "accountNumber": "XXXX1234", "type": "savings",
    "ifscCode": "HDFC0001234", "balance": 50000, "currency": "INR",
    "source": "manual", "isActive": true,
    "fixedDeposits": [{ "id": 1, "fdNumber": "FD123", "principal": 100000, "interestRate": 7.2, "startDate": "2026-01-01", "maturityDate": "2026-12-31", "maturityAmount": 107200, "status": "active" }],
    "transactionCount": 45, "lastTransaction": "2026-07-20"
  }],
  "totals": { "balance": 85000, "fdValue": 200000 }
}
```

### POST /api/bank-accounts
```json
{ "name": "Salary Account", "bankName": "HDFC Bank", "accountNumber": "XXXX1234", "type": "savings", "ifscCode": "HDFC0001234", "balance": 50000 }
```

### GET /api/bank-accounts/[id]/transactions?page=1&pageSize=20&from=2026-01-01&to=2026-12-31&search=swiggy
```json
{ "transactions": [{ "id": 1, "date": "2026-07-20", "amount": 500, "vendor": "Swiggy", "category": "Food", "type": "expense" }], "total": 1, "page": 1, "pageSize": 20 }
```

### GET/POST/PUT/DELETE /api/bank-accounts/[id]/fds
```json
{ "fdNumber": "FD123", "principal": 100000, "interestRate": 7.2, "startDate": "2026-01-01", "maturityDate": "2026-12-31", "maturityAmount": 107200, "status": "active" }
```

---

## Positive Scenarios

**SCENARIO: View empty bank accounts page**
Given the user has no bank accounts configured
When they navigate to /bank-accounts
Then they see "No bank accounts" message
And a button to "Add Bank Account" is displayed

**SCENARIO: Add a bank account via settings**
Given the user is on /settings/bank-accounts
When they click "Add Bank Account"
And fill in bank name, account name, account number, IFSC, type, balance
And click "Save"
Then the account appears in the list
And the balance is displayed correctly

**SCENARIO: Bank Accounts page shows all accounts with balances**
Given the user has 3 bank accounts (HDFC ₹50K, SBI ₹25K, Axis ₹10K)
When they navigate to /bank-accounts
Then 3 account cards are displayed
And total balance shows "₹85,000"
And each card shows the correct bank name and balance

**SCENARIO: Bank card shows FD info**
Given the user has an HDFC account with 2 FDs (₹1L, ₹50K)
When they view the bank accounts page
Then the HDFC card shows "2 FDs · ₹1,50,000"
And total FD value is reflected in the summary

**SCENARIO: Add FD to a bank account**
Given the user is viewing a bank account detail
When they click "Add FD"
And fill in FD number, principal, interest rate, start date, maturity date
And click "Save"
Then the FD appears in the FDs tab
And the bank card FD summary updates

**SCENARIO: View transactions for a bank account**
Given the user has 10+ expenses tagged with "HDFC"
When they view the bank account detail
And click the "Transactions" tab
Then 10 transactions are displayed
And each shows date, amount, vendor, category

**SCENARIO: Search transactions within a bank account**
Given the user has expenses tagged with "HDFC"
When they view the bank account transactions tab
And type "swiggy" in search
Then only matching transactions are shown
And the search input reflects the current query

**SCENARIO: Filter transactions by date range**
Given the user has expenses across multiple months
When they select a date range filter
Then only transactions within that range are shown

**SCENARIO: Edit bank account balance**
Given the user has an HDFC account with balance ₹50,000
When they click "Edit Balance"
And change it to ₹55,000
And click "Save"
Then the balance updates to ₹55,000
And the total balance recalculates

**SCENARIO: Bank accounts page loads via mobile API**
Given the mobile app calls GET /api/bank-accounts
When the response returns accounts with FDs
Then each account has name, bankName, balance, type
And FDs include fdNumber, principal, interestRate, dates

## Negative/Edge Scenarios

**SCENARIO: Add bank account with empty name shows error**
Given the user is adding a bank account
When they submit without filling bank name
Then an error message "Bank name is required" is shown
And the account is not created

**SCENARIO: Add bank account with negative balance**
Given the user is adding a bank account
When they enter a negative balance
Then the balance is accepted (overdraft is valid)
And the account shows with negative balance

**SCENARIO: Delete a bank account with confirmation**
Given the user has a bank account with linked transactions
When they delete the account
Then a confirmation dialog asks "Are you sure?"
When they confirm
Then the account is removed
And transactions remain (only unlinked from account)

**SCENARIO: Add FD with invalid date range**
Given the user is adding an FD
When they set maturity date before start date
Then an error "Maturity date must be after start date" is shown

**SCENARIO: Edit FD maturity amount below principal**
Given the user has an FD with principal ₹1,00,000
When they edit the maturity amount to ₹90,000
Then the update is accepted (negative return is valid)
And the FD shows the updated amount

**SCENARIO: API returns 401 without auth**
Given an unauthenticated request to GET /api/bank-accounts
When the API is called
Then a 401 status is returned
And an "Unauthorized" error message

**SCENARIO: Non-existent bank account returns 404**
Given an account ID that does not exist
When GET /api/bank-accounts/99999 is called
Then a 404 status is returned
