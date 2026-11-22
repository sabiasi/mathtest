-- =====================================================================
-- Rapido database setup.
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
-- NOTE: replaced at the end of this file by the "plan preview" version
-- (it adds: preview_free → Free). Change THAT one.
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

-- Teaching subjects (also available as a standalone upgrade migration).
-- Phase 1: apply after schema.sql and plans.sql. Safe to rerun; no existing work is deleted.
begin;

create table if not exists public.teacher_subjects (
  user_id uuid primary key references auth.users(id) on delete cascade,
  subjects text[] not null check (
    cardinality(subjects) between 1 and 8
    and array_position(subjects, null) is null
    and subjects <@ array['math','physics','chemistry','biology','geography','history','georgian','english']::text[]
  ),
  completed_at timestamptz not null default now()
);
alter table public.teacher_subjects enable row level security;
revoke all on public.teacher_subjects from public, anon, authenticated;
grant select on public.teacher_subjects to authenticated;
drop policy if exists "Teachers read their subject assignments" on public.teacher_subjects;
create policy "Teachers read their subject assignments" on public.teacher_subjects
  for select to authenticated using (user_id = (select auth.uid()));

-- Reuse plan_of, including trials and grace. No browser-supplied plan is trusted.
create or replace function public.has_multiple_subjects(uid uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select coalesce((select 'multipleSubjects' = any(features) from public.plan_limits
    where plan = public.plan_of(uid)), false);
$$;
revoke execute on function public.has_multiple_subjects(uuid) from public, anon, authenticated;

create or replace function public.may_teach_subject(uid uuid, subject_id text)
returns boolean language sql stable security definer set search_path = '' as $$
  select coalesce((select subject_id = any(s.subjects)
    and (cardinality(s.subjects) = 1 or public.has_multiple_subjects(uid))
    from public.teacher_subjects s where s.user_id = uid), false);
$$;
revoke execute on function public.may_teach_subject(uuid, text) from public, anon, authenticated;

create or replace function public.set_teaching_subjects(chosen text[], preferred text)
returns void language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
  previous text[];
begin
  if uid is null then raise exception 'Sign in required' using errcode = '42501'; end if;
  -- Serialize changes even before the first assignment exists.
  perform 1 from public.profiles where id = uid for update;
  if not found then raise exception 'Profile required' using errcode = '42501'; end if;
  if chosen is null or cardinality(chosen) not between 1 and 8
    or array_position(chosen, null) is not null
    or not (chosen <@ array['math','physics','chemistry','biology','geography','history','georgian','english']::text[])
    or cardinality(chosen) <> (select count(distinct x) from unnest(chosen) x)
    or preferred is null or not (preferred = any(chosen)) then
    raise exception 'Invalid subject selection' using errcode = '22023';
  end if;
  select subjects into previous from public.teacher_subjects where user_id = uid;
  if not public.has_multiple_subjects(uid) then
    if cardinality(chosen) <> 1 then raise exception 'Premium required' using errcode = '42501'; end if;
    if previous is not null and not (chosen[1] = any(previous)) then
      raise exception 'Free subject cannot be switched' using errcode = '42501';
    end if;
  end if;
  insert into public.teacher_subjects (user_id, subjects) values (uid, chosen)
    on conflict (user_id) do update set subjects = excluded.subjects;
  update public.profiles set default_subject = preferred, updated_at = now() where id = uid;
end;
$$;
revoke execute on function public.set_teaching_subjects(text[], text) from public, anon;
grant execute on function public.set_teaching_subjects(text[], text) to authenticated;

-- Legacy tests may predate subjectId. Match the existing migration's recognized names.
create or replace function public.test_teaching_subject(doc jsonb)
returns text language sql immutable set search_path = '' as $$
  select coalesce(doc->>'subjectId', case lower(trim(doc->>'subject'))
    when 'physics' then 'physics' when 'ფიზიკა' then 'physics'
    when 'chemistry' then 'chemistry' when 'ქიმია' then 'chemistry'
    when 'biology' then 'biology' when 'ბიოლოგია' then 'biology'
    when 'geography' then 'geography' when 'გეოგრაფია' then 'geography' when 'საქართველოს გეოგრაფია' then 'geography'
    when 'history' then 'history' when 'ისტორია' then 'history' when 'საქართველოს ისტორია' then 'history' when 'მსოფლიო ისტორია' then 'history'
    when 'georgian' then 'georgian' when 'georgian language & literature' then 'georgian' when 'literature' then 'georgian'
    when 'ქართული' then 'georgian' when 'ქართული ენა' then 'georgian'
    when 'ქართული ენა და ლიტერატურა' then 'georgian' when 'ქართული ლიტერატურა' then 'georgian' when 'ლიტერატურა' then 'georgian'
    when 'english' then 'english' when 'english language' then 'english' when 'efl' then 'english'
    when 'ინგლისური' then 'english' when 'ინგლისური ენა' then 'english'
    else 'math' end);
$$;
revoke execute on function public.test_teaching_subject(jsonb) from public, anon, authenticated;

create or replace function public.can_edit_test_subject(doc jsonb)
returns boolean language sql stable security definer set search_path = '' as $$
  select public.may_teach_subject((select auth.uid()), public.test_teaching_subject(doc));
$$;
revoke execute on function public.can_edit_test_subject(jsonb) from public, anon;
grant execute on function public.can_edit_test_subject(jsonb) to authenticated;

drop policy if exists "Teachers add their own tests" on public.tests;
create policy "Teachers add their own tests" on public.tests for insert to authenticated
  with check (user_id = (select auth.uid()) and public.can_edit_test_subject(data));
drop policy if exists "Teachers change their own tests" on public.tests;
create policy "Teachers change their own tests" on public.tests for update to authenticated
  using (user_id = (select auth.uid()) and public.can_edit_test_subject(data))
  with check (user_id = (select auth.uid()) and public.can_edit_test_subject(data));
-- SELECT and DELETE ownership policies stay in place. Existing tests remain readable.

create or replace function public.check_default_teaching_subject()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.default_subject is distinct from old.default_subject
    and exists (select 1 from public.teacher_subjects where user_id = new.id)
    and not public.may_teach_subject(new.id, new.default_subject) then
    raise exception 'Default subject must be an active teaching subject' using errcode = '42501';
  end if;
  return new;
end;
$$;
revoke execute on function public.check_default_teaching_subject() from public, anon, authenticated;
drop trigger if exists check_default_teaching_subject on public.profiles;
create trigger check_default_teaching_subject before update of default_subject on public.profiles
  for each row execute function public.check_default_teaching_subject();

-- A read-only test must not be editable by replacing its existing image object.
create or replace function public.can_write_teaching_picture(object_name text)
returns boolean language sql stable security definer set search_path = '' as $$
  select (storage.foldername(object_name))[1] = (select auth.uid())::text
    and not exists (
      select 1 from public.tests t
      where t.user_id = (select auth.uid())
        and not public.may_teach_subject(t.user_id, public.test_teaching_subject(t.data))
        and jsonb_path_exists(t.data, '$.**.imageId ? (@ == $picture)',
          jsonb_build_object('picture', split_part(object_name, '/', 2)))
    );
$$;
revoke execute on function public.can_write_teaching_picture(text) from public, anon;
grant execute on function public.can_write_teaching_picture(text) to authenticated;

drop policy if exists "Teachers upload their own pictures" on storage.objects;
create policy "Teachers upload their own pictures" on storage.objects for insert to authenticated
  with check (bucket_id = 'images' and public.can_write_teaching_picture(name) and public.image_upload_allowed());
drop policy if exists "Teachers replace their own pictures" on storage.objects;
create policy "Teachers replace their own pictures" on storage.objects for update to authenticated
  using (bucket_id = 'images' and public.can_write_teaching_picture(name))
  with check (bucket_id = 'images' and public.can_write_teaching_picture(name));
drop policy if exists "Teachers delete their own pictures" on storage.objects;
create policy "Teachers delete their own pictures" on storage.objects for delete to authenticated
  using (bucket_id = 'images' and public.can_write_teaching_picture(name));

commit;

-- Plan preview: a teacher may look at the website AS A FREE TEACHER, and switch back.
-- Apply after 20261114_teaching_subjects.sql. Safe to rerun; nothing is deleted.
-- It can only LOWER what an account may do (never raise it), so it is safe to
-- offer to everyone: the real plan in the row is never changed.
begin;

alter table public.subscriptions add column if not exists preview_free boolean not null default false;
-- The teaching subjects held when the preview started, given back when it ends.
alter table public.subscriptions add column if not exists preview_subjects text[];

-- The plan that applies NOW (replaces the version in section 4; same rules as
-- src/lib/plans/entitlements.ts — change both together). A preview always means Free.
create or replace function public.plan_of(uid uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((
    select case
      when s.preview_free then 'free'
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

-- Switch the preview on (free = true) or off (free = false) for the signed-in teacher.
-- Off gives back the teaching subjects saved when it was switched on: they were
-- the account's own, and may_teach_subject still checks the real plan for them.
create or replace function public.set_plan_preview(free boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  current_row public.subscriptions;
begin
  if uid is null then raise exception 'Sign in required' using errcode = '42501'; end if;
  select * into current_row from public.subscriptions where user_id = uid for update;
  if not found then return; end if; -- no row = already Free, nothing to preview
  if coalesce(free, false) and not current_row.preview_free then
    update public.subscriptions
      set preview_free = true,
          preview_subjects = (select subjects from public.teacher_subjects where user_id = uid),
          updated_at = now()
      where user_id = uid;
  elsif not coalesce(free, false) and current_row.preview_free then
    if current_row.preview_subjects is not null then
      insert into public.teacher_subjects (user_id, subjects) values (uid, current_row.preview_subjects)
        on conflict (user_id) do update set subjects = excluded.subjects;
    end if;
    update public.subscriptions set preview_free = false, preview_subjects = null, updated_at = now() where user_id = uid;
  end if;
end;
$$;
revoke execute on function public.set_plan_preview(boolean) from public, anon;
grant execute on function public.set_plan_preview(boolean) to authenticated;

commit;

-- Payments (stage 2): customers, payments / receipts, provider messages, emails.
-- Apply after 20261115_plan_preview.sql. Safe to rerun; nothing is deleted.
--
-- Who may change a plan? ONLY the functions below, and each one demands the
-- server's secret (BILLING_SERVER_SECRET). The database keeps only a HASH of
-- that secret (a one-way fingerprint), so reading this table reveals nothing.
-- Our server routes pass the secret; a teacher's browser never has it.
--
-- After running this file, set the secret ONCE in the SQL Editor:
--   select public.set_server_secret('billing', 'the same long random text as BILLING_SERVER_SECRET');
begin;

-- ---------------------------------------------------------------------
-- 1. The server's secret (hash only)
-- ---------------------------------------------------------------------
create table if not exists public.server_secrets (
  name text primary key check (name in ('billing')),
  hash text not null check (char_length(hash) = 64),
  updated_at timestamptz not null default now()
);
alter table public.server_secrets enable row level security;
revoke all on public.server_secrets from public, anon, authenticated;

-- Only the SQL Editor (the database owner) may call this.
create or replace function public.set_server_secret(secret_name text, secret text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if char_length(coalesce(secret, '')) < 24 then raise exception 'The secret must be at least 24 characters long'; end if;
  insert into public.server_secrets (name, hash) values (secret_name, encode(sha256(convert_to(secret, 'UTF8')), 'hex'))
    on conflict (name) do update set hash = excluded.hash, updated_at = now();
end;
$$;
revoke execute on function public.set_server_secret(text, text) from public, anon, authenticated;

create or replace function public.require_server_secret(secret_name text, secret text)
returns void language plpgsql stable security definer set search_path = '' as $$
begin
  if secret is null or not exists (
    select 1 from public.server_secrets s
    where s.name = secret_name and s.hash = encode(sha256(convert_to(secret, 'UTF8')), 'hex')
  ) then
    raise exception 'Not allowed' using errcode = '42501';
  end if;
end;
$$;
revoke execute on function public.require_server_secret(text, text) from public, anon, authenticated;

-- ---------------------------------------------------------------------
-- 2. Audit: who / what changed a plan, and why
-- ---------------------------------------------------------------------
alter table public.subscriptions add column if not exists renewal_attempts int not null default 0;
alter table public.subscriptions add column if not exists next_retry_at timestamptz;
alter table public.subscriptions add column if not exists changed_by text not null default 'system';
alter table public.subscriptions add column if not exists changed_reason text not null default '';
alter table public.subscriptions add column if not exists changed_at timestamptz;

create table if not exists public.subscription_changes (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  changed_at timestamptz not null default now(),
  changed_by text not null,
  reason text not null default '',
  old_plan text,
  old_status text,
  old_period_end timestamptz,
  new_plan text not null,
  new_status text not null,
  new_period_end timestamptz,
  cancel_at_period_end boolean not null default false
);
create index if not exists subscription_changes_user on public.subscription_changes (user_id, changed_at desc);
alter table public.subscription_changes enable row level security;
revoke all on public.subscription_changes from public, anon, authenticated;

-- Our functions say who they are by writing changed_by / changed_reason and
-- setting changed_at to null. A writer that doesn't (changed_at left as it
-- was) counts as "system".
create or replace function public.stamp_subscription_change()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'UPDATE' and new.changed_at is not null then
    new.changed_by := 'system';
    new.changed_reason := '';
  end if;
  new.changed_at := clock_timestamp();
  return new;
end;
$$;
revoke execute on function public.stamp_subscription_change() from public, anon, authenticated;
drop trigger if exists stamp_subscription_change on public.subscriptions;
create trigger stamp_subscription_change before insert or update on public.subscriptions
  for each row execute function public.stamp_subscription_change();

create or replace function public.log_subscription_change()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    insert into public.subscription_changes (user_id, changed_by, reason, new_plan, new_status, new_period_end, cancel_at_period_end)
    values (new.user_id, new.changed_by, new.changed_reason, new.plan, new.status, new.current_period_end, new.cancel_at_period_end);
  elsif new.plan is distinct from old.plan or new.status is distinct from old.status
    or new.current_period_end is distinct from old.current_period_end
    or new.trial_ends_at is distinct from old.trial_ends_at
    or new.cancel_at_period_end is distinct from old.cancel_at_period_end
    or new.billing_period is distinct from old.billing_period then
    insert into public.subscription_changes
      (user_id, changed_by, reason, old_plan, old_status, old_period_end, new_plan, new_status, new_period_end, cancel_at_period_end)
    values (new.user_id, new.changed_by, new.changed_reason, old.plan, old.status, old.current_period_end,
      new.plan, new.status, new.current_period_end, new.cancel_at_period_end);
  end if;
  return new;
exception when others then
  raise warning 'log_subscription_change failed: %', sqlerrm; -- the log must never block a change
  return new;
end;
$$;
revoke execute on function public.log_subscription_change() from public, anon, authenticated;
drop trigger if exists log_subscription_change on public.subscriptions;
create trigger log_subscription_change after insert or update on public.subscriptions
  for each row execute function public.log_subscription_change();

-- ---------------------------------------------------------------------
-- 3. Tables
-- ---------------------------------------------------------------------
-- The saved card at the payment provider. `card_token` lets the provider charge
-- renewals; it is useless without the provider's own secret key, but teachers
-- still get no access to this table (only the last 4 digits, through the server).
create table if not exists public.payment_customers (
  user_id uuid primary key references auth.users (id) on delete cascade,
  provider text not null check (char_length(provider) <= 40),
  card_token text check (char_length(card_token) <= 500),
  card_last4 text check (card_last4 ~ '^[0-9]{4}$'),
  card_brand text check (char_length(card_brand) <= 40),
  card_expiry text check (char_length(card_expiry) <= 10),
  updated_at timestamptz not null default now()
);
alter table public.payment_customers enable row level security;
revoke all on public.payment_customers from public, anon, authenticated;

create sequence if not exists public.receipt_numbers;
revoke all on sequence public.receipt_numbers from public, anon, authenticated;

-- One row per payment attempt. A paid row is also the receipt.
-- (Kept when an account is deleted: accounting needs the record.)
create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete set null,
  order_id text not null unique check (char_length(order_id) between 8 and 80),
  provider text not null check (char_length(provider) <= 40),
  provider_payment_id text check (char_length(provider_payment_id) <= 200),
  kind text not null check (kind in ('checkout', 'renewal')),
  plan text not null check (plan in ('premium', 'school')),
  billing_period text not null check (billing_period in ('month', 'year', 'schoolYear')),
  amount_tetri int not null check (amount_tetri > 0),      -- 1 lari = 100 tetri
  currency text not null default 'GEL' check (currency = 'GEL'),
  status text not null default 'pending' check (status in ('pending', 'paid', 'failed', 'refunded')),
  failure_reason text not null default '' check (char_length(failure_reason) <= 200),
  receipt_number bigint unique,
  period_start timestamptz,
  period_end timestamptz,
  card_last4 text,
  card_brand text,
  created_at timestamptz not null default now(),
  paid_at timestamptz,
  refunded_at timestamptz
);
create index if not exists payments_user_created on public.payments (user_id, created_at desc);
alter table public.payments enable row level security;
drop policy if exists "Teachers read their own payments" on public.payments;
create policy "Teachers read their own payments" on public.payments
  for select to authenticated using ((select auth.uid()) = user_id);
revoke all on public.payments from public, anon, authenticated;
grant select on public.payments to authenticated;

-- Every message from a payment provider, stored once: the same message
-- arriving twice is recognised by (provider, event_id) and not processed again.
create table if not exists public.payment_events (
  id bigint generated always as identity primary key,
  provider text not null check (char_length(provider) <= 40),
  event_id text not null check (char_length(event_id) between 1 and 300),
  type text not null check (char_length(type) <= 40),
  order_id text,
  payload jsonb not null default '{}'::jsonb check (pg_column_size(payload) < 100000),
  received_at timestamptz not null default now(),
  processed_at timestamptz,
  result text not null default 'received',
  unique (provider, event_id)
);
alter table public.payment_events enable row level security;
revoke all on public.payment_events from public, anon, authenticated;

-- Which emails were already sent, so nobody gets the same one twice.
create table if not exists public.email_log (
  id bigint generated always as identity primary key,
  user_id uuid references auth.users (id) on delete cascade,
  kind text not null check (char_length(kind) <= 40),
  dedupe_key text not null unique check (char_length(dedupe_key) <= 200),
  created_at timestamptz not null default now()
);
alter table public.email_log enable row level security;
revoke all on public.email_log from public, anon, authenticated;

-- ---------------------------------------------------------------------
-- 4. Internal helpers (nobody outside the database can call them)
-- ---------------------------------------------------------------------
-- When a paid period that starts at `start_at` ends. The same rule as
-- periodEnd() in src/lib/plans/billing.ts (change both together).
-- "schoolYear" runs to the end of 30 June (Tbilisi time): bought in
-- July–December it ends next year, bought in January–June the same year.
create or replace function public.billing_period_end(start_at timestamptz, period text)
returns timestamptz language sql immutable set search_path = '' as $$
  select case period
    when 'month' then start_at + interval '1 month'
    when 'year' then start_at + interval '1 year'
    else make_timestamptz(
      extract(year from start_at at time zone 'Asia/Tbilisi')::int
        + case when extract(month from start_at at time zone 'Asia/Tbilisi') >= 7 then 1 else 0 end,
      7, 1, 0, 0, 0, 'Asia/Tbilisi')
  end;
$$;
revoke execute on function public.billing_period_end(timestamptz, text) from public, anon, authenticated;

-- A payment failed. A failed RENEWAL starts the retries (1, 3 and 5 days after
-- the period ended — RENEWAL_RETRY_DAYS in plans.ts) and the grace period.
create or replace function public.billing_mark_failed(pay public.payments, reason text, actor text)
returns void language plpgsql security definer set search_path = '' as $$
declare
  grace int := coalesce((select grace_days from public.plan_settings where id = 1), 7);
begin
  update public.payments set status = 'failed', failure_reason = left(coalesce(reason, ''), 200) where id = pay.id;
  if pay.kind = 'renewal' then
    update public.subscriptions s set
      status = 'past_due',
      renewal_attempts = s.renewal_attempts + 1,
      grace_ends_at = coalesce(s.grace_ends_at, s.current_period_end + make_interval(days => grace)),
      next_retry_at = case s.renewal_attempts + 1
        when 1 then s.current_period_end + interval '1 day'
        when 2 then s.current_period_end + interval '3 days'
        when 3 then s.current_period_end + interval '5 days'
        else null end,
      changed_by = actor, changed_reason = 'renewal payment failed', changed_at = null, updated_at = now()
    where s.user_id = pay.user_id and s.status in ('active', 'past_due') and not s.cancel_at_period_end
      and s.current_period_end is not null and s.current_period_end <= now();
  end if;
end;
$$;
revoke execute on function public.billing_mark_failed(public.payments, text, text) from public, anon, authenticated;

-- A payment succeeded: write the receipt and start / extend the plan.
create or replace function public.billing_mark_paid(
  pay public.payments, payment_ref text, last4 text, brand text, expiry text, token text, actor text)
returns void language plpgsql security definer set search_path = '' as $$
declare
  sub public.subscriptions;
  starts timestamptz := now();
  ends timestamptz;
begin
  select * into sub from public.subscriptions where user_id = pay.user_id for update;
  if found and sub.status <> 'trialing' and sub.plan = pay.plan and sub.current_period_end is not null then
    if pay.kind = 'renewal' then
      starts := sub.current_period_end;               -- no gap, even when a retry succeeded a few days late
    elsif sub.status in ('active', 'canceled') and sub.current_period_end > now() then
      starts := sub.current_period_end;               -- bought again before the paid time ran out: added on top
    end if;
  end if;
  ends := public.billing_period_end(starts, pay.billing_period);

  update public.payments set
    status = 'paid', paid_at = now(), failure_reason = '',
    receipt_number = coalesce(receipt_number, nextval('public.receipt_numbers')),
    period_start = starts, period_end = ends,
    provider_payment_id = coalesce(payment_ref, provider_payment_id),
    card_last4 = case when last4 ~ '^[0-9]{4}$' then last4 else card_last4 end,
    card_brand = coalesce(left(brand, 40), card_brand)
  where id = pay.id;

  insert into public.subscriptions as s
    (user_id, plan, status, billing_period, current_period_start, current_period_end, provider, changed_by, changed_reason, changed_at)
  values (pay.user_id, pay.plan, 'active', pay.billing_period, least(starts, now()), ends, pay.provider, actor,
    case pay.kind when 'renewal' then 'renewal paid' else 'payment received' end, null)
  on conflict (user_id) do update set
    plan = excluded.plan, status = 'active', billing_period = excluded.billing_period,
    current_period_start = excluded.current_period_start,
    current_period_end = excluded.current_period_end,
    grace_ends_at = null, cancel_at_period_end = false, renewal_attempts = 0, next_retry_at = null,
    provider = excluded.provider, changed_by = excluded.changed_by, changed_reason = excluded.changed_reason,
    changed_at = null, updated_at = now();

  insert into public.payment_customers as c (user_id, provider, card_token, card_last4, card_brand, card_expiry)
  values (pay.user_id, pay.provider, left(token, 500), case when last4 ~ '^[0-9]{4}$' then last4 end, left(brand, 40), left(expiry, 10))
  on conflict (user_id) do update set
    provider = excluded.provider,
    card_token = coalesce(excluded.card_token, case when c.provider = excluded.provider then c.card_token end),
    card_last4 = coalesce(excluded.card_last4, c.card_last4),
    card_brand = coalesce(excluded.card_brand, c.card_brand),
    card_expiry = coalesce(excluded.card_expiry, c.card_expiry),
    updated_at = now();
end;
$$;
revoke execute on function public.billing_mark_paid(public.payments, text, text, text, text, text, text) from public, anon, authenticated;

-- What the server needs to write an email about a payment.
create or replace function public.billing_payment_info(payment uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  info jsonb;
begin
  select jsonb_build_object(
    'payment_id', p.id, 'order_id', p.order_id, 'kind', p.kind, 'status', p.status, 'user_id', p.user_id,
    'plan', p.plan, 'period', p.billing_period, 'amount_tetri', p.amount_tetri,
    'receipt_number', p.receipt_number, 'period_end', p.period_end, 'failure_reason', p.failure_reason,
    'email', (select u.email from auth.users u where u.id = p.user_id),
    'language', coalesce((select pr.language from public.profiles pr where pr.id = p.user_id), 'ka'),
    'grace_ends_at', (select s.grace_ends_at from public.subscriptions s where s.user_id = p.user_id),
    'retries_left', (select s.next_retry_at is not null from public.subscriptions s where s.user_id = p.user_id)
  ) into info from public.payments p where p.id = payment;
  return info;
end;
$$;
revoke execute on function public.billing_payment_info(uuid) from public, anon, authenticated;

-- ---------------------------------------------------------------------
-- 5. What our server calls (each one needs the secret)
-- ---------------------------------------------------------------------
-- A teacher pressed "Buy": remember the order before sending them to the bank page.
create or replace function public.billing_start_checkout(
  secret text, uid uuid, provider text, order_id text, billing_period text, amount_tetri int)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  sub public.subscriptions;
  payment uuid;
begin
  perform public.require_server_secret('billing', secret);
  if not exists (select 1 from auth.users u where u.id = uid) then return jsonb_build_object('error', 'noUser'); end if;
  select * into sub from public.subscriptions where user_id = uid;
  -- Already paying and renewing: nothing to buy (change the period in Settings instead).
  if found and sub.plan <> 'free' and sub.status = 'active' and not sub.cancel_at_period_end
    and (sub.current_period_end is null or sub.current_period_end > now()) then
    return jsonb_build_object('error', 'alreadySubscribed');
  end if;
  insert into public.payments (user_id, order_id, provider, kind, plan, billing_period, amount_tetri)
  values (uid, order_id, provider, 'checkout', 'premium', billing_period, amount_tetri)
  returning id into payment;
  return jsonb_build_object('payment_id', payment);
end;
$$;

-- The scheduled job wants to charge a renewal (or retry one). Checks again,
-- under a lock, that it is really due — two jobs at once can't charge twice.
create or replace function public.billing_start_renewal(secret text, uid uuid, order_id text, amount_tetri int)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  sub public.subscriptions;
  customer public.payment_customers;
  pay public.payments;
begin
  perform public.require_server_secret('billing', secret);
  select * into sub from public.subscriptions where user_id = uid for update;
  if not found or sub.plan = 'free' or sub.cancel_at_period_end or sub.provider is null or sub.billing_period is null
    or sub.current_period_end is null or sub.current_period_end > now()
    or not ((sub.status = 'active' and sub.renewal_attempts = 0)
      or (sub.status = 'past_due' and sub.next_retry_at is not null and sub.next_retry_at <= now()
        and coalesce(sub.grace_ends_at, sub.current_period_end) > now()))
    or exists (select 1 from public.payments p where p.user_id = uid and p.kind = 'renewal' and p.status = 'pending') then
    return jsonb_build_object('skip', true);
  end if;
  insert into public.payments (user_id, order_id, provider, kind, plan, billing_period, amount_tetri)
  values (uid, order_id, sub.provider, 'renewal', sub.plan, sub.billing_period, amount_tetri)
  returning * into pay;
  select * into customer from public.payment_customers c where c.user_id = uid and c.provider = sub.provider;
  if customer.card_token is null then
    perform public.billing_mark_failed(pay, 'no saved card', 'cron');
    return jsonb_build_object('failed', true) || public.billing_payment_info(pay.id);
  end if;
  return jsonb_build_object('payment_id', pay.id, 'card_token', customer.card_token, 'provider', sub.provider,
    'email', (select u.email from auth.users u where u.id = uid),
    'language', coalesce((select pr.language from public.profiles pr where pr.id = uid), 'ka'));
end;
$$;

-- A verified message from the payment provider. Stored first; a message we
-- have already seen changes nothing ("idempotent").
create or replace function public.billing_record_event(
  secret text, provider text, event_id text, event_type text, order_id text, amount_tetri int default null,
  provider_payment_id text default null, card_last4 text default null, card_brand text default null,
  card_expiry text default null, card_token text default null, failure_reason text default null,
  payload jsonb default '{}'::jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  event_row bigint;
  pay public.payments;
  outcome text;
  actor text := 'webhook:' || provider;
begin
  perform public.require_server_secret('billing', secret);
  insert into public.payment_events (provider, event_id, type, order_id, payload)
  values (provider, event_id, event_type, billing_record_event.order_id, coalesce(payload, '{}'::jsonb))
  on conflict do nothing returning id into event_row;
  if event_row is null then return jsonb_build_object('result', 'duplicate'); end if;

  select * into pay from public.payments p
    where p.order_id = billing_record_event.order_id and p.provider = billing_record_event.provider for update;
  if not found then
    outcome := 'unknownOrder';
  elsif event_type in ('payment_succeeded', 'subscription_renewed') then
    if amount_tetri is not null and amount_tetri <> pay.amount_tetri then outcome := 'amountMismatch';
    elsif pay.status in ('paid', 'refunded') then outcome := 'alreadyPaid';
    else
      perform public.billing_mark_paid(pay, provider_payment_id, card_last4, card_brand, card_expiry, card_token, actor);
      outcome := 'paid';
    end if;
  elsif event_type = 'payment_failed' then
    if pay.status <> 'pending' then outcome := 'ignored';
    else
      perform public.billing_mark_failed(pay, failure_reason, actor);
      outcome := 'failed';
    end if;
  elsif event_type = 'refunded' then
    if pay.status <> 'paid' then outcome := 'ignored';
    else
      update public.payments set status = 'refunded', refunded_at = now() where id = pay.id;
      -- The refunded payment bought the time that is running now: the plan ends. Nothing is deleted.
      update public.subscriptions s set status = 'expired', cancel_at_period_end = false, grace_ends_at = null, next_retry_at = null,
        changed_by = actor, changed_reason = 'payment refunded', changed_at = null, updated_at = now()
      where s.user_id = pay.user_id and s.plan = pay.plan and s.current_period_end is not distinct from pay.period_end;
      outcome := 'refunded';
    end if;
  elsif event_type = 'cancelled' then
    update public.subscriptions s set cancel_at_period_end = true,
      changed_by = actor, changed_reason = 'cancelled at the provider', changed_at = null, updated_at = now()
    where s.user_id = pay.user_id and s.status in ('active', 'past_due') and not s.cancel_at_period_end;
    outcome := 'cancelled';
  else
    outcome := 'ignored';
  end if;

  update public.payment_events set processed_at = now(), result = outcome where id = event_row;
  if pay.id is null then return jsonb_build_object('result', outcome); end if;
  return jsonb_build_object('result', outcome) || public.billing_payment_info(pay.id);
end;
$$;

-- "Cancel" = don't renew; the plan runs to the end of the paid time. "Resume" undoes it.
create or replace function public.billing_set_cancel(secret text, uid uuid, cancel boolean)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  sub public.subscriptions;
begin
  perform public.require_server_secret('billing', secret);
  select * into sub from public.subscriptions where user_id = uid for update;
  if not found or sub.plan = 'free' or sub.status not in ('active', 'past_due') or sub.current_period_end is null then
    return jsonb_build_object('error', 'noSubscription');
  end if;
  if cancel and not sub.cancel_at_period_end then
    update public.subscriptions set cancel_at_period_end = true, next_retry_at = null,
      changed_by = 'user', changed_reason = 'cancelled by the teacher', changed_at = null, updated_at = now()
    where user_id = uid;
  elsif not cancel and sub.cancel_at_period_end then
    if sub.current_period_end <= now() then return jsonb_build_object('error', 'ended'); end if;
    update public.subscriptions set cancel_at_period_end = false,
      changed_by = 'user', changed_reason = 'resumed by the teacher', changed_at = null, updated_at = now()
    where user_id = uid;
  end if;
  return jsonb_build_object('ok', true, 'ends_at', sub.current_period_end, 'plan', sub.plan,
    'email', (select u.email from auth.users u where u.id = uid),
    'language', coalesce((select pr.language from public.profiles pr where pr.id = uid), 'ka'));
end;
$$;

-- Monthly <-> yearly: applies from the next renewal (nothing is charged now).
create or replace function public.billing_set_period(secret text, uid uuid, billing_period text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  sub public.subscriptions;
begin
  perform public.require_server_secret('billing', secret);
  if billing_period not in ('month', 'year', 'schoolYear') then return jsonb_build_object('error', 'invalid'); end if;
  select * into sub from public.subscriptions where user_id = uid for update;
  if not found or sub.plan = 'free' or sub.status not in ('active', 'past_due') or sub.provider is null or sub.current_period_end is null then
    return jsonb_build_object('error', 'noSubscription');
  end if;
  update public.subscriptions s set billing_period = billing_set_period.billing_period,
    changed_by = 'user', changed_reason = 'billing period changed', changed_at = null, updated_at = now()
  where s.user_id = uid;
  return jsonb_build_object('ok', true, 'renews_at', sub.current_period_end);
end;
$$;

-- The scheduled job: ends what is over, and lists what to charge and whom to remind.
-- It never deletes anything: an ended plan only locks Premium features.
-- `only_user` limits a run to one account (used by the local test tools).
create or replace function public.billing_sweep(secret text, only_user uuid default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  grace int := coalesce((select grace_days from public.plan_settings where id = 1), 7);
  stale public.payments;
  ended jsonb;
  charges jsonb;
  reminders jsonb;
begin
  perform public.require_server_secret('billing', secret);

  -- A renewal whose answer never arrived counts as failed; an abandoned checkout too.
  for stale in
    select * from public.payments p where p.status = 'pending'
      and p.created_at < now() - case p.kind when 'renewal' then interval '6 hours' else interval '2 days' end
      and (only_user is null or p.user_id = only_user)
    for update
  loop
    perform public.billing_mark_failed(stale, case stale.kind when 'renewal' then 'no answer from the provider' else 'not completed' end, 'cron');
  end loop;

  with done as (
    update public.subscriptions s set status = 'expired', grace_ends_at = null, next_retry_at = null,
      changed_by = 'cron',
      changed_reason = case when s.cancel_at_period_end then 'cancelled plan reached its end' else 'grace period over' end,
      changed_at = null, updated_at = now()
    where s.plan <> 'free' and s.status in ('active', 'past_due') and s.current_period_end is not null
      and (only_user is null or s.user_id = only_user)
      and case
        when s.cancel_at_period_end then s.current_period_end <= now()
        else coalesce(s.grace_ends_at, s.current_period_end + make_interval(days => grace)) <= now()
      end
    returning s.user_id, s.plan, s.current_period_end
  )
  select coalesce(jsonb_agg(jsonb_build_object(
    'kind', 'planEnded', 'user_id', d.user_id, 'plan', d.plan,
    'key', d.user_id || ':planEnded:' || to_char(d.current_period_end, 'YYYY-MM-DD'),
    'email', (select u.email from auth.users u where u.id = d.user_id),
    'language', coalesce((select pr.language from public.profiles pr where pr.id = d.user_id), 'ka'))), '[]'::jsonb)
  into ended from done d;

  select coalesce(jsonb_agg(jsonb_build_object('user_id', s.user_id, 'provider', s.provider, 'plan', s.plan, 'period', s.billing_period)), '[]'::jsonb)
  into charges
  from public.subscriptions s
  where s.plan <> 'free' and not s.cancel_at_period_end and s.provider is not null and s.billing_period is not null
    and s.current_period_end is not null and s.current_period_end <= now()
    and (only_user is null or s.user_id = only_user)
    and ((s.status = 'active' and s.renewal_attempts = 0)
      or (s.status = 'past_due' and s.next_retry_at is not null and s.next_retry_at <= now()))
    and not exists (select 1 from public.payments p where p.user_id = s.user_id and p.kind = 'renewal' and p.status = 'pending');

  select coalesce(jsonb_agg(r), '[]'::jsonb) into reminders from (
    select jsonb_build_object(
      'kind', case when s.trial_ends_at <= now() + interval '1 day' then 'trialEnding1' else 'trialEnding3' end,
      'user_id', s.user_id, 'date', s.trial_ends_at,
      'key', s.user_id || case when s.trial_ends_at <= now() + interval '1 day' then ':trialEnding1' else ':trialEnding3' end,
      'email', (select u.email from auth.users u where u.id = s.user_id),
      'language', coalesce((select pr.language from public.profiles pr where pr.id = s.user_id), 'ka')) as r
    from public.subscriptions s
    where s.status = 'trialing' and s.trial_ends_at > now() and s.trial_ends_at <= now() + interval '3 days'
      and (only_user is null or s.user_id = only_user)
    union all
    select jsonb_build_object(
      'kind', 'graceEnding', 'user_id', s.user_id, 'date', s.grace_ends_at,
      'key', s.user_id || ':graceEnding:' || to_char(s.grace_ends_at, 'YYYY-MM-DD'),
      'email', (select u.email from auth.users u where u.id = s.user_id),
      'language', coalesce((select pr.language from public.profiles pr where pr.id = s.user_id), 'ka'))
    from public.subscriptions s
    where s.status = 'past_due' and not s.cancel_at_period_end and s.grace_ends_at > now() and s.grace_ends_at <= now() + interval '2 days'
      and (only_user is null or s.user_id = only_user)
  ) x;

  return jsonb_build_object('charges', charges, 'emails', ended || reminders);
end;
$$;

-- "May I send this email?" True only the first time for a key.
create or replace function public.email_claim(secret text, uid uuid, kind text, dedupe_key text)
returns boolean language plpgsql security definer set search_path = '' as $$
declare
  claimed bigint;
begin
  perform public.require_server_secret('billing', secret);
  insert into public.email_log (user_id, kind, dedupe_key) values (uid, kind, dedupe_key)
    on conflict do nothing returning id into claimed;
  return claimed is not null;
end;
$$;

-- The email could not be sent after all: allow another try later.
create or replace function public.email_release(secret text, dedupe_key text)
returns boolean language plpgsql security definer set search_path = '' as $$
begin
  perform public.require_server_secret('billing', secret);
  delete from public.email_log l where l.dedupe_key = email_release.dedupe_key;
  return found;
end;
$$;

-- Settings → My plan: the plan row, the card's last 4 digits, the receipts.
create or replace function public.billing_summary(secret text, uid uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
  perform public.require_server_secret('billing', secret);
  return jsonb_build_object(
    'subscription', (select jsonb_build_object(
        'plan', s.plan, 'status', s.status, 'billing_period', s.billing_period, 'trial_ends_at', s.trial_ends_at,
        'current_period_end', s.current_period_end, 'grace_ends_at', s.grace_ends_at,
        'cancel_at_period_end', s.cancel_at_period_end, 'preview_free', s.preview_free,
        'provider', s.provider, 'next_retry_at', s.next_retry_at)
      from public.subscriptions s where s.user_id = uid),
    'method', (select jsonb_build_object('last4', c.card_last4, 'brand', c.card_brand, 'expiry', c.card_expiry)
      from public.payment_customers c where c.user_id = uid and c.card_last4 is not null),
    'payments', coalesce((select jsonb_agg(row_to_json(x)) from (
        select p.id, p.order_id, p.kind, p.plan, p.billing_period, p.amount_tetri, p.status, p.failure_reason,
          p.receipt_number, p.period_start, p.period_end, p.card_last4, p.card_brand, p.created_at, p.paid_at, p.refunded_at
        from public.payments p where p.user_id = uid and p.status <> 'pending'
        order by p.created_at desc limit 36) x), '[]'::jsonb),
    'pending', coalesce((select jsonb_agg(p.order_id) from public.payments p
      where p.user_id = uid and p.status = 'pending' and p.created_at > now() - interval '1 day'), '[]'::jsonb),
    'profile', (select jsonb_build_object('full_name', pr.full_name, 'school_name', pr.school_name, 'language', pr.language,
        'email', (select u.email from auth.users u where u.id = uid))
      from public.profiles pr where pr.id = uid)
  );
end;
$$;

-- The secret is the lock on these: they are callable through the public API,
-- and refuse everyone who doesn't have it.
revoke execute on function public.billing_start_checkout(text, uuid, text, text, text, int) from public;
revoke execute on function public.billing_start_renewal(text, uuid, text, int) from public;
revoke execute on function public.billing_record_event(text, text, text, text, text, int, text, text, text, text, text, text, jsonb) from public;
revoke execute on function public.billing_set_cancel(text, uuid, boolean) from public;
revoke execute on function public.billing_set_period(text, uuid, text) from public;
revoke execute on function public.billing_sweep(text, uuid) from public;
revoke execute on function public.email_claim(text, uuid, text, text) from public;
revoke execute on function public.email_release(text, text) from public;
revoke execute on function public.billing_summary(text, uuid) from public;
grant execute on function public.billing_start_checkout(text, uuid, text, text, text, int) to anon, authenticated;
grant execute on function public.billing_start_renewal(text, uuid, text, int) to anon, authenticated;
grant execute on function public.billing_record_event(text, text, text, text, text, int, text, text, text, text, text, text, jsonb) to anon, authenticated;
grant execute on function public.billing_set_cancel(text, uuid, boolean) to anon, authenticated;
grant execute on function public.billing_set_period(text, uuid, text) to anon, authenticated;
grant execute on function public.billing_sweep(text, uuid) to anon, authenticated;
grant execute on function public.email_claim(text, uuid, text, text) to anon, authenticated;
grant execute on function public.email_release(text, text) to anon, authenticated;
grant execute on function public.billing_summary(text, uuid) to anon, authenticated;

commit;

-- AI question generator (stage 3): how many generations each teacher has used.
-- Apply after 20261116_payments.sql. Safe to rerun; nothing is deleted.
--
-- The monthly limit of the teacher's plan (plan_limits.ai_per_month) is
-- checked and counted HERE, in the database. Only our server can count a
-- generation (it passes the server secret), so a teacher can neither skip the
-- limit nor reset their own count. No question text is ever stored: only the
-- subject, how many questions, and the size of the request (for the admin page).
begin;

create table if not exists public.ai_usage (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  subject text not null check (char_length(subject) <= 40),
  question_count int not null check (question_count between 1 and 50),
  status text not null default 'started' check (status in ('started', 'done', 'failed')),
  mock boolean not null default false,              -- made without the real AI (no API key)
  model text not null default '' check (char_length(model) <= 80),
  input_tokens int,
  output_tokens int,
  kept int,                                         -- questions that passed our checks
  regenerations int not null default 0              -- "make this one again" (free, a few per generation)
);
create index if not exists ai_usage_user_month on public.ai_usage (user_id, created_at desc);
alter table public.ai_usage enable row level security;
drop policy if exists "Teachers read their own AI usage" on public.ai_usage;
create policy "Teachers read their own AI usage" on public.ai_usage
  for select to authenticated using ((select auth.uid()) = user_id);
revoke all on public.ai_usage from public, anon, authenticated;
grant select on public.ai_usage to authenticated;

-- The month runs by Tbilisi time: a new count starts on the 1st at 00:00.
create or replace function public.ai_month_start()
returns timestamptz language sql stable set search_path = '' as $$
  select date_trunc('month', now() at time zone 'Asia/Tbilisi') at time zone 'Asia/Tbilisi';
$$;
revoke execute on function public.ai_month_start() from public, anon, authenticated;

-- { used, limit, plan } for one teacher. Failed generations don't count.
create or replace function public.ai_usage_of(uid uuid)
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'plan', public.plan_of(uid),
    -- 3 if plans.sql hasn't been pasted yet (the Free number).
    'limit', coalesce((select l.ai_per_month from public.plan_limits l where l.plan = public.plan_of(uid)), 3),
    'used', (select count(*) from public.ai_usage a
             where a.user_id = uid and a.status <> 'failed' and a.created_at >= public.ai_month_start())
  );
$$;
revoke execute on function public.ai_usage_of(uuid) from public, anon, authenticated;

-- "N of M left this month" for the screen.
create or replace function public.ai_status(secret text, uid uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
  perform public.require_server_secret('billing', secret);
  return public.ai_usage_of(uid);
end;
$$;

-- Count one generation, if the plan still allows it and the subject is one the
-- teacher may edit. Returns { ok, usage_id, used, limit } or { error, used, limit }.
create or replace function public.ai_consume(secret text, uid uuid, subject text, question_count int, is_mock boolean, model text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  state jsonb;
  usage_id bigint;
begin
  perform public.require_server_secret('billing', secret);
  if not exists (select 1 from auth.users u where u.id = uid) then return jsonb_build_object('error', 'noUser'); end if;
  -- One at a time per teacher: two clicks at once can't both take the last one.
  perform pg_advisory_xact_lock(hashtextextended(uid::text, 0));
  state := public.ai_usage_of(uid);
  if not public.may_teach_subject(uid, subject) then
    return state || jsonb_build_object('error', 'subject');
  end if;
  if (state ->> 'used')::int >= (state ->> 'limit')::int then
    return state || jsonb_build_object('error', 'limit');
  end if;
  insert into public.ai_usage (user_id, subject, question_count, mock, model)
  values (uid, subject, greatest(1, least(coalesce(question_count, 1), 50)), coalesce(is_mock, false), left(coalesce(model, ''), 80))
  returning id into usage_id;
  return jsonb_build_object('ok', true, 'usage_id', usage_id, 'plan', state -> 'plan',
    'limit', state -> 'limit', 'used', (state ->> 'used')::int + 1);
end;
$$;

-- The generation finished. A failed one is given back (it doesn't count).
create or replace function public.ai_finish(secret text, usage_id bigint, succeeded boolean, input_tokens int default null, output_tokens int default null, kept int default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  owner uuid;
begin
  perform public.require_server_secret('billing', secret);
  update public.ai_usage a set
    status = case when succeeded then 'done' else 'failed' end,
    input_tokens = ai_finish.input_tokens, output_tokens = ai_finish.output_tokens, kept = ai_finish.kept
  where a.id = usage_id and a.status = 'started'
  returning a.user_id into owner;
  if owner is null then return jsonb_build_object('error', 'unknown'); end if;
  return public.ai_usage_of(owner);
end;
$$;

-- "Make this one question again": free, but at most 5 per generation, and only
-- for the teacher's own, finished generation of this month.
create or replace function public.ai_regenerate(secret text, uid uuid, usage_id bigint)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  touched bigint;
begin
  perform public.require_server_secret('billing', secret);
  update public.ai_usage a set regenerations = a.regenerations + 1
  where a.id = usage_id and a.user_id = uid and a.status = 'done' and a.regenerations < 5
    and a.created_at >= public.ai_month_start()
  returning a.id into touched;
  if touched is null then return jsonb_build_object('error', 'regenerations'); end if;
  return jsonb_build_object('ok', true);
end;
$$;

revoke execute on function public.ai_status(text, uuid) from public;
revoke execute on function public.ai_consume(text, uuid, text, int, boolean, text) from public;
revoke execute on function public.ai_finish(text, bigint, boolean, int, int, int) from public;
revoke execute on function public.ai_regenerate(text, uuid, bigint) from public;
grant execute on function public.ai_status(text, uuid) to anon, authenticated;
grant execute on function public.ai_consume(text, uuid, text, int, boolean, text) to anon, authenticated;
grant execute on function public.ai_finish(text, bigint, boolean, int, int, int) to anon, authenticated;
grant execute on function public.ai_regenerate(text, uuid, bigint) to anon, authenticated;

commit;

-- Custom paper header (stage 4, Premium): school logo and header lines.
-- Apply after 20261117_ai_usage.sql. Safe to rerun; nothing is deleted.
--
-- The header is saved in the teacher's profile. Only a plan with the
-- "customHeader" feature may CHANGE it; a header saved earlier is kept when a
-- plan ends (it is simply not printed until the plan is back).
begin;

alter table public.profiles add column if not exists paper_header jsonb
  check (paper_header is null or pg_column_size(paper_header) < 4000);

-- Does the plan that applies now have this feature? (features come from plans.sql)
create or replace function public.plan_has_feature(uid uuid, feature text)
returns boolean language sql stable security definer set search_path = '' as $$
  select coalesce((select feature = any(l.features) from public.plan_limits l where l.plan = public.plan_of(uid)), false);
$$;
revoke execute on function public.plan_has_feature(uuid, text) from public, anon, authenticated;

-- "May I use this Premium feature?" for the signed-in teacher (the screen asks; the rules below enforce).
create or replace function public.my_feature(feature text)
returns boolean language sql stable security definer set search_path = '' as $$
  select public.plan_has_feature((select auth.uid()), feature);
$$;
revoke execute on function public.my_feature(text) from public, anon;
grant execute on function public.my_feature(text) to authenticated;

create or replace function public.check_paper_header()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.paper_header is distinct from old.paper_header and new.paper_header is not null
    and not public.plan_has_feature(new.id, 'customHeader') then
    raise exception 'Premium required for a custom header' using errcode = '42501';
  end if;
  return new;
end;
$$;
revoke execute on function public.check_paper_header() from public, anon, authenticated;
drop trigger if exists check_paper_header on public.profiles;
create trigger check_paper_header before update of paper_header on public.profiles
  for each row execute function public.check_paper_header();

commit;
-- Personal question bank (stage 4, Premium): questions a teacher saved to reuse.
-- Apply after 20261118_custom_header.sql. Safe to rerun; nothing is deleted.
--
-- Each row is ONE question (the same JSON the editor stores inside a test),
-- with a few plain columns to search by. Only the owner can see a row.
-- Adding and changing needs a plan with the "questionBank" feature; what was
-- saved earlier stays readable (and deletable) when a plan ends.
begin;

create table if not exists public.bank_questions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  subject text not null check (char_length(subject) between 1 and 40),
  grade text not null default '' check (char_length(grade) <= 40),
  type text not null check (char_length(type) between 1 and 40),
  tags text[] not null default '{}' check (cardinality(tags) <= 12 and pg_column_size(tags) < 1000),
  -- The question's words without formulas, for the list and the search.
  summary text not null default '' check (char_length(summary) <= 300),
  data jsonb not null check (pg_column_size(data) < 300000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists bank_questions_user_created on public.bank_questions (user_id, created_at desc);

alter table public.bank_questions enable row level security;

drop policy if exists "Teachers read their own bank" on public.bank_questions;
create policy "Teachers read their own bank" on public.bank_questions
  for select to authenticated using ((select auth.uid()) = user_id);

drop policy if exists "Teachers add to their own bank" on public.bank_questions;
create policy "Teachers add to their own bank" on public.bank_questions
  for insert to authenticated
  with check ((select auth.uid()) = user_id and (select public.my_feature('questionBank')));

drop policy if exists "Teachers change their own bank" on public.bank_questions;
create policy "Teachers change their own bank" on public.bank_questions
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id and (select public.my_feature('questionBank')));

drop policy if exists "Teachers delete from their own bank" on public.bank_questions;
create policy "Teachers delete from their own bank" on public.bank_questions
  for delete to authenticated using ((select auth.uid()) = user_id);

revoke all on public.bank_questions from anon;
grant select, insert, update, delete on public.bank_questions to authenticated;

-- A bank can't grow without end (2000 questions per teacher), and a row
-- never moves to another teacher.
create or replace function public.check_bank_question()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    if (select count(*) from public.bank_questions b where b.user_id = new.user_id) >= 2000 then
      raise exception 'The question bank is full' using errcode = '54000';
    end if;
  else
    new.user_id := old.user_id;
    new.created_at := old.created_at;
    new.updated_at := now();
  end if;
  return new;
end;
$$;
revoke execute on function public.check_bank_question() from public, anon, authenticated;
drop trigger if exists check_bank_question on public.bank_questions;
create trigger check_bank_question before insert or update on public.bank_questions
  for each row execute function public.check_bank_question();

commit;
-- Sharing and co-editing (stage 4, Premium).
-- Apply after 20261119_question_bank.sql. Safe to rerun; nothing is deleted.
--
-- * A teacher shares a test with a colleague BY EMAIL: "view" (look, print,
--   make an own copy) or "edit". The colleague is whoever signs in with that
--   (confirmed) email address — also if they make their account later.
-- * A read-only LINK: anyone who has the long secret address can look at the
--   test. The owner can switch the link off again at any time.
-- * Every save raises the test's version number. A save that was based on an
--   older version is refused, so two people can't silently overwrite each
--   other ("someone else changed this test").
-- * Sharing needs the OWNER's plan to have the "sharing" feature. When that
--   plan ends, the shares stay stored but stop working until it is back.
-- * The teaching-subject rules still apply: an editor can only change tests
--   of the subjects they teach.
begin;

-- ---------------------------------------------------------------------
-- 1. Version numbers on tests
-- ---------------------------------------------------------------------
alter table public.tests add column if not exists version integer not null default 1;

-- The database counts the versions itself; nobody can set one by hand, and a
-- test never moves to another owner or id.
create or replace function public.bump_test_version()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.version := old.version + 1;
  new.user_id := old.user_id;
  new.id := old.id;
  return new;
end;
$$;
revoke execute on function public.bump_test_version() from public, anon, authenticated;
drop trigger if exists bump_test_version on public.tests;
create trigger bump_test_version before update on public.tests
  for each row execute function public.bump_test_version();

-- ---------------------------------------------------------------------
-- 2. Who am I? (the signed-in teacher's confirmed email, lower case)
-- ---------------------------------------------------------------------
create or replace function public.my_email()
returns text language sql stable security definer set search_path = '' as $$
  select lower(u.email) from auth.users u
  where u.id = (select auth.uid()) and u.email_confirmed_at is not null;
$$;
revoke execute on function public.my_email() from public, anon;
grant execute on function public.my_email() to authenticated;

-- ---------------------------------------------------------------------
-- 3. Shares by email
-- ---------------------------------------------------------------------
create table if not exists public.test_shares (
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  test_id text not null,
  email text not null check (email = lower(email) and char_length(email) between 3 and 254 and position('@' in email) > 1),
  role text not null check (role in ('view', 'edit')),
  created_at timestamptz not null default now(),
  primary key (owner_id, test_id, email),
  -- Deleting a test removes its shares.
  foreign key (owner_id, test_id) references public.tests (user_id, id) on delete cascade
);
create index if not exists test_shares_email on public.test_shares (email);

alter table public.test_shares enable row level security;

drop policy if exists "Owners and invited teachers read shares" on public.test_shares;
create policy "Owners and invited teachers read shares" on public.test_shares
  for select to authenticated
  using (owner_id = (select auth.uid()) or email = (select public.my_email()));

drop policy if exists "Owners share their own tests" on public.test_shares;
create policy "Owners share their own tests" on public.test_shares
  for insert to authenticated
  with check (owner_id = (select auth.uid()) and (select public.my_feature('sharing')) and email <> (select public.my_email()));

drop policy if exists "Owners change a share" on public.test_shares;
create policy "Owners change a share" on public.test_shares
  for update to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()) and (select public.my_feature('sharing')) and email <> (select public.my_email()));

-- The owner stops sharing; the invited teacher may leave.
drop policy if exists "Owners and invited teachers remove a share" on public.test_shares;
create policy "Owners and invited teachers remove a share" on public.test_shares
  for delete to authenticated
  using (owner_id = (select auth.uid()) or email = (select public.my_email()));

revoke all on public.test_shares from anon;
grant select, insert, update, delete on public.test_shares to authenticated;

-- At most 30 people per test.
create or replace function public.check_test_share()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if (select count(*) from public.test_shares s where s.owner_id = new.owner_id and s.test_id = new.test_id) >= 30 then
    raise exception 'Too many people on one test' using errcode = '54000';
  end if;
  return new;
end;
$$;
revoke execute on function public.check_test_share() from public, anon, authenticated;
drop trigger if exists check_test_share on public.test_shares;
create trigger check_test_share before insert on public.test_shares
  for each row execute function public.check_test_share();

-- My role on someone's test: 'view', 'edit' or null (not shared with me, or
-- the owner's plan no longer has sharing).
create or replace function public.test_share_role(owner uuid, test text)
returns text language sql stable security definer set search_path = '' as $$
  select s.role from public.test_shares s
  where s.owner_id = owner and s.test_id = test and s.email = public.my_email()
    and public.plan_has_feature(owner, 'sharing');
$$;
revoke execute on function public.test_share_role(uuid, text) from public, anon;
grant execute on function public.test_share_role(uuid, text) to authenticated;

drop policy if exists "Teachers read tests shared with them" on public.tests;
create policy "Teachers read tests shared with them" on public.tests
  for select to authenticated
  using (user_id <> (select auth.uid()) and public.test_share_role(user_id, id) is not null);

-- An editor changes the test, but only in a subject they teach themselves.
drop policy if exists "Editors change tests shared with them" on public.tests;
create policy "Editors change tests shared with them" on public.tests
  for update to authenticated
  using (user_id <> (select auth.uid()) and public.test_share_role(user_id, id) = 'edit' and public.can_edit_test_subject(data))
  with check (user_id <> (select auth.uid()) and public.test_share_role(user_id, id) = 'edit' and public.can_edit_test_subject(data));

-- "Shared with me" on My tests: the tests, who owns them and what I may do.
create or replace function public.tests_shared_with_me()
returns table (owner_id uuid, owner_name text, role text, version integer, data jsonb)
language sql stable security definer set search_path = '' as $$
  select t.user_id, coalesce(p.full_name, ''), s.role, t.version, t.data
  from public.test_shares s
  join public.tests t on t.user_id = s.owner_id and t.id = s.test_id
  left join public.profiles p on p.id = s.owner_id
  where s.email = public.my_email() and s.owner_id <> (select auth.uid())
    and public.plan_has_feature(s.owner_id, 'sharing')
  order by t.updated_at desc
  limit 500;
$$;
revoke execute on function public.tests_shared_with_me() from public, anon;
grant execute on function public.tests_shared_with_me() to authenticated;

-- ---------------------------------------------------------------------
-- 4. Read-only links
-- ---------------------------------------------------------------------
create table if not exists public.test_links (
  -- 64 random characters: impossible to guess.
  token text primary key default replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '')
    check (char_length(token) between 32 and 64),
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  test_id text not null,
  created_at timestamptz not null default now(),
  unique (owner_id, test_id),
  foreign key (owner_id, test_id) references public.tests (user_id, id) on delete cascade
);

alter table public.test_links enable row level security;

drop policy if exists "Owners read their links" on public.test_links;
create policy "Owners read their links" on public.test_links
  for select to authenticated using (owner_id = (select auth.uid()));

drop policy if exists "Owners make a link" on public.test_links;
create policy "Owners make a link" on public.test_links
  for insert to authenticated
  with check (owner_id = (select auth.uid()) and (select public.my_feature('sharing')));

drop policy if exists "Owners switch a link off" on public.test_links;
create policy "Owners switch a link off" on public.test_links
  for delete to authenticated using (owner_id = (select auth.uid()));

revoke all on public.test_links from anon;
grant select, insert, delete on public.test_links to authenticated;

-- The link itself: anyone (signed in or not) who has the secret address gets
-- the test to READ. Nothing else about the owner is given out but their name.
create or replace function public.test_by_link(link_token text)
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object('owner_id', t.user_id, 'owner_name', coalesce(p.full_name, ''), 'data', t.data)
  from public.test_links l
  join public.tests t on t.user_id = l.owner_id and t.id = l.test_id
  left join public.profiles p on p.id = l.owner_id
  where l.token = link_token and public.plan_has_feature(l.owner_id, 'sharing');
$$;
revoke execute on function public.test_by_link(text) from public;
grant execute on function public.test_by_link(text) to anon, authenticated;

-- ---------------------------------------------------------------------
-- 5. Pictures inside shared tests
-- ---------------------------------------------------------------------
-- A picture lives in the folder of whoever uploaded it: the owner, or an
-- editor. It may be read by someone else when a test that USES it is shared
-- with them (or open by link), and the picture sits with that test's owner
-- or one of its editors.
create or replace function public.picture_is_shared(object_name text)
returns boolean language plpgsql stable security definer set search_path = '' as $$
declare
  folder text := split_part(object_name, '/', 1);
  picture text := split_part(object_name, '/', 2);
  holder uuid;
  me uuid := (select auth.uid());
  mail text := public.my_email();
begin
  if folder !~ '^[0-9a-fA-F-]{36}$' or char_length(picture) < 8 then return false; end if;
  holder := folder::uuid;
  -- Own pictures are covered by the "own folder" rule; nothing to work out.
  if holder = me then return false; end if;
  return exists (
    select 1 from public.tests t
    where
      -- only tests the picture's holder owns or edits are looked at
      (t.user_id = holder or exists (
        select 1 from public.test_shares e join auth.users u on lower(u.email) = e.email
        where e.owner_id = t.user_id and e.test_id = t.id and e.role = 'edit' and u.id = holder))
      -- …that I may see: mine, shared with me, or open by link
      and (
        t.user_id = me
        or (public.plan_has_feature(t.user_id, 'sharing') and (
          exists (select 1 from public.test_shares s where s.owner_id = t.user_id and s.test_id = t.id and s.email = mail)
          or exists (select 1 from public.test_links l where l.owner_id = t.user_id and l.test_id = t.id)))
      )
      -- …and that really use this picture
      and position(picture in t.data::text) > 0
  );
end;
$$;
revoke execute on function public.picture_is_shared(text) from public;
grant execute on function public.picture_is_shared(text) to anon, authenticated;

drop policy if exists "Pictures of shared tests can be read" on storage.objects;
create policy "Pictures of shared tests can be read" on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'images' and public.picture_is_shared(name));

-- Where is this picture of that test stored? (with the owner or with an editor)
create or replace function public.shared_picture_path(test_owner uuid, test text, picture text)
returns text language sql stable security definer set search_path = '' as $$
  select o.name from storage.objects o
  where o.bucket_id = 'images'
    and o.name in (
      select test_owner::text || '/' || picture
      union all
      select u.id::text || '/' || picture
      from public.test_shares e join auth.users u on lower(u.email) = e.email
      where e.owner_id = test_owner and e.test_id = test and e.role = 'edit')
    and public.picture_is_shared(o.name)
  limit 1;
$$;
revoke execute on function public.shared_picture_path(uuid, text, text) from public;
grant execute on function public.shared_picture_path(uuid, text, text) to anon, authenticated;

commit;
-- School plan and the founders' admin page (stage 5).
-- Apply after 20261120_sharing.sql, then paste supabase/plans.sql again.
-- Safe to rerun; nothing is deleted.
--
-- * A SCHOOL has a number of seats and a "paid until" date (null = no end).
--   Founders create schools by hand (payment by invoice) from the admin page.
-- * A teacher belongs to at most ONE school. While that school is active the
--   teacher gets the School plan (public.plan_of below); leaving, being
--   removed, or the school ending gives back the teacher's own plan.
--   Nothing of the teacher's is ever deleted.
-- * The SCHOOL ADMIN (role 'admin' inside one school) invites teachers by
--   email or shares a join code, removes teachers and sees usage NUMBERS
--   (never test contents). This role has nothing to do with the founders,
--   nor with teaching subjects.
-- * FOUNDERS are the rows of public.admins. Add yourself ONCE in the SQL Editor:
--     insert into public.admins (user_id) select id from auth.users where email = 'you@example.com';
--   Every founder function checks that table itself and writes admin_log.
-- * Teachers and school admins never write these tables directly: every
--   change goes through a function below that checks who is asking.
begin;

-- ---------------------------------------------------------------------
-- 1. Founders
-- ---------------------------------------------------------------------
create table if not exists public.admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  note text not null default '' check (char_length(note) <= 200),
  created_at timestamptz not null default now()
);
alter table public.admins enable row level security;
revoke all on public.admins from public, anon, authenticated;

create or replace function public.is_admin(uid uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select uid is not null and exists (select 1 from public.admins a where a.user_id = uid);
$$;
revoke execute on function public.is_admin(uuid) from public, anon, authenticated;

-- "Am I a founder?" for the signed-in user (the server asks before showing /admin).
create or replace function public.am_i_admin()
returns boolean language sql stable security definer set search_path = '' as $$
  select public.is_admin((select auth.uid()));
$$;
revoke execute on function public.am_i_admin() from public, anon;
grant execute on function public.am_i_admin() to authenticated;

-- The founder's id, or an error for everyone else. Internal.
create or replace function public.require_admin()
returns uuid language plpgsql stable security definer set search_path = '' as $$
declare
  me uuid := auth.uid();
begin
  if not public.is_admin(me) then
    raise exception 'Founders only' using errcode = '42501';
  end if;
  return me;
end;
$$;
revoke execute on function public.require_admin() from public, anon, authenticated;

-- Every founder action, kept for good. Read only through admin_log_list().
create table if not exists public.admin_log (
  id bigint generated always as identity primary key,
  admin_id uuid references auth.users (id) on delete set null,
  action text not null check (char_length(action) <= 60),
  target text not null default '' check (char_length(target) <= 200),
  reason text not null default '' check (char_length(reason) <= 500),
  details jsonb not null default '{}'::jsonb check (pg_column_size(details) < 10000),
  created_at timestamptz not null default now()
);
create index if not exists admin_log_created on public.admin_log (created_at desc);
alter table public.admin_log enable row level security;
revoke all on public.admin_log from public, anon, authenticated;

create or replace function public.admin_note(admin uuid, action text, target text, reason text, details jsonb default '{}'::jsonb)
returns void language sql security definer set search_path = '' as $$
  insert into public.admin_log (admin_id, action, target, reason, details)
  values (admin, action, coalesce(target, ''), left(coalesce(reason, ''), 500), coalesce(details, '{}'::jsonb));
$$;
revoke execute on function public.admin_note(uuid, text, text, text, jsonb) from public, anon, authenticated;

-- A change needs a short written reason (it goes into the audit log).
create or replace function public.require_reason(reason text)
returns text language plpgsql immutable set search_path = '' as $$
begin
  if char_length(btrim(coalesce(reason, ''))) < 3 then
    raise exception 'A reason is required' using errcode = '22023';
  end if;
  return left(btrim(reason), 500);
end;
$$;
revoke execute on function public.require_reason(text) from public, anon, authenticated;

-- ---------------------------------------------------------------------
-- 2. Schools, members, invites
-- ---------------------------------------------------------------------
-- 8 letters / digits without look-alikes (no 0 O 1 I), from a strong random source.
create or replace function public.new_join_code()
returns text language plpgsql volatile set search_path = '' as $$
declare
  alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  hex text := substr(replace(gen_random_uuid()::text, '-', ''), 1, 12) || substr(replace(gen_random_uuid()::text, '-', ''), 1, 12);
  code text := '';
begin
  for i in 0..7 loop
    code := code || substr(alphabet, (('x' || substr(hex, i * 2 + 1, 2))::bit(8)::int % 32) + 1, 1);
  end loop;
  return code;
end;
$$;
revoke execute on function public.new_join_code() from public, anon, authenticated;

create table if not exists public.schools (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 300),
  city text not null default '' check (char_length(city) <= 100),
  seats int not null check (seats between 1 and 5000),
  status text not null default 'active' check (status in ('active', 'ended')),
  paid_until timestamptz,                        -- null = no end date
  join_code text not null unique default public.new_join_code() check (join_code ~ '^[A-Z2-9]{8}$'),
  request_id bigint references public.school_requests (id) on delete set null,
  note text not null default '' check (char_length(note) <= 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.schools enable row level security;
revoke all on public.schools from public, anon, authenticated;

-- One row per teacher: a teacher is in at most one school.
create table if not exists public.school_members (
  user_id uuid primary key references auth.users (id) on delete cascade,
  school_id uuid not null references public.schools (id) on delete cascade,
  role text not null default 'teacher' check (role in ('admin', 'teacher')),
  department text not null default '' check (char_length(department) <= 80),
  joined_at timestamptz not null default now()
);
create index if not exists school_members_school on public.school_members (school_id);
alter table public.school_members enable row level security;
drop policy if exists "Teachers read their own school seat" on public.school_members;
create policy "Teachers read their own school seat" on public.school_members
  for select to authenticated using (user_id = (select auth.uid()));
revoke all on public.school_members from public, anon, authenticated;
grant select on public.school_members to authenticated;

create table if not exists public.school_invites (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools (id) on delete cascade,
  email text not null check (email = lower(email) and char_length(email) between 3 and 254 and position('@' in email) > 1),
  role text not null default 'teacher' check (role in ('admin', 'teacher')),
  invited_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  unique (school_id, email)
);
create index if not exists school_invites_email on public.school_invites (email);
alter table public.school_invites enable row level security;
revoke all on public.school_invites from public, anon, authenticated;

alter table public.school_requests add column if not exists note text not null default '' check (char_length(note) <= 1000);
alter table public.school_requests add column if not exists school_id uuid references public.schools (id) on delete set null;
alter table public.school_requests add column if not exists updated_at timestamptz;

-- The ACTIVE school this teacher has a seat in (null = none). Internal.
create or replace function public.active_school_of(uid uuid)
returns uuid language sql stable security definer set search_path = '' as $$
  select s.id from public.school_members m join public.schools s on s.id = m.school_id
  where m.user_id = uid and s.status = 'active' and (s.paid_until is null or s.paid_until > now());
$$;
revoke execute on function public.active_school_of(uuid) from public, anon, authenticated;

-- The plan that applies NOW (replaces the earlier versions; same rules as
-- src/lib/plans/entitlements.ts — change both together):
-- "View as Free" → Free; a seat in an active school → School; else the
-- teacher's own subscription.
create or replace function public.plan_of(uid uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when exists (select 1 from public.subscriptions s where s.user_id = uid and s.preview_free) then 'free'
    when public.active_school_of(uid) is not null then 'school'
    else coalesce((
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
    ), 'free')
  end;
$$;
revoke execute on function public.plan_of(uuid) from public, anon, authenticated;

-- ---- For every teacher ----

-- My seat (for the plan shown on screen), or null.
create or replace function public.my_school_seat()
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object('school_id', s.id, 'name', s.name, 'role', m.role, 'department', m.department,
    'status', s.status, 'paid_until', s.paid_until)
  from public.school_members m join public.schools s on s.id = m.school_id
  where m.user_id = (select auth.uid());
$$;
revoke execute on function public.my_school_seat() from public, anon;
grant execute on function public.my_school_seat() to authenticated;

-- Invitations waiting for MY confirmed email address.
create or replace function public.my_school_invites()
returns jsonb language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_agg(jsonb_build_object('id', i.id, 'school', s.name, 'city', s.city, 'role', i.role,
      'inviter', coalesce(p.full_name, ''), 'created_at', i.created_at) order by i.created_at desc), '[]'::jsonb)
  from public.school_invites i
  join public.schools s on s.id = i.school_id
  left join public.profiles p on p.id = i.invited_by
  where i.email = public.my_email() and s.status = 'active' and (s.paid_until is null or s.paid_until > now());
$$;
revoke execute on function public.my_school_invites() from public, anon;
grant execute on function public.my_school_invites() to authenticated;

-- Takes a seat in `sid` for `uid`, if there is one. Internal; the school row is locked.
create or replace function public.take_seat(sid uuid, uid uuid, seat_role text)
returns text language plpgsql security definer set search_path = '' as $$
declare
  school public.schools;
begin
  select * into school from public.schools where id = sid for update;
  if not found or school.status <> 'active' or (school.paid_until is not null and school.paid_until <= now()) then return 'ended'; end if;
  if exists (select 1 from public.school_members where user_id = uid) then return 'alreadyMember'; end if;
  if (select count(*) from public.school_members where school_id = sid) >= school.seats then return 'full'; end if;
  insert into public.school_members (user_id, school_id, role) values (uid, sid, seat_role);
  delete from public.school_invites i where i.school_id = sid and i.email = (select lower(u.email) from auth.users u where u.id = uid);
  return 'ok';
end;
$$;
revoke execute on function public.take_seat(uuid, uuid, text) from public, anon, authenticated;

-- "Join with a code": 'ok', 'invalid', 'full', 'ended' or 'alreadyMember'.
create or replace function public.join_school(code text)
returns text language plpgsql security definer set search_path = '' as $$
declare
  me uuid := auth.uid();
  sid uuid;
begin
  if me is null then raise exception 'Sign in required' using errcode = '42501'; end if;
  select s.id into sid from public.schools s where s.join_code = upper(regexp_replace(coalesce(code, ''), '[^A-Za-z0-9]', '', 'g'));
  if sid is null then return 'invalid'; end if;
  return public.take_seat(sid, me, 'teacher');
end;
$$;
revoke execute on function public.join_school(text) from public, anon;
grant execute on function public.join_school(text) to authenticated;

-- Accept an invitation sent to MY email address.
create or replace function public.accept_school_invite(invite uuid)
returns text language plpgsql security definer set search_path = '' as $$
declare
  me uuid := auth.uid();
  found_invite public.school_invites;
begin
  if me is null then raise exception 'Sign in required' using errcode = '42501'; end if;
  select * into found_invite from public.school_invites i where i.id = invite and i.email = public.my_email();
  if not found then return 'invalid'; end if;
  return public.take_seat(found_invite.school_id, me, found_invite.role);
end;
$$;
revoke execute on function public.accept_school_invite(uuid) from public, anon;
grant execute on function public.accept_school_invite(uuid) to authenticated;

create or replace function public.decline_school_invite(invite uuid)
returns text language sql security definer set search_path = '' as $$
  with gone as (delete from public.school_invites i where i.id = invite and i.email = public.my_email() returning 1)
  select case when exists (select 1 from gone) then 'ok' else 'invalid' end;
$$;
revoke execute on function public.decline_school_invite(uuid) from public, anon;
grant execute on function public.decline_school_invite(uuid) to authenticated;

-- Leave my school. The last school admin can't leave while other teachers remain.
create or replace function public.leave_school()
returns text language plpgsql security definer set search_path = '' as $$
declare
  me uuid := auth.uid();
  seat public.school_members;
begin
  select * into seat from public.school_members where user_id = me;
  if not found then return 'invalid'; end if;
  perform 1 from public.schools where id = seat.school_id for update;
  if seat.role = 'admin'
    and not exists (select 1 from public.school_members m where m.school_id = seat.school_id and m.role = 'admin' and m.user_id <> me)
    and exists (select 1 from public.school_members m where m.school_id = seat.school_id and m.user_id <> me) then
    return 'lastAdmin';
  end if;
  delete from public.school_members where user_id = me;
  return 'ok';
end;
$$;
revoke execute on function public.leave_school() from public, anon;
grant execute on function public.leave_school() to authenticated;

-- ---- For school admins ----

-- The school I manage (admins of an ENDED school may still look and tidy up). Internal.
create or replace function public.my_managed_school()
returns uuid language plpgsql stable security definer set search_path = '' as $$
declare
  sid uuid;
begin
  select m.school_id into sid from public.school_members m where m.user_id = auth.uid() and m.role = 'admin';
  if sid is null then raise exception 'School admins only' using errcode = '42501'; end if;
  return sid;
end;
$$;
revoke execute on function public.my_managed_school() from public, anon, authenticated;

-- Seats, the join code, teachers and pending invitations.
create or replace function public.school_overview()
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  sid uuid := public.my_managed_school();
begin
  return (select jsonb_build_object(
    'school', jsonb_build_object('id', s.id, 'name', s.name, 'city', s.city, 'seats', s.seats, 'status', s.status,
      'paid_until', s.paid_until, 'join_code', s.join_code,
      'active', s.status = 'active' and (s.paid_until is null or s.paid_until > now())),
    'used', (select count(*) from public.school_members m where m.school_id = sid),
    'members', coalesce((select jsonb_agg(jsonb_build_object('user_id', m.user_id, 'name', coalesce(p.full_name, ''),
        'email', coalesce(u.email, ''), 'role', m.role, 'department', m.department, 'joined_at', m.joined_at)
        order by m.role, lower(coalesce(p.full_name, u.email)))
      from public.school_members m join auth.users u on u.id = m.user_id left join public.profiles p on p.id = m.user_id
      where m.school_id = sid), '[]'::jsonb),
    'invites', coalesce((select jsonb_agg(jsonb_build_object('id', i.id, 'email', i.email, 'role', i.role, 'created_at', i.created_at)
        order by i.created_at desc) from public.school_invites i where i.school_id = sid), '[]'::jsonb))
  from public.schools s where s.id = sid);
end;
$$;
revoke execute on function public.school_overview() from public, anon;
grant execute on function public.school_overview() to authenticated;

-- Invite a teacher by email. { result, invite_id, school, inviter } — result:
-- 'ok', 'invalid', 'alreadyMember' or 'tooMany' (at most twice the seats pending).
create or replace function public.school_invite(invite_email text, invite_role text default 'teacher')
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  sid uuid := public.my_managed_school();
  address text := lower(btrim(coalesce(invite_email, '')));
  school public.schools;
  invite_id uuid;
begin
  select * into school from public.schools where id = sid for update;
  if address !~ '^[^\s@]+@[^\s@]+\.[^\s@]+$' or char_length(address) > 254 or invite_role not in ('admin', 'teacher') then
    return jsonb_build_object('result', 'invalid');
  end if;
  if exists (select 1 from public.school_members m join auth.users u on u.id = m.user_id
             where m.school_id = sid and lower(u.email) = address) then
    return jsonb_build_object('result', 'alreadyMember');
  end if;
  if not exists (select 1 from public.school_invites i where i.school_id = sid and i.email = address)
    and (select count(*) from public.school_invites i where i.school_id = sid) >= school.seats * 2 then
    return jsonb_build_object('result', 'tooMany');
  end if;
  insert into public.school_invites (school_id, email, role, invited_by)
  values (sid, address, invite_role, auth.uid())
  on conflict (school_id, email) do update set role = excluded.role, invited_by = excluded.invited_by
  returning id into invite_id;
  return jsonb_build_object('result', 'ok', 'invite_id', invite_id, 'email', address, 'school', school.name,
    'inviter', coalesce((select p.full_name from public.profiles p where p.id = auth.uid()), ''));
end;
$$;
revoke execute on function public.school_invite(text, text) from public, anon;
grant execute on function public.school_invite(text, text) to authenticated;

create or replace function public.school_cancel_invite(invite uuid)
returns text language plpgsql security definer set search_path = '' as $$
declare
  sid uuid := public.my_managed_school();
begin
  delete from public.school_invites i where i.id = invite and i.school_id = sid;
  return case when found then 'ok' else 'invalid' end;
end;
$$;
revoke execute on function public.school_cancel_invite(uuid) from public, anon;
grant execute on function public.school_cancel_invite(uuid) to authenticated;

-- Remove a teacher (not myself: use leave_school). Their tests stay theirs.
create or replace function public.school_remove_member(member uuid)
returns text language plpgsql security definer set search_path = '' as $$
declare
  sid uuid := public.my_managed_school();
begin
  if member = auth.uid() then return 'self'; end if;
  delete from public.school_members m where m.user_id = member and m.school_id = sid;
  return case when found then 'ok' else 'invalid' end;
end;
$$;
revoke execute on function public.school_remove_member(uuid) from public, anon;
grant execute on function public.school_remove_member(uuid) to authenticated;

-- Change a teacher's role or department. A school always keeps one admin.
create or replace function public.school_set_member(member uuid, new_role text, new_department text)
returns text language plpgsql security definer set search_path = '' as $$
declare
  sid uuid := public.my_managed_school();
  seat public.school_members;
begin
  perform 1 from public.schools where id = sid for update;
  select * into seat from public.school_members m where m.user_id = member and m.school_id = sid;
  if not found or new_role not in ('admin', 'teacher') or char_length(coalesce(new_department, '')) > 80 then return 'invalid'; end if;
  if seat.role = 'admin' and new_role = 'teacher'
    and not exists (select 1 from public.school_members m where m.school_id = sid and m.role = 'admin' and m.user_id <> member) then
    return 'lastAdmin';
  end if;
  update public.school_members set role = new_role, department = btrim(coalesce(new_department, '')) where user_id = member;
  return 'ok';
end;
$$;
revoke execute on function public.school_set_member(uuid, text, text) from public, anon;
grant execute on function public.school_set_member(uuid, text, text) to authenticated;

-- A new join code (the old one stops working at once).
create or replace function public.school_new_code()
returns text language plpgsql security definer set search_path = '' as $$
declare
  sid uuid := public.my_managed_school();
  code text;
begin
  loop
    code := public.new_join_code();
    exit when not exists (select 1 from public.schools where join_code = code);
  end loop;
  update public.schools set join_code = code, updated_at = now() where id = sid;
  return code;
end;
$$;
revoke execute on function public.school_new_code() from public, anon;
grant execute on function public.school_new_code() to authenticated;

-- Usage per teacher: NUMBERS only (how many tests, AI generations this month,
-- picture space) — never titles or contents.
create or replace function public.school_usage()
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  sid uuid := public.my_managed_school();
begin
  return coalesce((select jsonb_agg(jsonb_build_object(
      'user_id', m.user_id,
      'name', coalesce(p.full_name, ''),
      'email', coalesce(u.email, ''),
      'department', m.department,
      'tests', (select count(*) from public.tests t where t.user_id = m.user_id),
      'tests_30d', (select count(*) from public.tests t where t.user_id = m.user_id and t.updated_at > now() - interval '30 days'),
      'ai_month', (select count(*) from public.ai_usage a where a.user_id = m.user_id and a.status <> 'failed' and a.created_at >= public.ai_month_start()),
      'storage_bytes', public.image_storage_used(m.user_id),
      'bank', (select count(*) from public.school_bank_questions b where b.school_id = sid and b.user_id = m.user_id))
      order by lower(coalesce(p.full_name, u.email)))
    from public.school_members m join auth.users u on u.id = m.user_id left join public.profiles p on p.id = m.user_id
    where m.school_id = sid), '[]'::jsonb);
end;
$$;

-- ---------------------------------------------------------------------
-- 3. The school's shared question bank (per subject / department)
-- ---------------------------------------------------------------------
create table if not exists public.school_bank_questions (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools (id) on delete cascade,
  -- The author; the question stays with the school when they leave.
  user_id uuid references auth.users (id) on delete set null,
  author_name text not null default '' check (char_length(author_name) <= 200),
  subject text not null check (char_length(subject) between 1 and 40),
  department text not null default '' check (char_length(department) <= 80),
  grade text not null default '' check (char_length(grade) <= 40),
  type text not null check (char_length(type) between 1 and 40),
  tags text[] not null default '{}' check (cardinality(tags) <= 12 and pg_column_size(tags) < 1000),
  summary text not null default '' check (char_length(summary) <= 300),
  data jsonb not null check (pg_column_size(data) < 300000),
  created_at timestamptz not null default now()
);
create index if not exists school_bank_school on public.school_bank_questions (school_id, created_at desc);
alter table public.school_bank_questions enable row level security;
revoke all on public.school_bank_questions from public, anon, authenticated;

-- The questions of my school (needs a seat in an ACTIVE school with the sharedBank feature).
create or replace function public.school_bank_list()
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  me uuid := auth.uid();
  sid uuid := public.active_school_of(me);
begin
  if sid is null or not public.plan_has_feature(me, 'sharedBank') then return '[]'::jsonb; end if;
  return coalesce((select jsonb_agg(jsonb_build_object('id', b.id, 'user_id', b.user_id, 'author_name', b.author_name,
      'subject', b.subject, 'department', b.department, 'grade', b.grade, 'type', b.type, 'tags', b.tags,
      'data', b.data, 'created_at', b.created_at, 'mine', b.user_id = me) order by b.created_at desc)
    from (select * from public.school_bank_questions where school_id = sid order by created_at desc limit 3000) b), '[]'::jsonb);
end;
$$;
revoke execute on function public.school_bank_list() from public, anon;
grant execute on function public.school_bank_list() to authenticated;

-- Share one question with my school. Returns the new id, or an error.
create or replace function public.school_bank_add(subject text, department text, grade text, question_type text, tags text[], summary text, data jsonb)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  me uuid := auth.uid();
  sid uuid := public.active_school_of(me);
  new_id uuid;
begin
  if sid is null or not public.plan_has_feature(me, 'sharedBank') then
    raise exception 'A School plan is required' using errcode = '42501';
  end if;
  perform 1 from public.schools where id = sid for update;
  if (select count(*) from public.school_bank_questions b where b.school_id = sid) >= 5000 then
    raise exception 'The school bank is full' using errcode = '54000';
  end if;
  insert into public.school_bank_questions (school_id, user_id, author_name, subject, department, grade, type, tags, summary, data)
  values (sid, me, coalesce((select p.full_name from public.profiles p where p.id = me), ''), school_bank_add.subject,
    btrim(coalesce(school_bank_add.department, '')), btrim(coalesce(school_bank_add.grade, '')), question_type,
    coalesce(school_bank_add.tags, '{}'), left(coalesce(school_bank_add.summary, ''), 300), school_bank_add.data)
  returning id into new_id;
  return new_id;
end;
$$;
revoke execute on function public.school_bank_add(text, text, text, text, text[], text, jsonb) from public, anon;
grant execute on function public.school_bank_add(text, text, text, text, text[], text, jsonb) to authenticated;

-- The author, or the school's admin, takes a question out.
create or replace function public.school_bank_remove(question uuid)
returns text language plpgsql security definer set search_path = '' as $$
declare
  me uuid := auth.uid();
begin
  delete from public.school_bank_questions b
  where b.id = question
    and b.school_id = (select m.school_id from public.school_members m where m.user_id = me)
    and (b.user_id = me or exists (select 1 from public.school_members m where m.user_id = me and m.role = 'admin'));
  return case when found then 'ok' else 'invalid' end;
end;
$$;
revoke execute on function public.school_bank_remove(uuid) from public, anon;
grant execute on function public.school_bank_remove(uuid) to authenticated;

-- usage needs the bank table (defined above); grant it now.
revoke execute on function public.school_usage() from public, anon;
grant execute on function public.school_usage() to authenticated;

-- Pictures in shared school questions live in the author's folder; colleagues
-- of the same ACTIVE school may read them (only pictures those questions use).
create or replace function public.picture_in_school_bank(object_name text)
returns boolean language plpgsql stable security definer set search_path = '' as $$
declare
  folder text := split_part(object_name, '/', 1);
  picture text := split_part(object_name, '/', 2);
  sid uuid := public.active_school_of(auth.uid());
begin
  if sid is null or folder !~ '^[0-9a-fA-F-]{36}$' or char_length(picture) < 8 then return false; end if;
  return exists (select 1 from public.school_bank_questions b
    where b.school_id = sid and b.user_id = folder::uuid and position(picture in b.data::text) > 0);
end;
$$;
revoke execute on function public.picture_in_school_bank(text) from public, anon;
grant execute on function public.picture_in_school_bank(text) to authenticated;

drop policy if exists "Pictures of the school bank can be read" on storage.objects;
create policy "Pictures of the school bank can be read" on storage.objects
  for select to authenticated
  using (bucket_id = 'images' and public.picture_in_school_bank(name));

-- ---------------------------------------------------------------------
-- 4. The founders' admin page
-- ---------------------------------------------------------------------
-- Numbers for the top of the page.
create or replace function public.admin_overview()
returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
  perform public.require_admin();
  return jsonb_build_object(
    'users', (select count(*) from auth.users),
    'new_30d', (select count(*) from auth.users u where u.created_at > now() - interval '30 days'),
    'trials', (select count(*) from public.subscriptions s where s.status = 'trialing' and s.trial_ends_at > now()),
    'paying', (select count(*) from public.subscriptions s where s.plan <> 'free' and s.status in ('active', 'past_due')
               and s.provider is distinct from 'manual'),
    'gifted', (select count(*) from public.subscriptions s where s.plan <> 'free' and s.provider = 'manual'
               and (s.current_period_end is null or s.current_period_end > now())),
    'schools', (select count(*) from public.schools s where s.status = 'active' and (s.paid_until is null or s.paid_until > now())),
    'seats', (select coalesce(sum(s.seats), 0) from public.schools s where s.status = 'active'),
    'seats_used', (select count(*) from public.school_members m join public.schools s on s.id = m.school_id where s.status = 'active'),
    'revenue_month_tetri', (select coalesce(sum(p.amount_tetri), 0) from public.payments p
               where p.status = 'paid' and p.paid_at >= date_trunc('month', now() at time zone 'Asia/Tbilisi') at time zone 'Asia/Tbilisi'),
    'failed_30d', (select count(*) from public.payments p where p.status = 'failed' and p.created_at > now() - interval '30 days'),
    'ai_month', (select count(*) from public.ai_usage a where a.status <> 'failed' and a.created_at >= public.ai_month_start()),
    'open_requests', (select count(*) from public.school_requests r where r.status in ('new', 'contacted'))
  );
end;
$$;

-- Users, newest first, with their plan. kind: all / trial / paying / gifted / free / school / grace.
create or replace function public.admin_users(search text default '', kind text default 'all', page int default 0)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  term text := lower(btrim(coalesce(search, '')));
begin
  perform public.require_admin();
  return coalesce((select jsonb_agg(row_to_json(x)) from (
    select u.id, u.email, coalesce(p.full_name, '') as name, u.created_at,
      s.plan, s.status, s.trial_ends_at, s.current_period_end, s.grace_ends_at, s.cancel_at_period_end, s.provider,
      public.plan_of(u.id) as plan_now, sc.name as school, m.role as school_role
    from auth.users u
    left join public.profiles p on p.id = u.id
    left join public.subscriptions s on s.user_id = u.id
    left join public.school_members m on m.user_id = u.id
    left join public.schools sc on sc.id = m.school_id
    where (term = '' or lower(u.email) like '%' || term || '%' or lower(coalesce(p.full_name, '')) like '%' || term || '%')
      and case coalesce(kind, 'all')
        when 'trial' then s.status = 'trialing' and s.trial_ends_at > now()
        when 'paying' then s.plan <> 'free' and s.status in ('active', 'past_due') and s.provider is distinct from 'manual'
        when 'gifted' then s.plan <> 'free' and s.provider = 'manual'
        when 'school' then m.user_id is not null
        when 'grace' then s.status = 'past_due'
        when 'free' then public.plan_of(u.id) = 'free'
        else true end
    order by u.created_at desc
    limit 50 offset greatest(coalesce(page, 0), 0) * 50) x), '[]'::jsonb);
end;
$$;

-- Money per month (Tbilisi time), last 24 months.
create or replace function public.admin_revenue()
returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
  perform public.require_admin();
  return coalesce((select jsonb_agg(row_to_json(x) order by x.month desc) from (
    select to_char(date_trunc('month', coalesce(p.paid_at, p.created_at) at time zone 'Asia/Tbilisi'), 'YYYY-MM') as month,
      coalesce(sum(p.amount_tetri) filter (where p.status in ('paid', 'refunded')), 0) as paid_tetri,
      coalesce(sum(p.amount_tetri) filter (where p.status = 'refunded'), 0) as refunded_tetri,
      count(*) filter (where p.status in ('paid', 'refunded')) as payments,
      count(*) filter (where p.status = 'failed') as failed,
      count(*) filter (where p.status in ('paid', 'refunded') and p.kind = 'checkout') as new_subscriptions
    from public.payments p
    where p.status <> 'pending' and coalesce(p.paid_at, p.created_at) > now() - interval '24 months'
    group by 1) x), '[]'::jsonb);
end;
$$;

create or replace function public.admin_failed_payments()
returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
  perform public.require_admin();
  return coalesce((select jsonb_agg(row_to_json(x)) from (
    select p.id, p.created_at, p.kind, p.billing_period, p.amount_tetri, p.failure_reason, p.provider, u.email,
      s.status as subscription_status, s.grace_ends_at
    from public.payments p
    left join auth.users u on u.id = p.user_id
    left join public.subscriptions s on s.user_id = p.user_id
    where p.status = 'failed'
    order by p.created_at desc limit 100) x), '[]'::jsonb);
end;
$$;

-- AI use per month (counts and tokens only) and this month's heaviest users.
create or replace function public.admin_ai_usage()
returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
  perform public.require_admin();
  return jsonb_build_object(
    'months', coalesce((select jsonb_agg(row_to_json(x) order by x.month desc) from (
      select to_char(date_trunc('month', a.created_at at time zone 'Asia/Tbilisi'), 'YYYY-MM') as month,
        count(*) filter (where a.status <> 'failed') as generations,
        count(*) filter (where a.status = 'failed') as failed,
        coalesce(sum(a.question_count) filter (where a.status <> 'failed'), 0) as questions,
        coalesce(sum(a.input_tokens), 0) as input_tokens, coalesce(sum(a.output_tokens), 0) as output_tokens,
        count(*) filter (where a.mock) as mock
      from public.ai_usage a where a.created_at > now() - interval '12 months' group by 1) x), '[]'::jsonb),
    'top', coalesce((select jsonb_agg(row_to_json(x)) from (
      select u.email, public.plan_of(a.user_id) as plan, count(*) as generations
      from public.ai_usage a join auth.users u on u.id = a.user_id
      where a.status <> 'failed' and a.created_at >= public.ai_month_start()
      group by u.email, a.user_id order by count(*) desc limit 20) x), '[]'::jsonb));
end;
$$;

create or replace function public.admin_school_requests()
returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
  perform public.require_admin();
  return coalesce((select jsonb_agg(row_to_json(x)) from (
    select r.id, r.created_at, r.updated_at, r.contact_name, r.school_name, r.city, r.teachers, r.email, r.phone,
      r.message, r.language, r.status, r.note, r.school_id
    from public.school_requests r
    order by case r.status when 'new' then 0 when 'contacted' then 1 else 2 end, r.created_at desc limit 300) x), '[]'::jsonb);
end;
$$;

-- new → contacted → won / lost (any order: founders fix mistakes too).
create or replace function public.admin_set_request(request bigint, new_status text, new_note text)
returns text language plpgsql security definer set search_path = '' as $$
declare
  me uuid := public.require_admin();
  old public.school_requests;
begin
  if new_status not in ('new', 'contacted', 'won', 'lost') or char_length(coalesce(new_note, '')) > 1000 then return 'invalid'; end if;
  select * into old from public.school_requests where id = request for update;
  if not found then return 'invalid'; end if;
  update public.school_requests set status = new_status, note = coalesce(new_note, ''), updated_at = now() where id = request;
  perform public.admin_note(me, 'request.status', request::text, coalesce(new_note, ''),
    jsonb_build_object('from', old.status, 'to', new_status));
  return 'ok';
end;
$$;

create or replace function public.admin_schools()
returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
  perform public.require_admin();
  return coalesce((select jsonb_agg(row_to_json(x)) from (
    select s.id, s.name, s.city, s.seats, s.status, s.paid_until, s.note, s.created_at, s.request_id,
      s.status = 'active' and (s.paid_until is null or s.paid_until > now()) as active,
      (select count(*) from public.school_members m where m.school_id = s.id) as used,
      (select count(*) from public.school_invites i where i.school_id = s.id) as invites,
      (select coalesce(jsonb_agg(u.email), '[]'::jsonb) from public.school_members m join auth.users u on u.id = m.user_id
        where m.school_id = s.id and m.role = 'admin') as admins
    from public.schools s order by s.created_at desc limit 500) x), '[]'::jsonb);
end;
$$;

-- A school paid by invoice: created by a founder. Its first admin is the
-- teacher with `admin_email` (added at once if they have an account and no
-- other school; otherwise invited). Returns { school_id, admin: 'member' | 'invited' }.
create or replace function public.admin_create_school(school_name text, city text, seats int, paid_until timestamptz,
  admin_email text, request bigint, reason text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  me uuid := public.require_admin();
  why text := public.require_reason(reason);
  address text := lower(btrim(coalesce(admin_email, '')));
  sid uuid;
  teacher uuid;
  how text := 'invited';
begin
  if char_length(btrim(coalesce(school_name, ''))) = 0 or seats is null or seats < 1 or seats > 5000
    or address !~ '^[^\s@]+@[^\s@]+\.[^\s@]+$' then
    raise exception 'Invalid school details' using errcode = '22023';
  end if;
  insert into public.schools (name, city, seats, paid_until, request_id, note)
  values (btrim(school_name), btrim(coalesce(city, '')), seats, paid_until, request, why)
  returning id into sid;
  select u.id into teacher from auth.users u where lower(u.email) = address;
  if teacher is not null and public.take_seat(sid, teacher, 'admin') = 'ok' then
    how := 'member';
  else
    insert into public.school_invites (school_id, email, role, invited_by) values (sid, address, 'admin', me);
  end if;
  if request is not null then
    update public.school_requests set status = 'won', school_id = sid, updated_at = now() where id = request;
  end if;
  perform public.admin_note(me, 'school.create', sid::text, why,
    jsonb_build_object('name', school_name, 'seats', seats, 'paid_until', paid_until, 'admin', address, 'request', request));
  return jsonb_build_object('school_id', sid, 'admin', how);
end;
$$;

-- Seats, paid-until date, active / ended. Seats can't go below the teachers already in.
create or replace function public.admin_update_school(school uuid, seats int, paid_until timestamptz, new_status text, reason text)
returns text language plpgsql security definer set search_path = '' as $$
declare
  me uuid := public.require_admin();
  why text := public.require_reason(reason);
  old public.schools;
begin
  select * into old from public.schools s where s.id = school for update;
  if not found or seats is null or seats < 1 or seats > 5000 or new_status not in ('active', 'ended') then return 'invalid'; end if;
  if seats < (select count(*) from public.school_members m where m.school_id = school) then return 'seatsInUse'; end if;
  update public.schools s set seats = admin_update_school.seats, paid_until = admin_update_school.paid_until,
    status = new_status, updated_at = now() where s.id = school;
  perform public.admin_note(me, 'school.update', school::text, why, jsonb_build_object(
    'seats', jsonb_build_array(old.seats, seats), 'paid_until', jsonb_build_array(old.paid_until, paid_until),
    'status', jsonb_build_array(old.status, new_status)));
  return 'ok';
end;
$$;

-- Manual plan changes: plan 'premium' (a gift until `ends_at`, null = no end)
-- or 'free' (back to Free now). Written to subscription_changes AND admin_log.
create or replace function public.admin_set_plan(uid uuid, new_plan text, ends_at timestamptz, reason text)
returns text language plpgsql security definer set search_path = '' as $$
declare
  me uuid := public.require_admin();
  why text := public.require_reason(reason);
  old public.subscriptions;
begin
  if new_plan not in ('premium', 'free') or (ends_at is not null and ends_at <= now()) then return 'invalid'; end if;
  if not exists (select 1 from auth.users u where u.id = uid) then return 'invalid'; end if;
  insert into public.subscriptions (user_id) values (uid) on conflict (user_id) do nothing;
  select * into old from public.subscriptions where user_id = uid for update;
  if new_plan = 'premium' then
    update public.subscriptions set plan = 'premium', status = 'active', provider = 'manual', billing_period = null,
      current_period_start = now(), current_period_end = ends_at, grace_ends_at = null, cancel_at_period_end = false,
      renewal_attempts = 0, next_retry_at = null, updated_at = now(),
      changed_by = 'admin:' || me::text, changed_reason = why, changed_at = null
    where user_id = uid;
  else
    update public.subscriptions set plan = 'free', status = 'expired', current_period_end = now(), grace_ends_at = null,
      cancel_at_period_end = false, next_retry_at = null, updated_at = now(),
      changed_by = 'admin:' || me::text, changed_reason = why, changed_at = null
    where user_id = uid;
  end if;
  perform public.admin_note(me, 'plan.set', uid::text, why, jsonb_build_object(
    'from', jsonb_build_object('plan', old.plan, 'status', old.status, 'period_end', old.current_period_end),
    'to', jsonb_build_object('plan', new_plan, 'period_end', ends_at)));
  return 'ok';
end;
$$;

-- Give a trial `days` more days (also restarts an ended trial). Not for paying teachers.
create or replace function public.admin_extend_trial(uid uuid, days int, reason text)
returns text language plpgsql security definer set search_path = '' as $$
declare
  me uuid := public.require_admin();
  why text := public.require_reason(reason);
  old public.subscriptions;
  new_end timestamptz;
begin
  if days is null or days < 1 or days > 120 or not exists (select 1 from auth.users u where u.id = uid) then return 'invalid'; end if;
  insert into public.subscriptions (user_id) values (uid) on conflict (user_id) do nothing;
  select * into old from public.subscriptions where user_id = uid for update;
  if old.plan <> 'free' and old.status in ('active', 'past_due') then return 'paying'; end if;
  new_end := greatest(coalesce(old.trial_ends_at, now()), now()) + make_interval(days => days);
  update public.subscriptions set status = 'trialing', plan = (select ps.trial_plan from public.plan_settings ps where ps.id = 1),
    trial_ends_at = new_end, updated_at = now(),
    changed_by = 'admin:' || me::text, changed_reason = why, changed_at = null
  where user_id = uid;
  perform public.admin_note(me, 'trial.extend', uid::text, why,
    jsonb_build_object('days', days, 'from', old.trial_ends_at, 'to', new_end));
  return 'ok';
end;
$$;

create or replace function public.admin_log_list()
returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
  perform public.require_admin();
  return coalesce((select jsonb_agg(row_to_json(x)) from (
    select l.id, l.created_at, l.action, l.target, l.reason, l.details, u.email as admin_email
    from public.admin_log l left join auth.users u on u.id = l.admin_id
    order by l.id desc limit 200) x), '[]'::jsonb);
end;
$$;

-- Callable by signed-in users through the public API; each one refuses everyone but founders.
revoke execute on function public.admin_overview() from public, anon;
revoke execute on function public.admin_users(text, text, int) from public, anon;
revoke execute on function public.admin_revenue() from public, anon;
revoke execute on function public.admin_failed_payments() from public, anon;
revoke execute on function public.admin_ai_usage() from public, anon;
revoke execute on function public.admin_school_requests() from public, anon;
revoke execute on function public.admin_set_request(bigint, text, text) from public, anon;
revoke execute on function public.admin_schools() from public, anon;
revoke execute on function public.admin_create_school(text, text, int, timestamptz, text, bigint, text) from public, anon;
revoke execute on function public.admin_update_school(uuid, int, timestamptz, text, text) from public, anon;
revoke execute on function public.admin_set_plan(uuid, text, timestamptz, text) from public, anon;
revoke execute on function public.admin_extend_trial(uuid, int, text) from public, anon;
revoke execute on function public.admin_log_list() from public, anon;
grant execute on function public.admin_overview() to authenticated;
grant execute on function public.admin_users(text, text, int) to authenticated;
grant execute on function public.admin_revenue() to authenticated;
grant execute on function public.admin_failed_payments() to authenticated;
grant execute on function public.admin_ai_usage() to authenticated;
grant execute on function public.admin_school_requests() to authenticated;
grant execute on function public.admin_set_request(bigint, text, text) to authenticated;
grant execute on function public.admin_schools() to authenticated;
grant execute on function public.admin_create_school(text, text, int, timestamptz, text, bigint, text) to authenticated;
grant execute on function public.admin_update_school(uuid, int, timestamptz, text, text) to authenticated;
grant execute on function public.admin_set_plan(uuid, text, timestamptz, text) to authenticated;
grant execute on function public.admin_extend_trial(uuid, int, text) to authenticated;
grant execute on function public.admin_log_list() to authenticated;

commit;
-- Teacher trial: every teacher may edit tests in EVERY subject.
-- Apply after 20261121_schools.sql. Safe to rerun; nothing is deleted.
--
-- * Teachers still choose the subject(s) they teach once (teacher_subjects,
--   set_teaching_subjects): until they have an active choice nothing is
--   editable, exactly as before.
-- * With the switch on, that choice no longer locks the other subjects: the
--   teacher may create, change and add pictures to their own tests in any
--   subject. The app has the same switch (OPEN_FOR_TESTING in
--   src/lib/hiddenForTesting.ts) — change both together.
-- * To bring back the strict rule (only the chosen subjects are editable):
--     update public.app_switches set enabled = false where name = 'all_subjects_editable';
begin;

-- Small on/off switches for the whole site. Nobody reads them from the browser.
create table if not exists public.app_switches (
  name text primary key,
  enabled boolean not null default false
);
alter table public.app_switches enable row level security;
revoke all on public.app_switches from anon, authenticated;
insert into public.app_switches (name, enabled) values ('all_subjects_editable', true)
  on conflict (name) do nothing;

create or replace function public.app_switch_on(switch_name text)
returns boolean language sql stable security definer set search_path = '' as $$
  select coalesce((select enabled from public.app_switches where name = switch_name), false);
$$;
revoke execute on function public.app_switch_on(text) from public, anon, authenticated;

-- The app asks this before letting a teacher edit other subjects, so it never
-- offers editing that the database would refuse (this file not applied = off).
create or replace function public.all_subjects_editable()
returns boolean language sql stable security definer set search_path = '' as $$
  select public.app_switch_on('all_subjects_editable');
$$;
revoke execute on function public.all_subjects_editable() from public, anon;
grant execute on function public.all_subjects_editable() to authenticated;

-- Has this teacher an active subject choice? (Free: exactly one; Premium/School: any.)
-- Mirrors activeTeachingSubjects in src/lib/auth/teachingSubjects.ts.
create or replace function public.has_active_teaching_subjects(uid uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select coalesce((select cardinality(s.subjects) = 1 or (cardinality(s.subjects) > 1 and public.has_multiple_subjects(uid))
    from public.teacher_subjects s where s.user_id = uid), false);
$$;
revoke execute on function public.has_active_teaching_subjects(uuid) from public, anon, authenticated;

create or replace function public.can_edit_test_subject(doc jsonb)
returns boolean language sql stable security definer set search_path = '' as $$
  select public.may_teach_subject((select auth.uid()), public.test_teaching_subject(doc))
    or (public.app_switch_on('all_subjects_editable') and public.has_active_teaching_subjects((select auth.uid())));
$$;
revoke execute on function public.can_edit_test_subject(jsonb) from public, anon;
grant execute on function public.can_edit_test_subject(jsonb) to authenticated;

-- Pictures follow the same rule as the tests that use them.
create or replace function public.can_write_teaching_picture(object_name text)
returns boolean language sql stable security definer set search_path = '' as $$
  select (storage.foldername(object_name))[1] = (select auth.uid())::text
    and not exists (
      select 1 from public.tests t
      where t.user_id = (select auth.uid())
        and not public.can_edit_test_subject(t.data)
        and jsonb_path_exists(t.data, '$.**.imageId ? (@ == $picture)',
          jsonb_build_object('picture', split_part(object_name, '/', 2)))
    );
$$;
revoke execute on function public.can_write_teaching_picture(text) from public, anon;
grant execute on function public.can_write_teaching_picture(text) to authenticated;

commit;
