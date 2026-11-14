-- Photos of the original recipe cards ("source images").
--
-- Each image is stored three times in a private bucket, at unguessable paths:
--   recipes/<recipe id>/<image id>/original.jpg  full resolution, for preserving
--   recipes/<recipe id>/<image id>/display.jpg   ~1600px, for the recipe page
--   recipes/<recipe id>/<image id>/thumb.jpg     ~400px, for cards and lists
-- The app only ever shows them through short-lived signed URLs.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('recipe-images', 'recipe-images', false, 20971520, array['image/jpeg']);

create policy "Family members can read recipe images"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'recipe-images'
    and (select public.current_app_role()) is not null
  );

create policy "Admins can upload recipe images"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'recipe-images'
    and (select public.current_app_role()) = 'admin'
  );

create policy "Admins can delete recipe images"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'recipe-images'
    and (select public.current_app_role()) = 'admin'
  );

create table public.images (
  id uuid primary key,
  original_path text not null unique,
  display_path text not null unique,
  thumb_path text not null unique,
  width integer not null check (width > 0),
  height integer not null check (height > 0),
  created_by uuid not null default auth.uid() references public.profiles (id),
  created_at timestamptz not null default now()
);

create table public.recipe_source_images (
  recipe_id uuid not null references public.recipes (id) on delete cascade,
  image_id uuid not null unique references public.images (id) on delete cascade,
  caption text check (length(caption) <= 500),
  sort_order integer not null,
  primary key (recipe_id, image_id)
);

create index recipe_source_images_order_idx
  on public.recipe_source_images (recipe_id, sort_order);

alter table public.images enable row level security;
alter table public.recipe_source_images enable row level security;

create policy "Family members can read images"
  on public.images for select
  to authenticated
  using ((select public.current_app_role()) is not null);

create policy "Admins can add images"
  on public.images for insert
  to authenticated
  with check (
    (select public.current_app_role()) = 'admin'
    and created_by = (select auth.uid())
  );

create policy "Family members can read recipe source images"
  on public.recipe_source_images for select
  to authenticated
  using ((select public.current_app_role()) is not null);

create policy "Admins can add recipe source images"
  on public.recipe_source_images for insert
  to authenticated
  with check ((select public.current_app_role()) = 'admin');

-- Where an image's files live. One definition, used by the app and by
-- attach_source_image, so paths can't drift apart.
create function public.recipe_image_path(recipe_id uuid, image_id uuid, variant text)
returns text
language sql
immutable
set search_path = ''
as $$
  select 'recipes/' || recipe_id || '/' || image_id || '/' || variant || '.jpg';
$$;

-- Records an uploaded image against a recipe, in one transaction, and only
-- once all three files are in storage. Until this succeeds, nothing about the
-- image appears in the app. Runs as the caller, so row-level security applies.
create function public.attach_source_image(
  p_recipe_id uuid,
  p_image_id uuid,
  p_width integer,
  p_height integer
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  paths text[] := array[
    public.recipe_image_path(p_recipe_id, p_image_id, 'original'),
    public.recipe_image_path(p_recipe_id, p_image_id, 'display'),
    public.recipe_image_path(p_recipe_id, p_image_id, 'thumb')
  ];
  uploaded integer;
begin
  select count(*) into uploaded
  from storage.objects
  where bucket_id = 'recipe-images' and name = any (paths);

  if uploaded <> 3 then
    raise exception 'Image % is not fully uploaded (% of 3 files)', p_image_id, uploaded
      using errcode = 'P0002';
  end if;

  insert into public.images (id, original_path, display_path, thumb_path, width, height)
  values (p_image_id, paths[1], paths[2], paths[3], p_width, p_height);

  insert into public.recipe_source_images (recipe_id, image_id, sort_order)
  values (
    p_recipe_id,
    p_image_id,
    coalesce(
      (select max(sort_order) + 1 from public.recipe_source_images where recipe_id = p_recipe_id),
      0
    )
  );
end;
$$;

revoke execute on function public.attach_source_image(uuid, uuid, integer, integer) from anon, public;
grant execute on function public.attach_source_image(uuid, uuid, integer, integer) to authenticated;
