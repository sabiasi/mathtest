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
