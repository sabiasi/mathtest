-- =====================================================================
-- MathTest database setup.
-- Paste ALL of this into Supabase → SQL Editor → "New query" → Run.
-- Then do the same with supabase/plans.sql (the plans' limits).
-- Running them twice is safe (they skip what already exists).
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

-- (The "upload" rule is in section 5: it also checks the plan's picture space.)

drop policy if exists "Teachers replace their own pictures" on storage.objects;
create policy "Teachers replace their own pictures" on storage.objects
  for update to authenticated
  using (bucket_id = 'images' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'images' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists "Teachers delete their own pictures" on storage.objects;
create policy "Teachers delete their own pictures" on storage.objects
  for delete to authenticated
  using (bucket_id = 'images' and (storage.foldername(name))[1] = (select auth.uid())::text);

-- ---------------------------------------------------------------------
-- 4. Plans: Free / Premium / School  (the app's side: src/lib/plans/)
--    The numbers come from supabase/plans.sql, which is GENERATED from
--    src/lib/plans/plans.ts — change them there, not here.
-- ---------------------------------------------------------------------
create table if not exists public.plan_limits (
  plan text primary key check (plan in ('free', 'premium', 'school')),
  max_variants int not null check (max_variants between 1 and 6),
  ai_per_month int not null check (ai_per_month >= 0),
  image_storage_mb int not null check (image_storage_mb >= 0),
  templates int,                                 -- null = all templates
  features text[] not null default '{}',
  updated_at timestamptz not null default now()
);

-- Exactly one row: the trial and the grace period after a failed payment.
create table if not exists public.plan_settings (
  id int primary key default 1 check (id = 1),
  trial_plan text not null default 'premium' check (trial_plan in ('free', 'premium', 'school')),
  trial_days int not null default 14 check (trial_days between 0 and 365),
  grace_days int not null default 7 check (grace_days between 0 and 60)
);
insert into public.plan_settings (id) values (1) on conflict (id) do nothing;

alter table public.plan_limits enable row level security;
alter table public.plan_settings enable row level security;
drop policy if exists "Everyone reads the plan limits" on public.plan_limits;
create policy "Everyone reads the plan limits" on public.plan_limits for select to anon, authenticated using (true);
drop policy if exists "Everyone reads the plan settings" on public.plan_settings;
create policy "Everyone reads the plan settings" on public.plan_settings for select to anon, authenticated using (true);
revoke all on public.plan_limits, public.plan_settings from anon, authenticated;
grant select on public.plan_limits, public.plan_settings to anon, authenticated;

-- One row per account: which plan, trial end, renewal date…
create table if not exists public.subscriptions (
  user_id uuid primary key references auth.users (id) on delete cascade,
  plan text not null default 'free' check (plan in ('free', 'premium', 'school')),
  status text not null default 'expired' check (status in ('trialing', 'active', 'past_due', 'canceled', 'expired')),
  billing_period text check (billing_period in ('month', 'year', 'schoolYear')),
  trial_ends_at timestamptz,
  current_period_start timestamptz,
  current_period_end timestamptz,                -- null = no end (gift, invoice)
  grace_ends_at timestamptz,                     -- set after a failed renewal payment
  cancel_at_period_end boolean not null default false,
  provider text check (char_length(provider) <= 40),
  provider_customer_id text check (char_length(provider_customer_id) <= 200),
  provider_subscription_id text check (char_length(provider_subscription_id) <= 200),
  note text not null default '' check (char_length(note) <= 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.subscriptions enable row level security;

drop policy if exists "Teachers read their own subscription" on public.subscriptions;
create policy "Teachers read their own subscription" on public.subscriptions
  for select to authenticated using ((select auth.uid()) = user_id);

-- Teachers may only READ their plan. Nobody can change it from the browser:
-- only the database's own functions (the trial below; later, verified
-- payment messages and the founders' admin page) write this table.
revoke all on public.subscriptions from anon, authenticated;
grant select on public.subscriptions to authenticated;

-- Every new account starts with a free trial (no card needed).
create or replace function public.start_trial()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  settings public.plan_settings;
begin
  select * into settings from public.plan_settings where id = 1;
  insert into public.subscriptions (user_id, plan, status, trial_ends_at)
  values (new.id, coalesce(settings.trial_plan, 'premium'), 'trialing', now() + make_interval(days => coalesce(settings.trial_days, 14)))
  on conflict (user_id) do nothing;
  return new;
exception when others then
  -- A problem here must never stop someone from signing up.
  raise warning 'start_trial failed: %', sqlerrm;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_trial on auth.users;
create trigger on_auth_user_created_trial
  after insert on auth.users
  for each row execute function public.start_trial();

-- Accounts made before plans existed get the same trial, starting now.
-- (Only once: accounts that already have a row are left alone.)
insert into public.subscriptions (user_id, plan, status, trial_ends_at)
select u.id, s.trial_plan, 'trialing', now() + make_interval(days => s.trial_days)
from auth.users u cross join public.plan_settings s
where s.id = 1
on conflict (user_id) do nothing;

-- The plan that applies NOW. The same rules as src/lib/plans/entitlements.ts
-- (change both together). Internal: only other database functions call it.
create or replace function public.plan_of(uid uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((
    select case
      when s.status = 'trialing' then case when s.trial_ends_at > now() then ps.trial_plan else 'free' end
      when s.plan = 'free' or s.status = 'expired' then 'free'
      when s.status = 'canceled' or s.cancel_at_period_end then
        case when s.current_period_end is null or s.current_period_end > now() then s.plan else 'free' end
      when s.current_period_end is null then s.plan
      when s.status = 'active' and s.current_period_end > now() then s.plan
      when now() < coalesce(s.grace_ends_at, s.current_period_end + make_interval(days => ps.grace_days)) then s.plan
      else 'free'
    end
    from public.subscriptions s cross join public.plan_settings ps
    where s.user_id = uid and ps.id = 1
  ), 'free');
$$;
revoke execute on function public.plan_of(uuid) from public, anon, authenticated;

-- "Which plan am I on?" for the signed-in teacher.
create or replace function public.my_plan()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select public.plan_of((select auth.uid()));
$$;
revoke execute on function public.my_plan() from public, anon;
grant execute on function public.my_plan() to authenticated;

-- ---------------------------------------------------------------------
-- 5. Picture space: each plan has a limit (plan_limits.image_storage_mb).
--    The database refuses uploads once a teacher's folder is full.
--    Pictures already saved are never removed.
-- ---------------------------------------------------------------------
create or replace function public.image_storage_used(uid uuid)
returns bigint
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(sum((o.metadata ->> 'size')::bigint), 0)::bigint
  from storage.objects o
  where o.bucket_id = 'images' and o.name like uid::text || '/%';
$$;

create or replace function public.image_storage_limit(uid uuid)
returns bigint
language sql
stable
security definer
set search_path = ''
as $$
  -- 50 MB if plans.sql hasn't been pasted yet.
  select coalesce((select l.image_storage_mb from public.plan_limits l where l.plan = public.plan_of(uid)), 50)::bigint * 1024 * 1024;
$$;
revoke execute on function public.image_storage_used(uuid) from public, anon, authenticated;
revoke execute on function public.image_storage_limit(uuid) from public, anon, authenticated;

-- For the settings page: { "used": bytes, "limit": bytes }.
create or replace function public.my_image_storage()
returns json
language sql
stable
security definer
set search_path = ''
as $$
  select json_build_object(
    'used', public.image_storage_used((select auth.uid())),
    'limit', public.image_storage_limit((select auth.uid()))
  );
$$;

create or replace function public.image_upload_allowed()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.image_storage_used((select auth.uid())) < public.image_storage_limit((select auth.uid()));
$$;
revoke execute on function public.my_image_storage() from public, anon;
revoke execute on function public.image_upload_allowed() from public, anon;
grant execute on function public.my_image_storage() to authenticated;
grant execute on function public.image_upload_allowed() to authenticated;

drop policy if exists "Teachers upload their own pictures" on storage.objects;
create policy "Teachers upload their own pictures" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'images'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and public.image_upload_allowed()
  );

-- ---------------------------------------------------------------------
-- 6. School plan requests (the form on /pricing)
--    Anyone may SEND a request; nobody can read them from the website.
--    The founders see them in Supabase → Table Editor (later: /admin).
-- ---------------------------------------------------------------------
create table if not exists public.school_requests (
  id bigint generated always as identity primary key,
  user_id uuid default auth.uid() references auth.users (id) on delete set null,
  contact_name text not null check (char_length(contact_name) between 1 and 200),
  school_name text not null check (char_length(school_name) between 1 and 300),
  city text not null default '' check (char_length(city) <= 100),
  teachers int check (teachers between 1 and 10000),
  email text not null check (char_length(email) between 3 and 320),
  phone text not null default '' check (char_length(phone) <= 40),
  message text not null default '' check (char_length(message) <= 3000),
  language text not null default 'ka' check (language in ('ka', 'en')),
  status text not null default 'new' check (status in ('new', 'contacted', 'won', 'lost')),
  created_at timestamptz not null default now()
);

alter table public.school_requests enable row level security;

drop policy if exists "Anyone sends a school request" on public.school_requests;
create policy "Anyone sends a school request" on public.school_requests
  for insert to anon, authenticated
  with check (status = 'new' and user_id is not distinct from (select auth.uid()));

revoke all on public.school_requests from anon, authenticated;
grant insert on public.school_requests to anon, authenticated;
