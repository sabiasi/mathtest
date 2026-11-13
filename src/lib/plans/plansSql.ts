/**
 * Turns plans.ts into SQL (supabase/plans.sql), so the database checks the
 * same limits as the app. `npm run plans:sql` writes the file; a test fails
 * when plans.ts was changed but the file wasn't regenerated.
 */
import { GRACE_DAYS, PLAN_IDS, PLANS, TRIAL_DAYS, TRIAL_PLAN } from "./plans";

const text = (value: string) => `'${value.replace(/'/g, "''")}'`;

export function plansSql(): string {
  const rows = PLAN_IDS.map((id) => {
    const { limits, features } = PLANS[id];
    const templates = limits.templates === "all" ? "null" : String(limits.templates);
    const featureList = `array[${features.map(text).join(", ")}]::text[]`;
    return `  (${text(id)}, ${limits.maxVariants}, ${limits.aiGenerationsPerMonth}, ${limits.imageStorageMb}, ${templates}, ${featureList})`;
  });
  return `-- =====================================================================
-- GENERATED from src/lib/plans/plans.ts by "npm run plans:sql".
-- Don't edit by hand: change plans.ts, run the command, then paste this
-- file into Supabase → SQL Editor → Run (after schema.sql).
-- =====================================================================

insert into public.plan_limits (plan, max_variants, ai_per_month, image_storage_mb, templates, features)
values
${rows.join(",\n")}
on conflict (plan) do update set
  max_variants = excluded.max_variants,
  ai_per_month = excluded.ai_per_month,
  image_storage_mb = excluded.image_storage_mb,
  templates = excluded.templates,
  features = excluded.features,
  updated_at = now();

insert into public.plan_settings (id, trial_plan, trial_days, grace_days)
values (1, ${text(TRIAL_PLAN)}, ${TRIAL_DAYS}, ${GRACE_DAYS})
on conflict (id) do update set
  trial_plan = excluded.trial_plan,
  trial_days = excluded.trial_days,
  grace_days = excluded.grace_days;
`;
}
