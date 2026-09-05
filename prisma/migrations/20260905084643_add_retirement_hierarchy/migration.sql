-- AlterTable
ALTER TABLE "Asset" ADD COLUMN     "isRentedOut" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isRetirementAsset" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "makeModel" TEXT,
ADD COLUMN     "monthlyRentalIncome" DOUBLE PRECISION,
ADD COLUMN     "plannedSaleAge" INTEGER,
ADD COLUMN     "plannedSalePurpose" TEXT,
ADD COLUMN     "rentalGrowthRate" DOUBLE PRECISION DEFAULT 5,
ADD COLUMN     "vehicleType" TEXT,
ADD COLUMN     "vehicleYear" INTEGER;

-- AlterTable
ALTER TABLE "Goal" ADD COLUMN     "currentMonthlyExpense" DOUBLE PRECISION,
ADD COLUMN     "isRetirementParent" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "lifeExpectancy" INTEGER,
ADD COLUMN     "medicalInflation" DOUBLE PRECISION DEFAULT 14,
ADD COLUMN     "parentGoalId" INTEGER,
ADD COLUMN     "postRetirementReturn" DOUBLE PRECISION DEFAULT 8,
ADD COLUMN     "preRetirementReturn" DOUBLE PRECISION DEFAULT 11,
ADD COLUMN     "retirementAge" INTEGER;

-- AlterTable
ALTER TABLE "Insurance" ADD COLUMN     "coverAmount" DOUBLE PRECISION,
ADD COLUMN     "healthCoverType" TEXT,
ADD COLUMN     "insuranceType" TEXT DEFAULT 'other',
ADD COLUMN     "termMaturityAge" INTEGER,
ADD COLUMN     "termPolicyTerm" INTEGER,
ADD COLUMN     "vehicleCoverValidity" TIMESTAMP(3),
ADD COLUMN     "vehicleType" TEXT;

-- CreateTable
CREATE TABLE "InvestmentGoalAllocation" (
    "id" SERIAL NOT NULL,
    "investmentId" INTEGER,
    "assetId" INTEGER,
    "fixedDepositId" INTEGER,
    "cashId" INTEGER,
    "insuranceId" INTEGER,
    "goalId" INTEGER NOT NULL,
    "allocationPct" DOUBLE PRECISION NOT NULL DEFAULT 100,
    "allocationValue" DOUBLE PRECISION,
    "isAutoAllocated" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InvestmentGoalAllocation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FamilyMember" (
    "id" SERIAL NOT NULL,
    "profileId" INTEGER NOT NULL,
    "relation" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "dateOfBirth" TIMESTAMP(3),
    "birthMonth" INTEGER,
    "birthYear" INTEGER,
    "annualIncome" DOUBLE PRECISION,
    "occupation" TEXT,
    "educationLevel" TEXT,
    "isDependent" BOOLEAN NOT NULL DEFAULT false,
    "monthlySupport" DOUBLE PRECISION,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FamilyMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Obligation" (
    "id" SERIAL NOT NULL,
    "profileId" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "monthlyAmount" DOUBLE PRECISION NOT NULL,
    "annualAmount" DOUBLE PRECISION,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Obligation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdImpression" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER,
    "slotId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "page" TEXT NOT NULL,
    "position" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdImpression_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdClick" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER,
    "slotId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "page" TEXT NOT NULL,
    "position" TEXT NOT NULL,
    "targetUrl" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdClick_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SponsoredPlacement" (
    "id" SERIAL NOT NULL,
    "provider" TEXT NOT NULL,
    "page" TEXT NOT NULL,
    "position" TEXT NOT NULL,
    "assetType" TEXT NOT NULL,
    "assetId" TEXT,
    "content" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "startsAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SponsoredPlacement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LoanProduct" (
    "id" SERIAL NOT NULL,
    "bankName" TEXT NOT NULL,
    "loanType" TEXT NOT NULL,
    "productName" TEXT NOT NULL,
    "interestRateMin" DECIMAL(5,2) NOT NULL,
    "interestRateMax" DECIMAL(5,2) NOT NULL,
    "maxAmount" DECIMAL(12,2),
    "tenureMonths" INTEGER,
    "processingFee" TEXT,
    "features" TEXT,
    "affiliateUrl" TEXT NOT NULL,
    "affiliateNetwork" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isSponsored" BOOLEAN NOT NULL DEFAULT false,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "profileId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LoanProduct_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FundMetadata" (
    "id" SERIAL NOT NULL,
    "schemeCode" INTEGER NOT NULL,
    "schemeName" TEXT NOT NULL,
    "fundHouse" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "subCategory" TEXT,
    "aiScore" DECIMAL(4,2) NOT NULL DEFAULT 0,
    "aiScoreBreakdown" TEXT,
    "aiSummary" TEXT,
    "prosPoints" TEXT,
    "consPoints" TEXT,
    "isCurated" BOOLEAN NOT NULL DEFAULT true,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastAnalyzedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FundMetadata_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FundReview" (
    "id" SERIAL NOT NULL,
    "schemeCode" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FundReview_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SystemConfig" (
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SystemConfig_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE INDEX "InvestmentGoalAllocation_goalId_idx" ON "InvestmentGoalAllocation"("goalId");

-- CreateIndex
CREATE INDEX "InvestmentGoalAllocation_investmentId_idx" ON "InvestmentGoalAllocation"("investmentId");

-- CreateIndex
CREATE INDEX "InvestmentGoalAllocation_assetId_idx" ON "InvestmentGoalAllocation"("assetId");

-- CreateIndex
CREATE INDEX "InvestmentGoalAllocation_fixedDepositId_idx" ON "InvestmentGoalAllocation"("fixedDepositId");

-- CreateIndex
CREATE INDEX "InvestmentGoalAllocation_cashId_idx" ON "InvestmentGoalAllocation"("cashId");

-- CreateIndex
CREATE INDEX "InvestmentGoalAllocation_insuranceId_idx" ON "InvestmentGoalAllocation"("insuranceId");

-- CreateIndex
CREATE INDEX "FamilyMember_profileId_idx" ON "FamilyMember"("profileId");

-- CreateIndex
CREATE INDEX "FamilyMember_relation_idx" ON "FamilyMember"("relation");

-- CreateIndex
CREATE INDEX "Obligation_profileId_idx" ON "Obligation"("profileId");

-- CreateIndex
CREATE INDEX "Obligation_type_idx" ON "Obligation"("type");

-- CreateIndex
CREATE INDEX "AdImpression_userId_idx" ON "AdImpression"("userId");

-- CreateIndex
CREATE INDEX "AdImpression_slotId_idx" ON "AdImpression"("slotId");

-- CreateIndex
CREATE INDEX "AdImpression_createdAt_idx" ON "AdImpression"("createdAt");

-- CreateIndex
CREATE INDEX "AdImpression_page_position_idx" ON "AdImpression"("page", "position");

-- CreateIndex
CREATE INDEX "AdClick_userId_idx" ON "AdClick"("userId");

-- CreateIndex
CREATE INDEX "AdClick_slotId_idx" ON "AdClick"("slotId");

-- CreateIndex
CREATE INDEX "AdClick_createdAt_idx" ON "AdClick"("createdAt");

-- CreateIndex
CREATE INDEX "AdClick_page_position_idx" ON "AdClick"("page", "position");

-- CreateIndex
CREATE INDEX "SponsoredPlacement_page_position_isActive_idx" ON "SponsoredPlacement"("page", "position", "isActive");

-- CreateIndex
CREATE INDEX "SponsoredPlacement_assetType_assetId_idx" ON "SponsoredPlacement"("assetType", "assetId");

-- CreateIndex
CREATE INDEX "LoanProduct_loanType_isActive_idx" ON "LoanProduct"("loanType", "isActive");

-- CreateIndex
CREATE INDEX "LoanProduct_isSponsored_isActive_idx" ON "LoanProduct"("isSponsored", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "FundMetadata_schemeCode_key" ON "FundMetadata"("schemeCode");

-- CreateIndex
CREATE INDEX "FundMetadata_category_isCurated_idx" ON "FundMetadata"("category", "isCurated");

-- CreateIndex
CREATE INDEX "FundMetadata_aiScore_idx" ON "FundMetadata"("aiScore");

-- CreateIndex
CREATE INDEX "FundReview_schemeCode_idx" ON "FundReview"("schemeCode");

-- CreateIndex
CREATE INDEX "FundReview_userId_idx" ON "FundReview"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "FundReview_schemeCode_userId_key" ON "FundReview"("schemeCode", "userId");

-- CreateIndex
CREATE INDEX "Goal_parentGoalId_idx" ON "Goal"("parentGoalId");

-- CreateIndex
CREATE INDEX "Insurance_insuranceType_idx" ON "Insurance"("insuranceType");

-- AddForeignKey
ALTER TABLE "Goal" ADD CONSTRAINT "Goal_parentGoalId_fkey" FOREIGN KEY ("parentGoalId") REFERENCES "Goal"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvestmentGoalAllocation" ADD CONSTRAINT "InvestmentGoalAllocation_investmentId_fkey" FOREIGN KEY ("investmentId") REFERENCES "Investment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvestmentGoalAllocation" ADD CONSTRAINT "InvestmentGoalAllocation_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvestmentGoalAllocation" ADD CONSTRAINT "InvestmentGoalAllocation_fixedDepositId_fkey" FOREIGN KEY ("fixedDepositId") REFERENCES "FixedDeposit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvestmentGoalAllocation" ADD CONSTRAINT "InvestmentGoalAllocation_cashId_fkey" FOREIGN KEY ("cashId") REFERENCES "CashBalance"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvestmentGoalAllocation" ADD CONSTRAINT "InvestmentGoalAllocation_insuranceId_fkey" FOREIGN KEY ("insuranceId") REFERENCES "Insurance"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvestmentGoalAllocation" ADD CONSTRAINT "InvestmentGoalAllocation_goalId_fkey" FOREIGN KEY ("goalId") REFERENCES "Goal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FamilyMember" ADD CONSTRAINT "FamilyMember_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Obligation" ADD CONSTRAINT "Obligation_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
