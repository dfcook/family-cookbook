#!/usr/bin/env bash
# Deletes old nightly database backups: keeps the last 30 days and the first
# backup of every month. Images are never pruned (see backup.sh).
#
# Environment: BACKUP_DEST, and optionally RCLONE (see backup.sh).
set -euo pipefail

: "${BACKUP_DEST:?Set BACKUP_DEST, e.g. r2:family-cookbook-backups}"
read -r -a RCLONE <<<"${RCLONE:-rclone}"
today=$(date -u +%F)

to_delete=$("${RCLONE[@]}" lsf --dirs-only "$BACKUP_DEST/db" |
  node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON scripts/backup/retention.ts "$today")

if [[ -z "$to_delete" ]]; then
  echo "==> Nothing to prune"
  exit 0
fi

while read -r folder; do
  echo "==> Deleting old backup db/$folder"
  "${RCLONE[@]}" purge "$BACKUP_DEST/db/$folder"
done <<<"$to_delete"
