
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
