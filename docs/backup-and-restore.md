# Backup and restore

The family's recipes and the photos of the original cards exist nowhere else,
so the whole collection is copied off-site every night, and the restore has
been tested.

## What's backed up, and where

A GitHub Action ([`.github/workflows/backup.yml`](../.github/workflows/backup.yml))
runs every night at 02:17 UTC, and can be run by hand from the Actions tab. It
copies everything to a Cloudflare R2 bucket:

```text
db/2026-11-14/data.sql.gz       all data: sign-in accounts, the allowlist,
                                recipes, image records
db/2026-11-14/schema.sql.gz     the app's database schema
db/2026-11-14/roles.sql.gz      database role settings
db/2026-11-14/manifest.json     when, from which commit, and how many
                                recipes and image files
images/recipe-images/recipes/<recipe id>/<image id>/{original,display,thumb}.jpg
```

- **Database:** a dated folder every night. The last 30 nights are kept, plus
  the first backup of every month for good
  ([`retention.ts`](../scripts/backup/retention.ts), unit-tested).
- **Images:** one shared copy, only ever added to and never pruned. Every
  upload gets a new random path and is never changed afterwards, so the same
  files serve every database backup, and a deleted photo stays in the backup.
  This is far cheaper than a full image copy every night.
- **Keeping the project awake:** the nightly database dump counts as activity,
  so the free-tier Supabase project doesn't pause.
- **If a run fails:** the workflow run goes red and GitHub emails the
  repository owner.

The scripts are [`backup.sh`](../scripts/backup/backup.sh),
[`prune.sh`](../scripts/backup/prune.sh) and
[`restore-local.sh`](../scripts/backup/restore-local.sh).

## One-time setup

### 1. Cloudflare R2

1. In the Cloudflare dashboard, go to **R2 Object Storage** and create a bucket,
   for example `family-cookbook-backups`. Choose a location near you.
2. Under **R2 → Manage API tokens**, create an **Account API token** with
   **Object Read & Write**, limited to that one bucket. Copy the **Access Key
   ID** and **Secret Access Key**.
3. Note your **Account ID** (on the R2 overview page).

### 2. Supabase

1. **S3 access keys:** Project Settings → **Storage** → **S3 Connection**. Note
   the **Region**, then create a new access key and copy the **Access key ID**
   and **Secret access key**. They give full access to the project's storage;
   keep them only in GitHub secrets.
2. **Database connection string:** click **Connect** at the top of the
   dashboard and copy the **Session pooler** string. GitHub's runners can't
   reach the direct connection, which is IPv6 only. Put your database password
   in place of `[YOUR-PASSWORD]`.

### 3. GitHub

Settings → Secrets and variables → Actions:

| Kind     | Name                            | Value                                           |
| -------- | ------------------------------- | ----------------------------------------------- |
| Variable | `R2_BUCKET`                     | the bucket name                                 |
| Variable | `R2_ACCOUNT_ID`                 | the Cloudflare account ID                       |
| Variable | `SUPABASE_STORAGE_REGION`       | the region from S3 Connection, e.g. `eu-west-2` |
| Variable | `SUPABASE_PROJECT_REF`          | already set for migrations                      |
| Secret   | `R2_ACCESS_KEY_ID`              | from the R2 token                               |
| Secret   | `R2_SECRET_ACCESS_KEY`          | from the R2 token                               |
| Secret   | `SUPABASE_S3_ACCESS_KEY_ID`     | from Supabase S3 Connection                     |
| Secret   | `SUPABASE_S3_SECRET_ACCESS_KEY` | from Supabase S3 Connection                     |
| Secret   | `SUPABASE_DB_URL`               | the session pooler connection string            |

Then run **Actions → Nightly backup → Run workflow** once and check that it
goes green and that the files appear in the R2 bucket.

## Automatic restore check

A second workflow ([`.github/workflows/restore-check.yml`](../.github/workflows/restore-check.yml))
proves the backups really restore. It runs at 04:17 UTC on the 3rd of every
month and can be run by hand (**Actions → Restore check → Run workflow**). On a
fresh GitHub runner it:

1. downloads the latest backup from R2;
2. starts an empty local Supabase using the migrations from the backup's commit;
3. restores it with `restore-local.sh`;
4. checks the recipe and image-file counts against the backup's manifest, and
   compares every image file byte for byte (`verify-restore.sh`);
5. builds the app, signs in as a throwaway admin, checks every recipe is listed
   and opens a recipe's photo.

The data is the family's real collection and the repository's logs are public,
so the check prints counts only, keeps no traces or screenshots and uploads no
artifacts. The runner is deleted afterwards. If it fails, GitHub emails the
repository owner.

## Restoring

### Restore into a local Supabase (to check a backup, or to recover data)

You need Docker, the project's dependencies (`pnpm install`) and
[rclone](https://rclone.org). Without rclone installed, put
`RCLONE=scripts/backup/rclone-docker.sh` in front of each command to run it in
Docker instead.

1. **Download the backup.** Set up an rclone remote for R2 with the same values
   as the workflow:

   ```sh
   export RCLONE_CONFIG_R2_TYPE=s3 RCLONE_CONFIG_R2_PROVIDER=Cloudflare \
     RCLONE_CONFIG_R2_ENDPOINT=https://<account id>.r2.cloudflarestorage.com \
     RCLONE_CONFIG_R2_ACCESS_KEY_ID=... RCLONE_CONFIG_R2_SECRET_ACCESS_KEY=...
   rclone lsf r2:family-cookbook-backups/db            # pick a date
   rclone copy r2:family-cookbook-backups/db/2026-11-14 restore/db/2026-11-14
   rclone copy r2:family-cookbook-backups/images restore/images
   ```
2. **Use matching migrations.** `manifest.json` names the latest migration at
   backup time. If migrations have been added since, check out the commit in
   the manifest first.
3. **Restore.** This wipes the local database:

   ```sh
   pnpm db:start
   scripts/backup/restore-local.sh restore 2026-11-14
   ```

   The script rebuilds the schema from migrations, loads the data, uploads
   every image to local storage, and prints the counts of recipes, images,
   image files and accounts. They should match `manifest.json`.
4. **Check it in the app.** Run `pnpm dev`, sign in with your own email (the
   code arrives in the local Mailpit inbox shown by `pnpm db:start`), and open
   a few recipes with photos.

### Restore into a new hosted project (if the Supabase project is lost)

1. Create a new Supabase project and apply the migrations (`supabase link`,
   then `supabase db push --remote`).
2. Load the data with `psql`, as in step 3 of the local restore: set
   `session_replication_role = replica`, clear `storage.buckets`, and skip the
   `storage.objects` rows. Supabase's guide
   ["Backup and restore using the CLI"](https://supabase.com/docs/guides/platform/migrating-within-supabase/backup-restore)
   covers the hosted details, such as which user can write to which schema.
3. Copy the images to the new project with
   `rclone copy restore/images/recipe-images <new-project-remote>:recipe-images`.
4. Point Vercel's environment variables at the new project, and redo the
   hosted sign-in settings in the README.

## Restore tests

A backup only counts once it has been restored. The monthly restore check
repeats this automatically; record manual tests and notable runs here.

| Date       | Backup from                                             | Restored to                                                                                                                                         | Result                                                                                                                                                                                                                     |
| ---------- | ------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-11-14 | Local stack (rehearsal)                                 | Fresh local Supabase                                                                                                                                | Counts matched (289 recipes, 246 images, 741 image files, 629 accounts); all 741 files byte-identical (`rclone check --download`); a restored admin signed in and saw a recipe with its photo.                             |
| 2026-11-14 | R2: live backup of 2026-11-14 (1 recipe, 3 image files) | Fresh local Supabase on a GitHub runner, via the restore check workflow ([run](https://github.com/dfcook/family-cookbook/actions/runs/43594972106)) | Counts matched the manifest (1 recipe, 1 image, 3 image files, 1 account); all image files byte-identical; a throwaway admin signed in, saw every recipe listed and the photo loaded. Log checked: no family data printed. |
