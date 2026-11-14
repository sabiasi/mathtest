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
