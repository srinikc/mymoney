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

-- CreateIndex
CREATE INDEX "CashBalance_profileId_idx" ON "CashBalance"("profileId");

-- AddForeignKey
ALTER TABLE "CashBalance" ADD CONSTRAINT "CashBalance_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE SET NULL ON UPDATE CASCADE;