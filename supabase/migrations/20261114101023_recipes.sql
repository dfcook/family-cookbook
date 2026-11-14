-- Recipes, and the role check used by row-level security.

-- The signed-in user's role, or null if they have no profile.
-- security definer so policies can read profiles without granting wider access.
create function public.current_app_role()
returns public.app_role
language sql
stable
security definer
set search_path = ''
as $$
  select role from public.profiles where id = (select auth.uid());
$$;

revoke execute on function public.current_app_role() from anon, public;
grant execute on function public.current_app_role() to authenticated;

create type public.recipe_status as enum ('needs_transcribing', 'complete');

-- Ingredients and method are ordered lists of {type: 'heading' | 'item', text}.
create function public.is_recipe_lines(lines jsonb)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select jsonb_typeof(lines) = 'array'
    and not exists (
      select 1
      from jsonb_array_elements(lines) as line
      where jsonb_typeof(line) <> 'object'
        or line ->> 'type' not in ('heading', 'item')
        or jsonb_typeof(line -> 'text') <> 'string'
        or length(btrim(line ->> 'text')) = 0
    );
$$;

create table public.recipes (
  id uuid primary key default gen_random_uuid(),
  title text not null check (length(btrim(title)) between 1 and 200),
  status public.recipe_status not null default 'complete',
  ingredients jsonb not null default '[]' check (public.is_recipe_lines(ingredients)),
  method jsonb not null default '[]' check (public.is_recipe_lines(method)),
  notes text check (length(notes) <= 20000),
  story text check (length(story) <= 20000),
  created_by uuid not null default auth.uid() references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index recipes_title_idx on public.recipes (lower(title));

alter table public.recipes enable row level security;

create policy "Family members can read recipes"
  on public.recipes for select
  to authenticated
  using ((select public.current_app_role()) is not null);

create policy "Admins can add recipes"
  on public.recipes for insert
  to authenticated
  with check (
    (select public.current_app_role()) = 'admin'
    and created_by = (select auth.uid())
  );
