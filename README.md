# Family Cookbook

A private home for a family's handed-down recipes: the typed-up recipe, a photo of the original handwritten card, and the story behind it.

Built with Next.js (App Router), TypeScript, Tailwind CSS and Supabase. Product spec: [family-cookbook-prd.md](family-cookbook-prd.md).

> Work in progress. A full portfolio README with screenshots and an architecture overview comes later.

## Local development

You need Node 24+, pnpm and Docker (running) for the local Supabase stack.

```sh
pnpm install
pnpm db:start            # starts local Supabase, applies migrations and seed; prints URLs and keys
cp .env.example .env.local   # fill in the values printed by db:start
pnpm dev                 # http://127.0.0.1:3000
```

Local Supabase Studio and the test email inbox are at the URLs printed by `pnpm db:start`. Stop the stack with `pnpm db:stop`.

## Database changes

Schema changes are always migrations, never edits made in a dashboard.

```sh
pnpm db:migration <name>   # creates supabase/migrations/<timestamp>_<name>.sql
pnpm db:reset              # rebuilds the local database from migrations + seed
```

Migrations merged to `main` are applied to the hosted project by the **Deploy database migrations** workflow.

## Tests

```sh
pnpm lint
pnpm typecheck
pnpm test        # Vitest unit tests
pnpm test:e2e    # Playwright, desktop and phone viewports (starts the dev server)
```

CI runs all of these on every push and pull request, with Playwright running against a production build and a local Supabase stack.

## Deployment

- **App:** Vercel, connected to this GitHub repo. `main` deploys to production; every pull request gets a preview deployment.
- **Database, auth and storage:** a hosted Supabase project.

### One-time setup

1. **Supabase:** create a project. Note its project ref, database password and API URL and publishable key.
2. **Vercel:** import this repo, then add environment variables for Production and Preview:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
3. **GitHub** (Settings → Secrets and variables → Actions):
   - Variable `SUPABASE_PROJECT_REF`
   - Secret `SUPABASE_ACCESS_TOKEN` (a Supabase personal access token)
   - Secret `SUPABASE_DB_PASSWORD`
4. Run the **Deploy database migrations** workflow once by hand to bring the hosted database up to date.
