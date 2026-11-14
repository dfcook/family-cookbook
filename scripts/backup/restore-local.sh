#!/usr/bin/env bash
# Restores a backup into the LOCAL Supabase stack (`pnpm db:start`).
# This wipes the local database. See docs/backup-and-restore.md.
#
# Usage: scripts/backup/restore-local.sh <backup-folder> <YYYY-MM-DD> [--yes]
#   <backup-folder> holds a downloaded copy of the backup bucket:
#     <backup-folder>/db/<YYYY-MM-DD>/data.sql.gz
#     <backup-folder>/images/recipe-images/...
#
# Needs: Docker, the supabase CLI (via pnpm), jq, and rclone (or set RCLONE,
# e.g. RCLONE="scripts/backup/rclone-docker.sh").
set -euo pipefail

backup=${1:?Usage: restore-local.sh <backup-folder> <YYYY-MM-DD> [--yes]}
day=${2:?Usage: restore-local.sh <backup-folder> <YYYY-MM-DD> [--yes]}
read -r -a RCLONE <<<"${RCLONE:-rclone}"
backup=$(cd "$backup" && pwd)
data="$backup/db/$day/data.sql.gz"
images="$backup/images/recipe-images"

[[ -f "$data" ]] || { echo "Missing $data" >&2; exit 1; }
[[ -d "$images" ]] || { echo "Missing $images" >&2; exit 1; }

if [[ "${3:-}" != "--yes" ]]; then
  read -r -p "This wipes the LOCAL Supabase database and restores $day. Continue? [y/N] " answer
  [[ "$answer" == "y" || "$answer" == "Y" ]] || exit 1
fi

project=$(sed -n 's/^project_id = "\(.*\)"/\1/p' supabase/config.toml)
db_container="supabase_db_$project"
status=$(pnpm exec supabase status -o json 2>/dev/null)

echo "==> Rebuilding the local schema from migrations (no seed data)"
pnpm exec supabase db reset --no-seed

echo "==> Loading the backed-up data"
# The image files are restored through the storage API below, which creates
# their storage.objects rows, so skip those rows here. The bucket row comes
# from the backup, replacing the one the migration created. Runs as the local
# superuser, because storage's own tables belong to the storage service.
{
  echo "SET session_replication_role = replica;"
  echo "DELETE FROM storage.buckets;"
  gunzip -c "$data" | awk '
    /^COPY "storage"."(objects|s3_multipart_uploads|s3_multipart_uploads_parts)"/ { skip = 1; next }
    skip && /^\\\.$/ { skip = 0; next }
    !skip
  '
} | docker exec -i "$db_container" psql -U supabase_admin -d postgres \
  --single-transaction -v ON_ERROR_STOP=1 -q

echo "==> Uploading images to local storage"
export RCLONE_CONFIG_LOCALSTORAGE_TYPE=s3
export RCLONE_CONFIG_LOCALSTORAGE_PROVIDER=Other
export RCLONE_CONFIG_LOCALSTORAGE_ENDPOINT
RCLONE_CONFIG_LOCALSTORAGE_ENDPOINT=$(jq -r .STORAGE_S3_URL <<<"$status")
export RCLONE_CONFIG_LOCALSTORAGE_REGION
RCLONE_CONFIG_LOCALSTORAGE_REGION=$(jq -r .S3_PROTOCOL_REGION <<<"$status")
export RCLONE_CONFIG_LOCALSTORAGE_ACCESS_KEY_ID
RCLONE_CONFIG_LOCALSTORAGE_ACCESS_KEY_ID=$(jq -r .S3_PROTOCOL_ACCESS_KEY_ID <<<"$status")
export RCLONE_CONFIG_LOCALSTORAGE_SECRET_ACCESS_KEY
RCLONE_CONFIG_LOCALSTORAGE_SECRET_ACCESS_KEY=$(jq -r .S3_PROTOCOL_ACCESS_KEY_SECRET <<<"$status")
export RCLONE_CONFIG_LOCALSTORAGE_FORCE_PATH_STYLE=true
"${RCLONE[@]}" copy "$images" "localstorage:recipe-images" --stats-one-line --stats 30s

echo "==> Restored. Counts:"
docker exec "$db_container" psql -U postgres -d postgres -At -F ' ' -c "
  select 'recipes', count(*) from public.recipes
  union all select 'images', count(*) from public.images
  union all select 'image files', count(*) from storage.objects where bucket_id = 'recipe-images'
  union all select 'accounts', count(*) from auth.users"
