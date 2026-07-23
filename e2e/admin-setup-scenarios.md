# Admin Setup & Login — Gherkin Scenarios

## Overview
First-run admin account creation and credential-based sign-in. Covers the complete flow from a fresh install to a logged-in session.

---

## Admin Setup Flow

### Positive Scenarios

**SCENARIO: First-run redirects to /setup**
Given the system has no admin user
When a user navigates to /login
Then they are redirected to /setup
And the setup form is displayed with email pre-filled to "srinikc@gmail.com"

**SCENARIO: Create admin account with valid credentials**
Given the user is on the /setup page
When they enter a password "TestPass123!" and confirm it
And click "Create Admin Account"
Then a success message "Admin Account Created" is shown
And after 2 seconds they are redirected to /login

**SCENARIO: Admin user is created in database**
Given the setup API is called with valid email and password
When POST /api/setup/admin is submitted
Then the response has { ok: true }
And a user record exists with role "admin" and tier "premium"
And a default profile is created

### Negative / Edge Scenarios

**SCENARIO: Setup page redirects when admin already exists**
Given an admin user already exists
When a non-admin user navigates to /setup
Then they are redirected to /login
And the login form is shown

**SCENARIO: Setup API rejects duplicate admin creation**
Given an admin user already exists
When POST /api/setup/admin is called
Then the response status is 400
And the error message is "Admin already exists"

**SCENARIO: Setup rejects short password**
Given the user is on the /setup page
When they enter a password "1234567" (7 characters)
Then an error "Password must be at least 8 characters" is shown
And the account is not created

**SCENARIO: Setup rejects mismatched passwords**
Given the user is on the /setup page
When they enter password "TestPass123!" and confirm password "DifferentPass1"
Then an error "Passwords do not match" is shown
And the account is not created

**SCENARIO: Setup rejects empty fields**
Given the user is on the /setup page
When they click "Create Admin Account" without filling all fields
Then an error "All fields are required" is shown

**SCENARIO: Setup rejects existing user email**
Given a user with email "test@example.com" already exists
When POST /api/setup/admin is called with that email
Then the response status is 400
And the error message is "A user with this email already exists"

---

## Admin Login Flow

### Positive Scenarios

**SCENARIO: Admin signs in with email and password**
Given an admin account exists with email "srinikc@gmail.com"
When they navigate to /login
And fill in email "srinikc@gmail.com" and correct password
And click "Sign in with Email"
Then they are redirected to the Dashboard
And the session is authenticated

**SCENARIO: Login page shows MyMoney branding**
Given the user navigates to /login
Then the MyMoney logo and title are displayed
And "Sign in" card is shown with Google and email options

### Negative / Edge Scenarios

**SCENARIO: Login with wrong password shows error**
Given an admin account exists
When they enter correct email but wrong password
And click "Sign in with Email"
Then an error "Invalid email or password" is shown
And they remain on the login page

**SCENARIO: Login with non-existent email shows error**
Given no account exists with "unknown@example.com"
When they enter that email and any password
And click "Sign in with Email"
Then an error "Invalid email or password" is shown

---

## Test-Login Endpoint

**SCENARIO: Test-login works when E2E=true**
Given the E2E environment variable is set to "true"
When GET /api/auth/test-login is called
Then the response sets a session cookie
And the user is redirected

**SCENARIO: Test-login returns 403 when E2E!=true**
Given E2E environment variable is not set to "true"
When GET /api/auth/test-login is called
Then a 403 response is returned
