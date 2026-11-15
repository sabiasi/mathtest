
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
