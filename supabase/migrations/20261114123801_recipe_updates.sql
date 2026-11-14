-- Editing recipes: only admins may change them, and updated_at always
-- reflects the last change.

create policy "Admins can edit recipes"
  on public.recipes for update
  to authenticated
  using ((select public.current_app_role()) = 'admin')
  with check ((select public.current_app_role()) = 'admin');

create function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger recipes_set_updated_at
  before update on public.recipes
  for each row execute function public.set_updated_at();

-- Only the recipe's content can be changed through the API, never who
-- created it, when, or its id. (updated_at is set by the trigger above.)
revoke update on public.recipes from authenticated, anon;
grant update (title, status, ingredients, method, notes, story)
  on public.recipes to authenticated;
