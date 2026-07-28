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

-- CreateIndex
CREATE INDEX "ExpenseLink_profileId_idx" ON "ExpenseLink"("profileId");

-- CreateIndex
CREATE INDEX "ExpenseLink_expenseId_idx" ON "ExpenseLink"("expenseId");

-- CreateIndex
CREATE INDEX "ExpenseLink_linkType_idx" ON "ExpenseLink"("linkType");

-- CreateIndex
CREATE INDEX "ExpenseLink_confirmed_idx" ON "ExpenseLink"("confirmed");

-- AddForeignKey
ALTER TABLE "ExpenseLink" ADD CONSTRAINT "ExpenseLink_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExpenseLink" ADD CONSTRAINT "ExpenseLink_expenseId_fkey" FOREIGN KEY ("expenseId") REFERENCES "Expense"("id") ON DELETE CASCADE ON UPDATE CASCADE;
