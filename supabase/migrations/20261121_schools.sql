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
