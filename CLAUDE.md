# Family Cookbook

Private family recipe archive (Next.js + Supabase). Product spec: `family-cookbook-prd.md`.

@AGENTS.md

## Commands

- `pnpm lint` (Biome lint + format check), `pnpm format` (Biome fixes and formats), `pnpm typecheck`, `pnpm test` (Vitest), `pnpm test:e2e` (Playwright)
- Run `pnpm format` before committing; CI fails on unformatted code. Unsorted Tailwind classes are fixed by `pnpm format:classes`
- `pnpm db:start` / `pnpm db:reset` for local Supabase (needs Docker); `pnpm db:migration <name>` for schema changes
- Schema changes are always Supabase migrations

## Agent skills

### Issue tracker

Issues live in GitHub Issues for `dfcook/family-cookbook`, managed with the `gh` CLI. See `docs/agents/issue-tracker.md`.

### Triage labels

Default labels: `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: `GLOSSARY.md` and `docs/adr/` at the repo root. See `docs/agents/domain.md`.
