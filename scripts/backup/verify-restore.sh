#!/usr/bin/env bash
# After restore-local.sh: checks the local Supabase matches the backup.
#   - recipe and image-file counts match the backup's manifest.json
#   - every image file in local storage is byte-identical to the backup
#
# Usage: scripts/backup/verify-restore.sh <backup-folder> <YYYY-MM-DD>
# Prints counts only, never data, because CI logs are public.
set -euo pipefail

backup=${1:?Usage: verify-restore.sh <backup-folder> <YYYY-MM-DD>}
day=${2:?Usage: verify-restore.sh <backup-folder> <YYYY-MM-DD>}
read -r -a RCLONE <<<"${RCLONE:-rclone}"
manifest="$backup/db/$day/manifest.json"

project=$(sed -n 's/^project_id = "\(.*\)"/\1/p' supabase/config.toml)
query() {
  docker exec "supabase_db_$project" psql -U postgres -d postgres -At -c "$1"
}

expected_recipes=$(jq -r .recipes "$manifest")
expected_files=$(jq -r .image_files "$manifest")
restored_recipes=$(query "select count(*) from public.recipes")
restored_files=$(query "select count(*) from storage.objects where bucket_id = 'recipe-images'")

echo "Recipes:     backup $expected_recipes, restored $restored_recipes"
echo "Image files: backup $expected_files, restored $restored_files"
failed=0
[[ "$restored_recipes" == "$expected_recipes" ]] || { echo "Recipe count differs" >&2; failed=1; }
# Images are only ever added to the backup, so it can hold more than the
# database did that night, but never fewer.
[[ "$restored_files" -ge "$expected_files" ]] || { echo "Image files missing" >&2; failed=1; }

echo "==> Comparing every image file byte for byte"
status=$(pnpm exec supabase status -o json 2>/dev/null)
export RCLONE_CONFIG_LOCALSTORAGE_TYPE=s3 RCLONE_CONFIG_LOCALSTORAGE_PROVIDER=Other \
  RCLONE_CONFIG_LOCALSTORAGE_FORCE_PATH_STYLE=true
export RCLONE_CONFIG_LOCALSTORAGE_ENDPOINT RCLONE_CONFIG_LOCALSTORAGE_REGION \
  RCLONE_CONFIG_LOCALSTORAGE_ACCESS_KEY_ID RCLONE_CONFIG_LOCALSTORAGE_SECRET_ACCESS_KEY
RCLONE_CONFIG_LOCALSTORAGE_ENDPOINT=$(jq -r .STORAGE_S3_URL <<<"$status")
RCLONE_CONFIG_LOCALSTORAGE_REGION=$(jq -r .S3_PROTOCOL_REGION <<<"$status")
RCLONE_CONFIG_LOCALSTORAGE_ACCESS_KEY_ID=$(jq -r .S3_PROTOCOL_ACCESS_KEY_ID <<<"$status")
RCLONE_CONFIG_LOCALSTORAGE_SECRET_ACCESS_KEY=$(jq -r .S3_PROTOCOL_ACCESS_KEY_SECRET <<<"$status")
"${RCLONE[@]}" check "$backup/images/recipe-images" localstorage:recipe-images \
  --download --one-way --log-level ERROR || failed=1

if [[ "$failed" -ne 0 ]]; then
  echo "Restore check FAILED" >&2
  exit 1
fi
echo "==> Restore matches the backup"
