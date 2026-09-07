-- AlterTable
ALTER TABLE "BackupHistory" ADD COLUMN     "destinations" TEXT DEFAULT 'r2,supabase',
ADD COLUMN     "googleDriveKey" TEXT,
ADD COLUMN     "localKey" TEXT;
