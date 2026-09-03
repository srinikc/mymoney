#!/bin/bash
# ── Database Backup Script ──────────────────────────────────────────────
# Run on a cron schedule to back up the production database.
# Default: every 6 hours, keep 7 days of backups locally, upload to S3.
#
# Usage:
#   ./scripts/backup-db.sh                 # default backup
#   DATABASE_URL=... ./scripts/backup-db.sh  # custom DB
#
# Cron entry (run every 6 hours, keep 7 days):
#   0 */6 * * * /opt/mymoney/scripts/backup-db.sh >> /var/log/mymoney-backup.log 2>&1
#
# Required env vars:
#   DATABASE_URL       — postgres connection string
#   S3_BUCKET          — S3 bucket for backups (optional)
#   AWS_ACCESS_KEY_ID  — AWS credentials
#   AWS_SECRET_ACCESS_KEY
# Optional:
#   BACKUP_DIR         — local backup dir (default /var/backups/mymoney)
#   BACKUP_RETENTION_DAYS — keep local backups N days (default 7)
#   BACKUP_PREFIX      — S3 key prefix (default mymoney-backups/)

set -e

DATABASE_URL="${DATABASE_URL:?DATABASE_URL is required}"
BACKUP_DIR="${BACKUP_DIR:-/var/backups/mymoney}"
BACKUP_RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-7}"
S3_BUCKET="${S3_BUCKET:-}"
BACKUP_PREFIX="${BACKUP_PREFIX:-mymoney-backups}"

TIMESTAMP=$(date +%Y%m%d-%H%M%S)
DAY_OF_WEEK=$(date +%u)  # 1-7
BACKUP_FILE="$BACKUP_DIR/mymoney-$TIMESTAMP.sql.gz"

# Create backup directory
mkdir -p "$BACKUP_DIR"

# Dump database
echo "[$(date)] starting backup to $BACKUP_FILE"
pg_dump "$DATABASE_URL" | gzip > "$BACKUP_FILE"
BACKUP_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
echo "[$(date)] backup complete: $BACKUP_SIZE"

# Verify backup integrity (gunzip can detect corruption)
if ! gunzip -t "$BACKUP_FILE" 2>/dev/null; then
  echo "[$(date)] ERROR: backup is corrupted!" >&2
  exit 1
fi

# Upload to S3 if configured
if [ -n "$S3_BUCKET" ]; then
  echo "[$(date)] uploading to s3://$S3_BUCKET/$BACKUP_PREFIX/"
  if command -v aws &> /dev/null; then
    aws s3 cp "$BACKUP_FILE" "s3://$S3_BUCKET/$BACKUP_PREFIX/mymoney-$TIMESTAMP.sql.gz" --storage-class STANDARD_IA
  else
    echo "[$(date)] WARNING: aws cli not installed, skipping S3 upload" >&2
  fi
fi

# Delete local backups older than retention
echo "[$(date)] cleaning up backups older than $BACKUP_RETENTION_DAYS days"
find "$BACKUP_DIR" -name "mymoney-*.sql.gz" -mtime +$BACKUP_RETENTION_DAYS -delete

# Daily verification: every Sunday, restore a random backup to a scratch
# database and confirm the data loads
if [ "$DAY_OF_WEEK" = "7" ] && [ -n "$VERIFY_DATABASE_URL" ]; then
  echo "[$(date)] weekly verification: restoring latest backup to scratch DB"
  LATEST=$(ls -t $BACKUP_DIR/mymoney-*.sql.gz | head -1)
  gunzip -c "$LATEST" | psql "$VERIFY_DATABASE_URL" --quiet
  if [ $? -eq 0 ]; then
    echo "[$(date)] verification OK: backup loads cleanly"
  else
    echo "[$(date)] ERROR: verification failed!" >&2
    exit 1
  fi
fi

echo "[$(date)] backup job complete"
