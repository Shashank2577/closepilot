#!/usr/bin/env bash
set -euo pipefail

if [ -z "${DATABASE_URL:-}" ]; then
  echo "Error: DATABASE_URL environment variable is required."
  exit 1
fi

if [ $# -eq 0 ]; then
  echo "Usage: $0 <backup-file.sql.gz> [--force]"
  exit 1
fi

BACKUP_FILE=$1
FORCE=0

if [ "${2:-}" == "--force" ]; then
  FORCE=1
fi

if [ ! -f "$BACKUP_FILE" ]; then
  echo "Error: Backup file '$BACKUP_FILE' not found."
  exit 1
fi

if [ -t 0 ] && [ $FORCE -eq 0 ]; then
  read -p "Type RESTORE to proceed with restoring the database: " confirmation
  if [ "$confirmation" != "RESTORE" ]; then
    echo "Restore aborted."
    exit 0
  fi
elif [ ! -t 0 ] && [ $FORCE -eq 0 ]; then
  echo "Error: Non-TTY environment requires --force flag to proceed."
  exit 1
fi

echo "Starting database restore from $BACKUP_FILE..."
gunzip -c "$BACKUP_FILE" | psql "$DATABASE_URL"

echo "Restore completed."
exit 0
