#!/usr/bin/env bash
# Nightly backup of the Family Cookbook: database and every stored image.
#
# Writes to $BACKUP_DEST (an rclone destination, e.g. "r2:family-cookbook-backups"):
#   db/<YYYY-MM-DD>/roles.sql.gz     database roles
#   db/<YYYY-MM-DD>/schema.sql.gz    app schema (also rebuilt by migrations)
#   db/<YYYY-MM-DD>/data.sql.gz      all data: accounts, recipes, image records
#   db/<YYYY-MM-DD>/manifest.json    what was backed up, and from which commit
#   images/recipe-images/...         every image file, all three versions
#
# Images are only ever added to the backup, never removed, and each upload
# gets a new random path, so one copy serves every nightly database backup.
# Old database backups are pruned by prune.sh.
#
# Needs: supabase CLI (via pnpm), rclone, gzip, jq.
# Environment:
#   SUPABASE_DB_URL  Postgres connection string (the session pooler URL)
#   BACKUP_SOURCE    rclone path to the images bucket, e.g. "supabase:recipe-images"
#   BACKUP_DEST      rclone path to the backup bucket, e.g. "r2:family-cookbook-backups"
#   RCLONE           optional rclone command (default "rclone")
set -euo pipefail

: "${SUPABASE_DB_URL:?Set SUPABASE_DB_URL}"
: "${BACKUP_SOURCE:?Set BACKUP_SOURCE, e.g. supabase:recipe-images}"
: "${BACKUP_DEST:?Set BACKUP_DEST, e.g. r2:family-cookbook-backups}"
read -r -a RCLONE <<<"${RCLONE:-rclone}"

day=$(date -u +%F)
work=$(mktemp -d)
trap 'rm -rf "$work"' EXIT

echo "==> Dumping the database ($day)"
pnpm exec supabase db dump --db-url "$SUPABASE_DB_URL" --role-only -f "$work/roles.sql"
pnpm exec supabase db dump --db-url "$SUPABASE_DB_URL" -f "$work/schema.sql"
pnpm exec supabase db dump --db-url "$SUPABASE_DB_URL" --data-only --use-copy -f "$work/data.sql"

for file in roles schema data; do
  if [[ ! -s "$work/$file.sql" ]]; then
    echo "Database dump $file.sql is empty" >&2
    exit 1
  fi
done
recipe_rows=$(awk '/^COPY "public"."recipes"/{on=1;next} on&&/^\\\./{on=0} on' "$work/data.sql" | wc -l)

echo "==> Copying images"
"${RCLONE[@]}" copy "$BACKUP_SOURCE" "$BACKUP_DEST/images/recipe-images" --stats-one-line --stats 30s
image_stats=$("${RCLONE[@]}" size "$BACKUP_SOURCE" --json)

echo "==> Writing the manifest"
jq -n \
  --arg created_at "$(date -u +%FT%TZ)" \
  --arg commit "${GITHUB_SHA:-$(git rev-parse HEAD 2>/dev/null || echo unknown)}" \
  --arg latest_migration "$(ls supabase/migrations | tail -n 1)" \
  --argjson recipes "$recipe_rows" \
  --argjson images "$image_stats" \
  '{created_at: $created_at, commit: $commit, latest_migration: $latest_migration,
    recipes: $recipes, image_files: $images.count, image_bytes: $images.bytes}' \
  >"$work/manifest.json"
cat "$work/manifest.json"

gzip -9 "$work"/*.sql
"${RCLONE[@]}" copy "$work" "$BACKUP_DEST/db/$day"

# Check the four files arrived.
uploaded=$("${RCLONE[@]}" lsf "$BACKUP_DEST/db/$day" | wc -l)
if [[ "$uploaded" -ne 4 ]]; then
  echo "Expected 4 files in db/$day, found $uploaded" >&2
  exit 1
fi
echo "==> Backup $day complete"
