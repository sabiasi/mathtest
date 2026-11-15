
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
