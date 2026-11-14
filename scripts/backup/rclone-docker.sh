#!/usr/bin/env bash
# Runs rclone in Docker, for machines without rclone installed:
#   RCLONE="scripts/backup/rclone-docker.sh" scripts/backup/restore-local.sh ...
# Passes through RCLONE_* settings and mounts the current folder and /tmp.
set -euo pipefail

env_args=()
while IFS='=' read -r name _; do
  env_args+=(-e "$name")
done < <(env | grep '^RCLONE_' || true)

exec docker run --rm --network host \
  -u "$(id -u):$(id -g)" \
  -v "$PWD:$PWD" -v /tmp:/tmp -w "$PWD" \
  "${env_args[@]}" \
  rclone/rclone:1.69.1 "$@"
