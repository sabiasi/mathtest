
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
