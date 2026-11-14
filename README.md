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
pnpm dev                 # http://localhost:3000
```

Local Supabase Studio and the test email inbox (Mailpit) are at the URLs printed by `pnpm db:start`. Stop the stack with `pnpm db:stop`.

To sign in locally, add yourself to the allowlist (see below) in Studio's SQL editor, request a code on the sign-in page and read it from the Mailpit inbox.

## Who can sign in

Sign-in is by a 6-digit code sent to your email. Only emails on the allowlist can get an account:

- A Supabase Auth hook (`hook_before_user_created`) rejects any other email before an account is created.
- As a second line of defence, the database refuses to create a profile, and so the account, for an email that isn't on the list.
- The sign-in page gives the same answer whether or not an email is on the list, so it never reveals who is.

Manage the allowlist with SQL (an admin page comes later):

```sql
insert into public.allowed_emails (email, role) values ('someone@example.com', 'reader');
-- role is 'admin' (full control) or 'reader' (view only)
```

A user's role is copied from the allowlist the first time they sign in. Removing someone from the allowlist doesn't yet sign them out.

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

### Hosted sign-in settings (Supabase dashboard)

Local settings live in `supabase/config.toml`; the hosted project needs the same settings made once in the dashboard, after the auth migration has deployed:

1. **Authentication → Hooks → Before User Created:** enable it as a Postgres function, `public.hook_before_user_created`.
2. **Authentication → Emails → Templates:** for both **Magic link** and **Confirm signup**, set the subject to `Your Family Cookbook sign-in code` and the body to the contents of [supabase/templates/sign-in-code.html](supabase/templates/sign-in-code.html). The body must contain `{{ .Token }}`, which is the code.
3. **Authentication → Sign In / Providers:** keep **Allow new users to sign up** on (the hook and allowlist decide who actually can) and leave the **Email** provider enabled.
4. **Authentication → URL Configuration:** set **Site URL** to the production URL.
5. **SQL editor:** add your own email to the allowlist as `admin`.
6. **Email delivery:** Supabase's built-in email service only sends to members of the Supabase project team and is heavily rate-limited. Before inviting family, set up custom SMTP under **Authentication → Emails → SMTP settings** (for example with Resend's free tier).
