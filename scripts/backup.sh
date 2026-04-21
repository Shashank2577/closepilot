#!/usr/bin/env bash
set -euo pipefail

if [ -z "${DATABASE_URL:-}" ]; then
  echo "Error: DATABASE_URL environment variable is required."
  exit 1
fi

TIMESTAMP=$(date -u +%Y%m%dT%H%M%SZ)
BACKUP_FILE="backup-${TIMESTAMP}.sql.gz"

echo "Starting database backup..."
pg_dump "$DATABASE_URL" | gzip > "$BACKUP_FILE"

if [ -f "$BACKUP_FILE" ] && [ -s "$BACKUP_FILE" ]; then
  echo "Backup successfully created: $BACKUP_FILE"
  exit 0
else
  echo "Error: Backup failed."
  exit 1
fi
