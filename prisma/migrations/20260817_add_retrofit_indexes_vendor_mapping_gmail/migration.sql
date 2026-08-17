-- DropIndex
DROP INDEX "NotificationConfig_channel_key";

-- AlterTable
ALTER TABLE "AlertRule" ADD COLUMN     "profileId" INTEGER;

-- AlterTable
ALTER TABLE "ImportSession" ADD COLUMN     "profileId" INTEGER,
ADD COLUMN     "userId" INTEGER;

-- AlterTable
ALTER TABLE "NotificationConfig" ADD COLUMN     "profileId" INTEGER;

-- DropTable
DROP TABLE "MerchantMapping";

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
CREATE INDEX "VendorMapping_userId_idx" ON "VendorMapping"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "VendorMapping_userId_vendorKey_key" ON "VendorMapping"("userId", "vendorKey");

-- CreateIndex
CREATE INDEX "GmailImportLog_userId_idx" ON "GmailImportLog"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "GmailImportLog_userId_messageId_key" ON "GmailImportLog"("userId", "messageId");

-- CreateIndex
CREATE INDEX "GmailScan_userId_status_idx" ON "GmailScan"("userId", "status");

-- CreateIndex
CREATE INDEX "GmailScan_userId_createdAt_idx" ON "GmailScan"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "AlertRule_profileId_idx" ON "AlertRule"("profileId");

-- CreateIndex
CREATE INDEX "Expense_profileId_subCategory_idx" ON "Expense"("profileId", "subCategory");

-- CreateIndex
CREATE INDEX "Expense_profileId_person_idx" ON "Expense"("profileId", "person");

-- CreateIndex
CREATE INDEX "Expense_profileId_deletedAt_idx" ON "Expense"("profileId", "deletedAt");

-- CreateIndex
CREATE INDEX "ImportSession_userId_idx" ON "ImportSession"("userId");

-- CreateIndex
CREATE INDEX "ImportSession_profileId_idx" ON "ImportSession"("profileId");

-- CreateIndex
CREATE INDEX "NotificationConfig_profileId_idx" ON "NotificationConfig"("profileId");

-- CreateIndex
CREATE UNIQUE INDEX "NotificationConfig_profileId_channel_key" ON "NotificationConfig"("profileId", "channel");

-- AddForeignKey
ALTER TABLE "VendorMapping" ADD CONSTRAINT "VendorMapping_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImportSession" ADD CONSTRAINT "ImportSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImportSession" ADD CONSTRAINT "ImportSession_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AlertRule" ADD CONSTRAINT "AlertRule_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationConfig" ADD CONSTRAINT "NotificationConfig_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GmailImportLog" ADD CONSTRAINT "GmailImportLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GmailScan" ADD CONSTRAINT "GmailScan_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

