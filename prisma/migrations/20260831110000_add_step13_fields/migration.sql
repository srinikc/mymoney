-- Add Step 0-13 fields: Profile settings, Expense purposes/unusual, Goal gold/unit,
-- Investment EPF/FD/Chit fields, Loan EMI/status fields, Category keywords,
-- AutoCatVendorRule model, composite indexes.

-- Profile: language, dateOfBirth, annualIncome, occupation
ALTER TABLE "Profile" ADD COLUMN "language" TEXT NOT NULL DEFAULT 'en';
ALTER TABLE "Profile" ADD COLUMN "dateOfBirth" TIMESTAMP(3);
ALTER TABLE "Profile" ADD COLUMN "annualIncome" DOUBLE PRECISION;
ALTER TABLE "Profile" ADD COLUMN "occupation" TEXT;

-- Expense: purpose, isUnusual + composite indexes
ALTER TABLE "Expense" ADD COLUMN "purpose" TEXT;
ALTER TABLE "Expense" ADD COLUMN "isUnusual" BOOLEAN NOT NULL DEFAULT false;
CREATE INDEX "Expense_profileId_date_deletedAt_idx" ON "Expense"("profileId", "date", "deletedAt");
CREATE INDEX "Expense_profileId_categoryId_date_idx" ON "Expense"("profileId", "categoryId", "date");
CREATE INDEX "Expense_profileId_vendor_date_idx" ON "Expense"("profileId", "vendor", "date");
CREATE INDEX "Expense_profileId_isUnusual_idx" ON "Expense"("profileId", "isUnusual");

-- Goal: targetUnit, goldQuantity, purpose
ALTER TABLE "Goal" ADD COLUMN "targetUnit" TEXT DEFAULT '₹';
ALTER TABLE "Goal" ADD COLUMN "goldQuantity" DOUBLE PRECISION;
ALTER TABLE "Goal" ADD COLUMN "purpose" TEXT;

-- Investment: EPF, FD, Chit Fund fields
ALTER TABLE "Investment" ADD COLUMN "employeeContribution" DOUBLE PRECISION;
ALTER TABLE "Investment" ADD COLUMN "employerContribution" DOUBLE PRECISION;
ALTER TABLE "Investment" ADD COLUMN "passbookUrl" TEXT;
ALTER TABLE "Investment" ADD COLUMN "projectionYears" DOUBLE PRECISION;
ALTER TABLE "Investment" ADD COLUMN "fdNumber" TEXT;
ALTER TABLE "Investment" ADD COLUMN "bankName" TEXT;
ALTER TABLE "Investment" ADD COLUMN "maturityDate" TIMESTAMP(3);
ALTER TABLE "Investment" ADD COLUMN "paymentMode" TEXT;
ALTER TABLE "Investment" ADD COLUMN "monthlyContribution" DOUBLE PRECISION;
ALTER TABLE "Investment" ADD COLUMN "totalMonths" INTEGER;
ALTER TABLE "Investment" ADD COLUMN "completedMonths" INTEGER;

-- Asset: purpose
ALTER TABLE "Asset" ADD COLUMN "purpose" TEXT;

-- Loan: EMI tracking, status, linkedGoalId
ALTER TABLE "Loan" ADD COLUMN "linkedGoalId" INTEGER;
ALTER TABLE "Loan" ADD COLUMN "emiActive" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Loan" ADD COLUMN "emiStartDate" TIMESTAMP(3);
ALTER TABLE "Loan" ADD COLUMN "emiFrequency" TEXT;
ALTER TABLE "Loan" ADD COLUMN "remainingAmount" DOUBLE PRECISION;
ALTER TABLE "Loan" ADD COLUMN "status" TEXT NOT NULL DEFAULT 'active';
ALTER TABLE "Loan" ADD COLUMN "closedDate" TIMESTAMP(3);
CREATE INDEX "Loan_linkedGoalId_idx" ON "Loan"("linkedGoalId");
ALTER TABLE "Loan" ADD CONSTRAINT "Loan_linkedGoalId_fkey" FOREIGN KEY ("linkedGoalId") REFERENCES "Goal"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Category: keywords
ALTER TABLE "Category" ADD COLUMN "keywords" JSONB;

-- AutoCatVendorRule model
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
CREATE UNIQUE INDEX "AutoCatVendorRule_userId_vendorKey_key" ON "AutoCatVendorRule"("userId", "vendorKey");
CREATE INDEX "AutoCatVendorRule_userId_idx" ON "AutoCatVendorRule"("userId");
ALTER TABLE "AutoCatVendorRule" ADD CONSTRAINT "AutoCatVendorRule_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Add autoCatVendorRules relation to User (handled by Prisma, no SQL needed)
