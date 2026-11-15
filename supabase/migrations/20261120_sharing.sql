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
