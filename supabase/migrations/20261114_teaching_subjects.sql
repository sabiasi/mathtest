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
