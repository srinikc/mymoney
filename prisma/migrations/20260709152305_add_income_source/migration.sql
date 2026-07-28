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

-- CreateIndex
CREATE INDEX "IncomeSource_profileId_idx" ON "IncomeSource"("profileId");

-- CreateIndex
CREATE INDEX "IncomeSource_categoryId_idx" ON "IncomeSource"("categoryId");

-- AddForeignKey
ALTER TABLE "IncomeSource" ADD CONSTRAINT "IncomeSource_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IncomeSource" ADD CONSTRAINT "IncomeSource_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
