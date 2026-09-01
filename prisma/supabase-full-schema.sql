-- CreateTable
CREATE TABLE "User" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "emailVerified" TIMESTAMP(3),
    "image" TEXT,
    "hashedPassword" TEXT,
    "role" TEXT NOT NULL DEFAULT 'user',
    "tier" TEXT NOT NULL DEFAULT 'free',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Profile" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "language" TEXT NOT NULL DEFAULT 'en',
    "dateOfBirth" TIMESTAMP(3),
    "annualIncome" DOUBLE PRECISION,
    "occupation" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Profile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Account" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" SERIAL NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VerificationToken" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL
);

-- CreateTable
CREATE TABLE "FeatureFlag" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "tier" TEXT NOT NULL DEFAULT 'free',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FeatureFlag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" SERIAL NOT NULL,
    "profileId" INTEGER NOT NULL,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" INTEGER,
    "metadata" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Category" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'expense',
    "icon" TEXT NOT NULL DEFAULT 'circle',
    "color" TEXT NOT NULL DEFAULT '#6366f1',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "keywords" JSONB,

    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Expense" (
    "id" SERIAL NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "categoryId" INTEGER NOT NULL,
    "subCategory" TEXT,
    "person" TEXT,
    "vendor" TEXT,
    "description" TEXT,
    "paymentMode" TEXT NOT NULL DEFAULT 'UPI',
    "recurrenceType" TEXT NOT NULL DEFAULT 'onetime',
    "otherType" TEXT,
    "tags" TEXT,
    "receiptUrl" TEXT,
    "isShared" BOOLEAN NOT NULL DEFAULT false,
    "sharedWith" TEXT,
    "paidThrough" TEXT,
    "bankAccount" TEXT,
    "notes" TEXT,
    "importSessionId" INTEGER,
    "flagged" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" TIMESTAMP(3),
    "purpose" TEXT,
    "isUnusual" BOOLEAN NOT NULL DEFAULT false,
    "profileId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Expense_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Budget" (
    "id" SERIAL NOT NULL,
    "categoryId" INTEGER NOT NULL,
    "subCategory" TEXT,
    "month" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "profileId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Budget_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Goal" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "targetAmount" DOUBLE PRECISION NOT NULL,
    "currentAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "deadline" TIMESTAMP(3),
    "category" TEXT NOT NULL DEFAULT 'savings',
    "term" TEXT NOT NULL DEFAULT 'medium',
    "priority" TEXT NOT NULL DEFAULT 'P1',
    "type" TEXT NOT NULL DEFAULT 'Other',
    "description" TEXT,
    "monthlyContribution" DOUBLE PRECISION,
    "notes" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "targetUnit" TEXT DEFAULT 'Γé╣',
    "goldQuantity" DOUBLE PRECISION,
    "purpose" TEXT,
    "profileId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Goal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Investment" (
    "id" SERIAL NOT NULL,
    "type" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "symbol" TEXT,
    "quantity" INTEGER,
    "buyPrice" DOUBLE PRECISION,
    "amount" DOUBLE PRECISION NOT NULL,
    "currentValue" DOUBLE PRECISION NOT NULL,
    "purchaseDate" TIMESTAMP(3) NOT NULL,
    "returnRate" DOUBLE PRECISION,
    "purpose" TEXT,
    "linkedGoalId" INTEGER,
    "notes" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "employeeContribution" DOUBLE PRECISION,
    "employerContribution" DOUBLE PRECISION,
    "passbookUrl" TEXT,
    "projectionYears" DOUBLE PRECISION,
    "fdNumber" TEXT,
    "bankName" TEXT,
    "maturityDate" TIMESTAMP(3),
    "paymentMode" TEXT,
    "monthlyContribution" DOUBLE PRECISION,
    "totalMonths" INTEGER,
    "completedMonths" INTEGER,
    "profileId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Investment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VendorMapping" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "vendorKey" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT,
    "subCategory" TEXT,
    "person" TEXT,
    "source" TEXT NOT NULL DEFAULT 'manual',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VendorMapping_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AutoCatVendorRule" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "vendorKey" TEXT NOT NULL,
    "category" TEXT,
    "subCategory" TEXT,
    "person" TEXT,
    "source" TEXT NOT NULL DEFAULT 'keyword',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AutoCatVendorRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ImportSession" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER,
    "profileId" INTEGER,
    "source" TEXT NOT NULL,
    "fileName" TEXT,
    "totalRows" INTEGER NOT NULL DEFAULT 0,
    "autoMapped" INTEGER NOT NULL DEFAULT 0,
    "newMerchants" INTEGER NOT NULL DEFAULT 0,
    "skipped" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'preview',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ImportSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Reminder" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "type" TEXT NOT NULL DEFAULT 'custom',
    "priority" TEXT NOT NULL DEFAULT 'normal',
    "dueDate" TIMESTAMP(3),
    "amount" DOUBLE PRECISION,
    "categoryId" INTEGER,
    "merchantKey" TEXT,
    "recurring" TEXT NOT NULL DEFAULT 'none',
    "isCompleted" BOOLEAN NOT NULL DEFAULT false,
    "completedAt" TIMESTAMP(3),
    "profileId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Reminder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Deal" (
    "id" SERIAL NOT NULL,
    "merchant" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "discount" TEXT,
    "couponCode" TEXT,
    "url" TEXT,
    "validUntil" TIMESTAMP(3),
    "category" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "profileId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Deal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Asset" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'other',
    "currentValue" DOUBLE PRECISION NOT NULL,
    "purchasePrice" DOUBLE PRECISION,
    "purchaseDate" TIMESTAMP(3),
    "quantity" DOUBLE PRECISION,
    "unit" TEXT,
    "location" TEXT,
    "status" TEXT NOT NULL DEFAULT 'owned',
    "notes" TEXT,
    "purpose" TEXT,
    "profileId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Asset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Liability" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'other',
    "amount" DOUBLE PRECISION NOT NULL,
    "interestRate" DOUBLE PRECISION,
    "dueDate" TIMESTAMP(3),
    "notes" TEXT,
    "profileId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Liability_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Subscription" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "billingCycle" TEXT NOT NULL DEFAULT 'monthly',
    "nextDueDate" TIMESTAMP(3),
    "category" TEXT NOT NULL DEFAULT 'entertainment',
    "status" TEXT NOT NULL DEFAULT 'active',
    "notes" TEXT,
    "profileId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AlertRule" (
    "id" SERIAL NOT NULL,
    "profileId" INTEGER,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "config" TEXT,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AlertRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotificationConfig" (
    "id" SERIAL NOT NULL,
    "profileId" INTEGER,
    "channel" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "config" TEXT,
    "alertTypes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NotificationConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IncomeSource" (
    "id" SERIAL NOT NULL,
    "profileId" INTEGER,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'monthly',
    "amount" DOUBLE PRECISION NOT NULL,
    "categoryId" INTEGER NOT NULL,
    "autoDetect" BOOLEAN NOT NULL DEFAULT false,
    "matchMerchant" TEXT,
    "matchPerson" TEXT,
    "paymentMode" TEXT,
    "bankAccount" TEXT,
    "businessRevenue" DOUBLE PRECISION,
    "businessExpenses" DOUBLE PRECISION,
    "businessOtherExp" TEXT,
    "businessOtherAmt" DOUBLE PRECISION,
    "businessInvestment" DOUBLE PRECISION,
    "isProfitPostTax" BOOLEAN NOT NULL DEFAULT false,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IncomeSource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Loan" (
    "id" SERIAL NOT NULL,
    "profileId" INTEGER,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'Other',
    "principal" DOUBLE PRECISION NOT NULL,
    "interestRate" DOUBLE PRECISION NOT NULL,
    "tenureMonths" INTEGER NOT NULL,
    "emiAmount" DOUBLE PRECISION NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "lender" TEXT,
    "notes" TEXT,
    "linkedGoalId" INTEGER,
    "emiActive" BOOLEAN NOT NULL DEFAULT false,
    "emiStartDate" TIMESTAMP(3),
    "emiFrequency" TEXT,
    "remainingAmount" DOUBLE PRECISION,
    "status" TEXT NOT NULL DEFAULT 'active',
    "closedDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Loan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Insurance" (
    "id" SERIAL NOT NULL,
    "profileId" INTEGER,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'Other',
    "provider" TEXT,
    "policyNumber" TEXT,
    "sumAssured" DOUBLE PRECISION,
    "premium" DOUBLE PRECISION NOT NULL,
    "premiumFrequency" TEXT NOT NULL DEFAULT 'yearly',
    "startDate" TIMESTAMP(3) NOT NULL,
    "renewalDate" TIMESTAMP(3),
    "nominee" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Insurance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TaxDocument" (
    "id" SERIAL NOT NULL,
    "profileId" INTEGER,
    "type" TEXT NOT NULL,
    "fy" TEXT NOT NULL,
    "label" TEXT,
    "fileName" TEXT NOT NULL,
    "filePath" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "metadata" JSONB,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TaxDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ITRRecord" (
    "id" SERIAL NOT NULL,
    "profileId" INTEGER,
    "ay" TEXT NOT NULL,
    "itrForm" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "filedDate" TIMESTAMP(3),
    "acknowledgmentNo" TEXT,
    "refundAmount" DOUBLE PRECISION,
    "taxableIncome" DOUBLE PRECISION,
    "taxLiability" DOUBLE PRECISION,
    "tdsClaimed" DOUBLE PRECISION,
    "uploadedCopy" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ITRRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExpenseLink" (
    "id" SERIAL NOT NULL,
    "profileId" INTEGER,
    "expenseId" INTEGER NOT NULL,
    "linkType" TEXT NOT NULL,
    "targetId" INTEGER NOT NULL,
    "autoDetected" BOOLEAN NOT NULL DEFAULT true,
    "confirmed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExpenseLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserSetting" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserSetting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "orderId" TEXT NOT NULL,
    "paymentId" TEXT,
    "signature" TEXT,
    "amount" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "plan" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'created',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BankAccount" (
    "id" SERIAL NOT NULL,
    "profileId" INTEGER,
    "name" TEXT NOT NULL,
    "bankName" TEXT NOT NULL,
    "accountNumber" TEXT,
    "type" TEXT NOT NULL DEFAULT 'savings',
    "ifscCode" TEXT,
    "branch" TEXT,
    "balance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "source" TEXT NOT NULL DEFAULT 'manual',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastSynced" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BankAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FixedDeposit" (
    "id" SERIAL NOT NULL,
    "profileId" INTEGER,
    "bankAccountId" INTEGER NOT NULL,
    "fdNumber" TEXT,
    "principal" DOUBLE PRECISION NOT NULL,
    "interestRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "startDate" TIMESTAMP(3),
    "maturityDate" TIMESTAMP(3),
    "maturityAmount" DOUBLE PRECISION,
    "status" TEXT NOT NULL DEFAULT 'active',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FixedDeposit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CashBalance" (
    "id" SERIAL NOT NULL,
    "profileId" INTEGER,
    "amount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CashBalance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SharedProfile" (
    "id" SERIAL NOT NULL,
    "profileId" INTEGER NOT NULL,
    "invitedEmail" TEXT NOT NULL,
    "invitedUserId" INTEGER,
    "invitedBy" INTEGER NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'viewer',
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SharedProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GmailImportLog" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "messageId" TEXT NOT NULL,
    "importedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GmailImportLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GmailScan" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'running',
    "totalEmails" INTEGER NOT NULL DEFAULT 0,
    "processed" INTEGER NOT NULL DEFAULT 0,
    "parsed" INTEGER NOT NULL DEFAULT 0,
    "alreadyImported" INTEGER NOT NULL DEFAULT 0,
    "transactions" JSONB,
    "journal" JSONB,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GmailScan_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Account_provider_providerAccountId_key" ON "Account"("provider", "providerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "Session_sessionToken_key" ON "Session"("sessionToken");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_token_key" ON "VerificationToken"("token");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_identifier_token_key" ON "VerificationToken"("identifier", "token");

-- CreateIndex
CREATE UNIQUE INDEX "FeatureFlag_name_key" ON "FeatureFlag"("name");

-- CreateIndex
CREATE INDEX "AuditLog_profileId_idx" ON "AuditLog"("profileId");

-- CreateIndex
CREATE INDEX "AuditLog_action_idx" ON "AuditLog"("action");

-- CreateIndex
CREATE INDEX "AuditLog_entity_idx" ON "AuditLog"("entity");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Category_name_key" ON "Category"("name");

-- CreateIndex
CREATE INDEX "Expense_date_idx" ON "Expense"("date");

-- CreateIndex
CREATE INDEX "Expense_categoryId_idx" ON "Expense"("categoryId");

-- CreateIndex
CREATE INDEX "Expense_vendor_idx" ON "Expense"("vendor");

-- CreateIndex
CREATE INDEX "Expense_person_idx" ON "Expense"("person");

-- CreateIndex
CREATE INDEX "Expense_importSessionId_idx" ON "Expense"("importSessionId");

-- CreateIndex
CREATE INDEX "Expense_profileId_idx" ON "Expense"("profileId");

-- CreateIndex
CREATE INDEX "Expense_profileId_subCategory_idx" ON "Expense"("profileId", "subCategory");

-- CreateIndex
CREATE INDEX "Expense_profileId_person_idx" ON "Expense"("profileId", "person");

-- CreateIndex
CREATE INDEX "Expense_profileId_deletedAt_idx" ON "Expense"("profileId", "deletedAt");

-- CreateIndex
CREATE INDEX "Expense_profileId_date_deletedAt_idx" ON "Expense"("profileId", "date", "deletedAt");

-- CreateIndex
CREATE INDEX "Expense_profileId_categoryId_date_idx" ON "Expense"("profileId", "categoryId", "date");

-- CreateIndex
CREATE INDEX "Expense_profileId_vendor_date_idx" ON "Expense"("profileId", "vendor", "date");

-- CreateIndex
CREATE INDEX "Expense_profileId_isUnusual_idx" ON "Expense"("profileId", "isUnusual");

-- CreateIndex
CREATE INDEX "Budget_categoryId_idx" ON "Budget"("categoryId");

-- CreateIndex
CREATE INDEX "Budget_profileId_idx" ON "Budget"("profileId");

-- CreateIndex
CREATE UNIQUE INDEX "Budget_categoryId_month_year_key" ON "Budget"("categoryId", "month", "year");

-- CreateIndex
CREATE INDEX "Goal_profileId_idx" ON "Goal"("profileId");

-- CreateIndex
CREATE INDEX "Investment_profileId_idx" ON "Investment"("profileId");

-- CreateIndex
CREATE INDEX "Investment_type_idx" ON "Investment"("type");

-- CreateIndex
CREATE INDEX "Investment_symbol_idx" ON "Investment"("symbol");

-- CreateIndex
CREATE INDEX "Investment_linkedGoalId_idx" ON "Investment"("linkedGoalId");

-- CreateIndex
CREATE INDEX "VendorMapping_userId_idx" ON "VendorMapping"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "VendorMapping_userId_vendorKey_key" ON "VendorMapping"("userId", "vendorKey");

-- CreateIndex
CREATE INDEX "AutoCatVendorRule_userId_idx" ON "AutoCatVendorRule"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "AutoCatVendorRule_userId_vendorKey_key" ON "AutoCatVendorRule"("userId", "vendorKey");

-- CreateIndex
CREATE INDEX "ImportSession_userId_idx" ON "ImportSession"("userId");

-- CreateIndex
CREATE INDEX "ImportSession_profileId_idx" ON "ImportSession"("profileId");

-- CreateIndex
CREATE INDEX "Reminder_dueDate_idx" ON "Reminder"("dueDate");

-- CreateIndex
CREATE INDEX "Reminder_isCompleted_idx" ON "Reminder"("isCompleted");

-- CreateIndex
CREATE INDEX "Reminder_categoryId_idx" ON "Reminder"("categoryId");

-- CreateIndex
CREATE INDEX "Reminder_profileId_idx" ON "Reminder"("profileId");

-- CreateIndex
CREATE INDEX "Deal_merchant_idx" ON "Deal"("merchant");

-- CreateIndex
CREATE INDEX "Deal_isActive_idx" ON "Deal"("isActive");

-- CreateIndex
CREATE INDEX "Deal_profileId_idx" ON "Deal"("profileId");

-- CreateIndex
CREATE INDEX "Asset_profileId_idx" ON "Asset"("profileId");

-- CreateIndex
CREATE INDEX "Asset_type_idx" ON "Asset"("type");

-- CreateIndex
CREATE INDEX "Asset_status_idx" ON "Asset"("status");

-- CreateIndex
CREATE INDEX "Liability_profileId_idx" ON "Liability"("profileId");

-- CreateIndex
CREATE INDEX "Subscription_profileId_idx" ON "Subscription"("profileId");

-- CreateIndex
CREATE INDEX "Subscription_nextDueDate_idx" ON "Subscription"("nextDueDate");

-- CreateIndex
CREATE INDEX "Subscription_status_idx" ON "Subscription"("status");

-- CreateIndex
CREATE INDEX "AlertRule_profileId_idx" ON "AlertRule"("profileId");

-- CreateIndex
CREATE INDEX "NotificationConfig_profileId_idx" ON "NotificationConfig"("profileId");

-- CreateIndex
CREATE UNIQUE INDEX "NotificationConfig_profileId_channel_key" ON "NotificationConfig"("profileId", "channel");

-- CreateIndex
CREATE INDEX "IncomeSource_profileId_idx" ON "IncomeSource"("profileId");

-- CreateIndex
CREATE INDEX "IncomeSource_categoryId_idx" ON "IncomeSource"("categoryId");

-- CreateIndex
CREATE INDEX "Loan_profileId_idx" ON "Loan"("profileId");

-- CreateIndex
CREATE INDEX "Loan_linkedGoalId_idx" ON "Loan"("linkedGoalId");

-- CreateIndex
CREATE INDEX "Insurance_profileId_idx" ON "Insurance"("profileId");

-- CreateIndex
CREATE INDEX "TaxDocument_profileId_idx" ON "TaxDocument"("profileId");

-- CreateIndex
CREATE INDEX "TaxDocument_fy_idx" ON "TaxDocument"("fy");

-- CreateIndex
CREATE INDEX "TaxDocument_type_idx" ON "TaxDocument"("type");

-- CreateIndex
CREATE INDEX "ITRRecord_profileId_idx" ON "ITRRecord"("profileId");

-- CreateIndex
CREATE INDEX "ITRRecord_ay_idx" ON "ITRRecord"("ay");

-- CreateIndex
CREATE INDEX "ExpenseLink_profileId_idx" ON "ExpenseLink"("profileId");

-- CreateIndex
CREATE INDEX "ExpenseLink_expenseId_idx" ON "ExpenseLink"("expenseId");

-- CreateIndex
CREATE INDEX "ExpenseLink_linkType_idx" ON "ExpenseLink"("linkType");

-- CreateIndex
CREATE INDEX "ExpenseLink_confirmed_idx" ON "ExpenseLink"("confirmed");

-- CreateIndex
CREATE INDEX "UserSetting_userId_idx" ON "UserSetting"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "UserSetting_userId_key_key" ON "UserSetting"("userId", "key");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_orderId_key" ON "Payment"("orderId");

-- CreateIndex
CREATE INDEX "Payment_userId_idx" ON "Payment"("userId");

-- CreateIndex
CREATE INDEX "Payment_orderId_idx" ON "Payment"("orderId");

-- CreateIndex
CREATE INDEX "Payment_status_idx" ON "Payment"("status");

-- CreateIndex
CREATE INDEX "BankAccount_profileId_idx" ON "BankAccount"("profileId");

-- CreateIndex
CREATE INDEX "BankAccount_bankName_idx" ON "BankAccount"("bankName");

-- CreateIndex
CREATE INDEX "FixedDeposit_profileId_idx" ON "FixedDeposit"("profileId");

-- CreateIndex
CREATE INDEX "FixedDeposit_bankAccountId_idx" ON "FixedDeposit"("bankAccountId");

-- CreateIndex
CREATE INDEX "FixedDeposit_status_idx" ON "FixedDeposit"("status");

-- CreateIndex
CREATE INDEX "CashBalance_profileId_idx" ON "CashBalance"("profileId");

-- CreateIndex
CREATE INDEX "SharedProfile_invitedUserId_idx" ON "SharedProfile"("invitedUserId");

-- CreateIndex
CREATE INDEX "SharedProfile_invitedBy_idx" ON "SharedProfile"("invitedBy");

-- CreateIndex
CREATE INDEX "SharedProfile_status_idx" ON "SharedProfile"("status");

-- CreateIndex
CREATE UNIQUE INDEX "SharedProfile_profileId_invitedEmail_key" ON "SharedProfile"("profileId", "invitedEmail");

-- CreateIndex
CREATE INDEX "GmailImportLog_userId_idx" ON "GmailImportLog"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "GmailImportLog_userId_messageId_key" ON "GmailImportLog"("userId", "messageId");

-- CreateIndex
CREATE INDEX "GmailScan_userId_status_idx" ON "GmailScan"("userId", "status");

-- CreateIndex
CREATE INDEX "GmailScan_userId_createdAt_idx" ON "GmailScan"("userId", "createdAt");

-- AddForeignKey
ALTER TABLE "Profile" ADD CONSTRAINT "Profile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_importSessionId_fkey" FOREIGN KEY ("importSessionId") REFERENCES "ImportSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Budget" ADD CONSTRAINT "Budget_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Budget" ADD CONSTRAINT "Budget_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Goal" ADD CONSTRAINT "Goal_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Investment" ADD CONSTRAINT "Investment_linkedGoalId_fkey" FOREIGN KEY ("linkedGoalId") REFERENCES "Goal"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Investment" ADD CONSTRAINT "Investment_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorMapping" ADD CONSTRAINT "VendorMapping_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AutoCatVendorRule" ADD CONSTRAINT "AutoCatVendorRule_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImportSession" ADD CONSTRAINT "ImportSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImportSession" ADD CONSTRAINT "ImportSession_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reminder" ADD CONSTRAINT "Reminder_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reminder" ADD CONSTRAINT "Reminder_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Deal" ADD CONSTRAINT "Deal_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Asset" ADD CONSTRAINT "Asset_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Liability" ADD CONSTRAINT "Liability_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AlertRule" ADD CONSTRAINT "AlertRule_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationConfig" ADD CONSTRAINT "NotificationConfig_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IncomeSource" ADD CONSTRAINT "IncomeSource_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IncomeSource" ADD CONSTRAINT "IncomeSource_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Loan" ADD CONSTRAINT "Loan_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Loan" ADD CONSTRAINT "Loan_linkedGoalId_fkey" FOREIGN KEY ("linkedGoalId") REFERENCES "Goal"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Insurance" ADD CONSTRAINT "Insurance_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaxDocument" ADD CONSTRAINT "TaxDocument_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ITRRecord" ADD CONSTRAINT "ITRRecord_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExpenseLink" ADD CONSTRAINT "ExpenseLink_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExpenseLink" ADD CONSTRAINT "ExpenseLink_expenseId_fkey" FOREIGN KEY ("expenseId") REFERENCES "Expense"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserSetting" ADD CONSTRAINT "UserSetting_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BankAccount" ADD CONSTRAINT "BankAccount_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FixedDeposit" ADD CONSTRAINT "FixedDeposit_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FixedDeposit" ADD CONSTRAINT "FixedDeposit_bankAccountId_fkey" FOREIGN KEY ("bankAccountId") REFERENCES "BankAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CashBalance" ADD CONSTRAINT "CashBalance_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SharedProfile" ADD CONSTRAINT "SharedProfile_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SharedProfile" ADD CONSTRAINT "SharedProfile_invitedUserId_fkey" FOREIGN KEY ("invitedUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SharedProfile" ADD CONSTRAINT "SharedProfile_invitedBy_fkey" FOREIGN KEY ("invitedBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GmailImportLog" ADD CONSTRAINT "GmailImportLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GmailScan" ADD CONSTRAINT "GmailScan_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

