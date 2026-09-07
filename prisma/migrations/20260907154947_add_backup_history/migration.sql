-- CreateTable
CREATE TABLE "BackupHistory" (
    "id" SERIAL NOT NULL,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "backupType" TEXT NOT NULL DEFAULT 'full',
    "includeDb" BOOLEAN NOT NULL DEFAULT true,
    "includeFiles" BOOLEAN NOT NULL DEFAULT true,
    "includeConfig" BOOLEAN NOT NULL DEFAULT true,
    "dbDumpSize" INTEGER,
    "filesSize" INTEGER,
    "configSize" INTEGER,
    "totalSize" INTEGER,
    "compressedSize" INTEGER,
    "r2Key" TEXT,
    "supabaseKey" TEXT,
    "checksum" TEXT,
    "encrypted" BOOLEAN NOT NULL DEFAULT true,
    "encryptionIv" TEXT,
    "triggeredBy" TEXT NOT NULL DEFAULT 'cron',
    "error" TEXT,
    "metadata" JSONB,
    "durationMs" INTEGER,
    "restoredFrom" INTEGER,
    "restoreTarget" TEXT,
    "profileId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BackupHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BackupHistory_type_idx" ON "BackupHistory"("type");

-- CreateIndex
CREATE INDEX "BackupHistory_status_idx" ON "BackupHistory"("status");

-- CreateIndex
CREATE INDEX "BackupHistory_createdAt_idx" ON "BackupHistory"("createdAt");

-- CreateIndex
CREATE INDEX "BackupHistory_type_status_idx" ON "BackupHistory"("type", "status");

-- AddForeignKey
ALTER TABLE "BackupHistory" ADD CONSTRAINT "BackupHistory_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE SET NULL ON UPDATE CASCADE;
