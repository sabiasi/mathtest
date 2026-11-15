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
