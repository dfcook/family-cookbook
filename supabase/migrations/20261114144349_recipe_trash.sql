-- The trash: deleting a recipe only stamps deleted_at. Nothing is removed
-- from the database or storage until it's purged from the trash (#11).
--
-- Readers can't see a deleted recipe at all: not the recipe, not its photo
-- links, not the photo files. Admins still can, for the trash page, so the
-- app filters deleted recipes out of its admin views itself.

alter table public.recipes add column deleted_at timestamptz;

create index recipes_deleted_at_idx on public.recipes (deleted_at)
  where deleted_at is not null;

grant update (deleted_at) on public.recipes to authenticated;

-- Recipes: admins see everything, other family members only what's not
-- in the trash.
drop policy "Family members can read recipes" on public.recipes;
create policy "Family members can read recipes"
  on public.recipes for select
  to authenticated
  using (
    (select public.current_app_role()) = 'admin'
    or ((select public.current_app_role()) is not null and deleted_at is null)
  );

-- Photo links follow their recipe: the subquery runs under the recipes
-- policy above, so a deleted recipe's links disappear with it.
drop policy "Family members can read recipe source images" on public.recipe_source_images;
create policy "Family members can read recipe source images"
  on public.recipe_source_images for select
  to authenticated
  using (
    exists (select 1 from public.recipes r where r.id = recipe_id)
  );

drop policy "Family members can read images" on public.images;
create policy "Family members can read images"
  on public.images for select
  to authenticated
  using (
    (select public.current_app_role()) = 'admin'
    or exists (
      select 1 from public.recipe_source_images rsi where rsi.image_id = images.id
    )
  );

-- Files live at recipes/<recipe id>/..., so a reader can only read (or get
-- a signed link to) files of a recipe they can see.
create function public.try_uuid(value text)
returns uuid
language sql
immutable
set search_path = ''
as $$
  select case
    when value ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    then value::uuid
  end;
$$;

drop policy "Family members can read recipe images" on storage.objects;
create policy "Family members can read recipe images"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'recipe-images'
    and (
      (select public.current_app_role()) = 'admin'
      or exists (
        select 1 from public.recipes r
        where r.id = public.try_uuid((storage.foldername(name))[2])
      )
    )
  );

-- Moving a recipe to the trash and back isn't an edit: keep updated_at as
-- it was, so a restored recipe is exactly as it was.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if (to_jsonb(new) - 'deleted_at' - 'updated_at')
     is distinct from (to_jsonb(old) - 'deleted_at' - 'updated_at') then
    new.updated_at := now();
  else
    new.updated_at := old.updated_at;
  end if;
  return new;
end;
$$;
