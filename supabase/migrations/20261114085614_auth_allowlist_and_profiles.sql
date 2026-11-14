-- Sign-in is limited to an email allowlist. Every signed-in user has a profile
-- holding their role, copied from the allowlist when their account is created.

create type public.app_role as enum ('admin', 'contributor', 'reader');

-- Emails allowed to sign in. Managed with SQL for now, e.g.
--   insert into public.allowed_emails (email, role) values ('me@example.com', 'admin');
create table public.allowed_emails (
  email extensions.citext primary key,
  role public.app_role not null default 'reader',
  invited_at timestamptz not null default now()
);

alter table public.allowed_emails enable row level security;
-- No policies: the app's users can't read or change the allowlist directly.

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email extensions.citext not null unique,
  name text,
  role public.app_role not null default 'reader',
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Users can read their own profile"
  on public.profiles for select
  to authenticated
  using (id = (select auth.uid()));

-- Auth hook: runs before Supabase Auth creates a user, and rejects any email
-- that is not on the allowlist. This is what stops public sign-up.
create function public.hook_before_user_created(event jsonb)
returns jsonb
language plpgsql
stable
set search_path = ''
as $$
declare
  user_email text := event -> 'user' ->> 'email';
begin
  if user_email is not null and exists (
    select 1 from public.allowed_emails where email = user_email::extensions.citext
  ) then
    return '{}'::jsonb;
  end if;

  return jsonb_build_object(
    'error', jsonb_build_object(
      'http_code', 403,
      'message', 'This email is not on the family list.'
    )
  );
end;
$$;

grant usage on schema public to supabase_auth_admin;
grant usage on schema extensions to supabase_auth_admin; -- for the citext type
grant execute on function public.hook_before_user_created(jsonb) to supabase_auth_admin;
revoke execute on function public.hook_before_user_created(jsonb) from authenticated, anon, public;
grant select on public.allowed_emails to supabase_auth_admin;

create policy "Auth can read the allowlist"
  on public.allowed_emails for select
  to supabase_auth_admin
  using (true);

-- Create a profile for every new auth user, with the role from the allowlist.
-- Also a second line of defence: if the hook is ever switched off, a user who
-- isn't on the allowlist still can't be created.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  allowed_role public.app_role;
begin
  select role into allowed_role
  from public.allowed_emails
  where email = new.email::extensions.citext;

  if allowed_role is null then
    raise exception 'Email is not on the allowlist' using errcode = 'P0001';
  end if;

  insert into public.profiles (id, email, role)
  values (new.id, new.email, allowed_role);
  return new;
end;
$$;

revoke execute on function public.handle_new_user() from authenticated, anon, public;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
