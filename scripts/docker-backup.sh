#!/usr/bin/env bash
set -euo pipefail

# ─── Docker PostgreSQL Backup Script ──────────────────────────────────────
# Creates a compressed dump and uploads to S3-compatible storage.
# Keeps last 30 backups, deletes older ones.
# Can be run via cron: 0 3 * * * /path/to/scripts/docker-backup.sh

BACKUP_DIR="${BACKUP_DIR:-./backups}"
S3_BUCKET="${S3_BUCKET:-s3://mymoney-backups}"
S3_ENDPOINT="${S3_ENDPOINT:-}"
PG_CONTAINER="${PG_CONTAINER:-mymoney_postgres}"
RETENTION_DAYS="${RETENTION_DAYS:-30}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/mymoney_${TIMESTAMP}.sql.gz"

# Ensure backup directory exists
mkdir -p "${BACKUP_DIR}"

echo "[$(date)] Starting PostgreSQL backup..."

# Dump PostgreSQL and compress
docker exec "${PG_CONTAINER}" pg_dumpall -U mymoney | gzip > "${BACKUP_FILE}"

if [ $? -ne 0 ]; then
  echo "[ERROR] Backup failed"
  exit 1
fi

echo "[$(date)] Backup created: ${BACKUP_FILE} ($(du -h "${BACKUP_FILE}" | cut -f1))"

# Upload to S3-compatible storage
S3_CMD="aws s3"
if [ -n "${S3_ENDPOINT}" ]; then
  S3_CMD="${S3_CMD} --endpoint-url ${S3_ENDPOINT}"
fi

echo "[$(date)] Uploading to S3..."
${S3_CMD} cp "${BACKUP_FILE}" "${S3_BUCKET}/" 2>&1 || {
  echo "[WARN] S3 upload failed; backup kept locally at ${BACKUP_FILE}"
}

# Cleanup old backups (local)
find "${BACKUP_DIR}" -name "mymoney_*.sql.gz" -mtime +${RETENTION_DAYS} -delete
echo "[$(date)] Cleaned up local backups older than ${RETENTION_DAYS} days"

# Cleanup old backups (remote)
if command -v aws &>/dev/null; then
  echo "[$(date)] Cleaning up remote backups older than ${RETENTION_DAYS} days..."
  ${S3_CMD} ls "${S3_BUCKET}/" | while read -r line; do
    file_date=$(echo "${line}" | awk '{print $1" "$2}')
    file_name=$(echo "${line}" | awk '{print $4}')
    if [ -n "${file_date}" ] && [ -n "${file_name}" ]; then
      file_ts=$(date -d "${file_date}" +%s 2>/dev/null)
      cutoff_ts=$(date -d "-${RETENTION_DAYS} days" +%s)
      if [ -n "${file_ts}" ] && [ "${file_ts}" -lt "${cutoff_ts}" ]; then
        ${S3_CMD} rm "${S3_BUCKET}/${file_name}"
        echo "  Deleted: ${file_name}"
      fi
    fi
  done
fi

echo "[$(date)] Backup completed successfully"
