/**
 * "Entitlements": what one user may do RIGHT NOW, worked out from their
 * subscription (the `subscriptions` row in the database) and today's date.
 *
 *   no account (guest) ............................. Free
 *   trial, not ended yet ........................... Premium (TRIAL_PLAN)
 *   paid, renewal date not reached ................. their plan
 *   paid, renewal failed / late, within GRACE_DAYS . their plan ("grace")
 *   cancelled, but the paid time isn't over yet .... their plan ("ending")
 *   everything else ................................ Free
 *
 * Nothing is ever deleted when a plan ends: only Premium features lock.
 *
 * The database has the same rules in SQL (`public.plan_of` in
 * supabase/schema.sql), for limits it checks itself. Change both together.
 */
import { FEATURES, GRACE_DAYS, PLANS, TRIAL_PLAN, type Feature, type PlanId, type PlanLimits } from "./plans";

export const SUBSCRIPTION_STATUSES = ["trialing", "active", "past_due", "canceled", "expired"] as const;
export type SubscriptionStatus = (typeof SUBSCRIPTION_STATUSES)[number];

/** One user's row in the `subscriptions` table (dates as ISO strings). */
export type Subscription = {
  plan: PlanId;
  status: SubscriptionStatus;
  trialEndsAt: string | null;
  /** End of the paid time. null = no end (e.g. a gift or an invoice set up by hand). */
  currentPeriodEnd: string | null;
  /** Set when a renewal payment failed: the plan works until then. */
  graceEndsAt: string | null;
  /** The teacher cancelled: no renewal, the plan ends at currentPeriodEnd. */
  cancelAtPeriodEnd: boolean;
};

/**
 * - guest: no account
 * - free: an account on the Free plan
 * - trial: the free Premium trial
 * - active: paid (or given) and renewing
 * - ending: cancelled, still running until `endsAt`
 * - grace: a payment failed, still running until `endsAt`
 */
export type PlanState = "guest" | "free" | "trial" | "active" | "ending" | "grace";

export type Entitlements = {
  /** The plan that applies now (not necessarily the one paid for). */
  plan: PlanId;
  state: PlanState;
  limits: PlanLimits;
  features: Record<Feature, boolean>;
  /** Trial only: full days left (1 on the last day). */
  trialDaysLeft: number | null;
  /** When the plan renews (active), or ends (trial, ending, grace). ISO string or null. */
  renewsAt: string | null;
  endsAt: string | null;
};

const DAY = 24 * 60 * 60 * 1000;

function build(plan: PlanId, state: PlanState, extra: Partial<Entitlements> = {}): Entitlements {
  const owned = new Set(PLANS[plan].features);
  const features = Object.fromEntries(FEATURES.map((f) => [f, owned.has(f)])) as Record<Feature, boolean>;
  return { plan, state, limits: PLANS[plan].limits, features, trialDaysLeft: null, renewsAt: null, endsAt: null, ...extra };
}

export function guestEntitlements(): Entitlements {
  return build("free", "guest");
}

const time = (iso: string | null) => (iso ? Date.parse(iso) : NaN);

/** What a signed-in user with this subscription (or none) may do at `now`. */
export function entitlementsFor(subscription: Subscription | null, now: Date = new Date()): Entitlements {
  const t = now.getTime();
  if (!subscription) return build("free", "free");
  const { plan, status, trialEndsAt, currentPeriodEnd, graceEndsAt, cancelAtPeriodEnd } = subscription;

  if (status === "trialing") {
    const end = time(trialEndsAt);
    if (t < end) return build(TRIAL_PLAN, "trial", { trialDaysLeft: Math.ceil((end - t) / DAY), endsAt: trialEndsAt });
    return build("free", "free");
  }

  if (plan === "free" || status === "expired") return build("free", "free");

  const periodEnd = time(currentPeriodEnd);
  if (status === "canceled" || cancelAtPeriodEnd) {
    // Paid until the end of the period; no grace after a cancellation.
    if (currentPeriodEnd === null || t < periodEnd) return build(plan, "ending", { endsAt: currentPeriodEnd });
    return build("free", "free");
  }

  // active / past_due
  if (currentPeriodEnd === null) return build(plan, "active");
  if (status === "active" && t < periodEnd) return build(plan, "active", { renewsAt: currentPeriodEnd });
  const graceEnd = graceEndsAt ? time(graceEndsAt) : periodEnd + GRACE_DAYS * DAY;
  if (t < graceEnd) return build(plan, "grace", { endsAt: new Date(graceEnd).toISOString() });
  return build("free", "free");
}

/** How many variants actually print: what the test asks for, at most the plan's limit. */
export function allowedVariantCount(requested: number, entitlements: Entitlements): number {
  return Math.max(1, Math.min(requested, entitlements.limits.maxVariants));
}
