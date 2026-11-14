/**
 * Reads a user's row from the `subscriptions` table (browser or server).
 *
 * Row Level Security lets a teacher READ only their own row and never
 * change it: plans change only through the database's own functions
 * (sign-up trial, and later verified payment messages), never from here.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { PLAN_IDS, type PlanId } from "./plans";
import { SUBSCRIPTION_STATUSES, type Subscription, type SubscriptionStatus } from "./entitlements";

const COLUMNS = "plan, status, trial_ends_at, current_period_end, grace_ends_at, cancel_at_period_end";
/** Added by supabase/migrations/20261115_plan_preview.sql (older databases don't have it yet). */
const PREVIEW_COLUMN = "preview_free";

type Row = {
  plan: string;
  status: string;
  trial_ends_at: string | null;
  current_period_end: string | null;
  grace_ends_at: string | null;
  cancel_at_period_end: boolean | null;
  preview_free?: boolean | null;
};

export function subscriptionFromRow(row: Row | null): Subscription | null {
  if (!row) return null;
  return {
    plan: PLAN_IDS.includes(row.plan as PlanId) ? (row.plan as PlanId) : "free",
    status: SUBSCRIPTION_STATUSES.includes(row.status as SubscriptionStatus) ? (row.status as SubscriptionStatus) : "expired",
    trialEndsAt: row.trial_ends_at,
    currentPeriodEnd: row.current_period_end,
    graceEndsAt: row.grace_ends_at,
    cancelAtPeriodEnd: Boolean(row.cancel_at_period_end),
    previewFree: Boolean(row.preview_free),
  };
}

/** The user's subscription, or null if they have none (→ Free). Throws on network/database errors. */
export async function loadSubscription(supabase: SupabaseClient, userId: string): Promise<Subscription | null> {
  const query = (columns: string) => supabase.from("subscriptions").select(columns).eq("user_id", userId).maybeSingle();
  let { data, error } = await query(`${COLUMNS}, ${PREVIEW_COLUMN}`);
  // "undefined column": the plan-preview migration isn't applied yet — read the plan without it.
  if (error?.code === "42703") ({ data, error } = await query(COLUMNS));
  if (error) throw error;
  return subscriptionFromRow(data as unknown as Row | null);
}

/** "View the site as Free" on / off (database function `set_plan_preview`; it can only lower the plan). */
export async function setPlanPreview(supabase: SupabaseClient, free: boolean): Promise<void> {
  const { error } = await supabase.rpc("set_plan_preview", { free });
  if (error) throw error;
}

/** Picture space in the cloud: used and allowed, in bytes (from the database function `my_image_storage`). */
export type ImageStorage = { used: number; limit: number };

export async function loadImageStorage(supabase: SupabaseClient): Promise<ImageStorage> {
  const { data, error } = await supabase.rpc("my_image_storage");
  if (error) throw error;
  const value = data as { used?: number; limit?: number } | null;
  return { used: Number(value?.used ?? 0), limit: Number(value?.limit ?? 0) };
}
