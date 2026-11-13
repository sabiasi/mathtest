-- =====================================================================
-- GENERATED from src/lib/plans/plans.ts by "npm run plans:sql".
-- Don't edit by hand: change plans.ts, run the command, then paste this
-- file into Supabase → SQL Editor → Run (after schema.sql).
-- =====================================================================

insert into public.plan_limits (plan, max_variants, ai_per_month, image_storage_mb, templates, features)
values
  ('free', 2, 3, 50, 5, array[]::text[]),
  ('premium', 6, 100, 1024, null, array['noPdfFooter', 'customHeader', 'allTemplates', 'questionBank', 'docxExport', 'sharing']::text[]),
  ('school', 6, 100, 1024, null, array['noPdfFooter', 'customHeader', 'allTemplates', 'questionBank', 'docxExport', 'sharing', 'schoolAdmin', 'sharedBank']::text[])
on conflict (plan) do update set
  max_variants = excluded.max_variants,
  ai_per_month = excluded.ai_per_month,
  image_storage_mb = excluded.image_storage_mb,
  templates = excluded.templates,
  features = excluded.features,
  updated_at = now();

insert into public.plan_settings (id, trial_plan, trial_days, grace_days)
values (1, 'premium', 14, 7)
on conflict (id) do update set
  trial_plan = excluded.trial_plan,
  trial_days = excluded.trial_days,
  grace_days = excluded.grace_days;
