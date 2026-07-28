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

-- AddForeignKey
ALTER TABLE "TaxDocument" ADD CONSTRAINT "TaxDocument_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ITRRecord" ADD CONSTRAINT "ITRRecord_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE SET NULL ON UPDATE CASCADE;
