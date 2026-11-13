-- =====================================================================
-- MathTest database setup.
-- Paste ALL of this into Supabase → SQL Editor → "New query" → Run.
-- Running it twice is safe (it skips what already exists).
--
-- Privacy: "Row Level Security" (RLS) is switched on for every table.
-- With RLS, the database itself checks each request: a teacher can only
-- read or change rows whose owner is their own user id (auth.uid()).
-- Even someone who tinkers with the website's code can't read other
-- teachers' tests.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Profiles: one row per teacher (name, school, preferences)
-- ---------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null default '' check (char_length(full_name) <= 200),
  school_name text not null default '' check (char_length(school_name) <= 200),
  default_subject text not null default '' check (char_length(default_subject) <= 100),
  language text not null default 'ka' check (language in ('ka', 'en')),
  theme text not null default 'system' check (theme in ('light', 'dark', 'system')),
  sample_added boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "Teachers read their own profile" on public.profiles;
create policy "Teachers read their own profile" on public.profiles
  for select to authenticated using ((select auth.uid()) = id);

drop policy if exists "Teachers create their own profile" on public.profiles;
create policy "Teachers create their own profile" on public.profiles
  for insert to authenticated with check ((select auth.uid()) = id);

drop policy if exists "Teachers update their own profile" on public.profiles;
create policy "Teachers update their own profile" on public.profiles
  for update to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

-- Signed-out visitors get no access at all; signed-in teachers only what RLS allows.
revoke all on public.profiles from anon;
grant select, insert, update on public.profiles to authenticated;

-- When someone signs up, create their profile automatically
-- (the name comes from the sign-up form, or from Google).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name)
  values (
    new.id,
    left(coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', ''), 200)
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------
-- 2. Tests: the whole test is stored as JSON in `data`
-- ---------------------------------------------------------------------
create table if not exists public.tests (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  id text not null check (char_length(id) between 1 and 64),
  title text not null default '' check (char_length(title) <= 500),
  data jsonb not null check (pg_column_size(data) < 2000000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);

create index if not exists tests_user_updated on public.tests (user_id, updated_at desc);

alter table public.tests enable row level security;

drop policy if exists "Teachers read their own tests" on public.tests;
create policy "Teachers read their own tests" on public.tests
  for select to authenticated using ((select auth.uid()) = user_id);

drop policy if exists "Teachers add their own tests" on public.tests;
create policy "Teachers add their own tests" on public.tests
  for insert to authenticated with check ((select auth.uid()) = user_id);

drop policy if exists "Teachers change their own tests" on public.tests;
create policy "Teachers change their own tests" on public.tests
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "Teachers delete their own tests" on public.tests;
create policy "Teachers delete their own tests" on public.tests
  for delete to authenticated using ((select auth.uid()) = user_id);

revoke all on public.tests from anon;
grant select, insert, update, delete on public.tests to authenticated;

-- ---------------------------------------------------------------------
-- 3. Pictures: a private storage "bucket"; each teacher has a folder
--    named after their user id:  images/<user id>/<picture id>
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('images', 'images', false, 5242880, array['image/png', 'image/jpeg', 'image/svg+xml'])
on conflict (id) do update
  set public = false,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Teachers read their own pictures" on storage.objects;
create policy "Teachers read their own pictures" on storage.objects
  for select to authenticated
  using (bucket_id = 'images' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists "Teachers upload their own pictures" on storage.objects;
create policy "Teachers upload their own pictures" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'images' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists "Teachers replace their own pictures" on storage.objects;
create policy "Teachers replace their own pictures" on storage.objects
  for update to authenticated
  using (bucket_id = 'images' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'images' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists "Teachers delete their own pictures" on storage.objects;
create policy "Teachers delete their own pictures" on storage.objects
  for delete to authenticated
  using (bucket_id = 'images' and (storage.foldername(name))[1] = (select auth.uid())::text);
