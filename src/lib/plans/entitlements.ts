/**
 * "Entitlements": what one user may do RIGHT NOW, worked out from their
 * subscription (the `subscriptions` row in the database) and today's date.
 *
 *   no account (guest) ............................. Free
 *   a seat in an active school ..................... School (beats everything below)
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
import { HIDDEN_FOR_TESTING } from "@/lib/hiddenForTesting";
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
  /** "View the site as Free" (Settings → My plan): the real plan is kept, Free applies. */
  previewFree?: boolean;
};

/**
 * A teacher's place in a school (table school_members + schools). The school
 * pays for it: while the school is active the teacher has the School plan.
 */
export type SchoolSeat = {
  schoolId: string;
  name: string;
  /** "admin" = manages the school's seats (not a founder, not a teaching subject). */
  role: "admin" | "teacher";
  department: string;
  status: "active" | "ended";
  /** End of the school's paid time; null = no end date. */
  paidUntil: string | null;
};

/** Is the school paying for this seat right now? (= public.active_school_of in SQL) */
export function seatActive(seat: SchoolSeat | null | undefined, now?: Date): boolean {
  if (!seat || seat.status !== "active") return false;
  if (seat.paidUntil === null) return true;
  // The clock is read only when needed: Next.js refuses `new Date()` while pre-building a page (no seat then).
  return (now ?? new Date()).getTime() < Date.parse(seat.paidUntil);
}

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
  /** While previewing Free: the plan the account really has (to switch back). Otherwise null. */
  previewOf: { plan: PlanId; state: PlanState } | null;
  /** The teacher's school seat (also when the school has ended), or null. */
  school: SchoolSeat | null;
};

const DAY = 24 * 60 * 60 * 1000;

function build(plan: PlanId, state: PlanState, extra: Partial<Entitlements> = {}): Entitlements {
  const owned = new Set(PLANS[plan].features);
  const features = Object.fromEntries(FEATURES.map((f) => [f, owned.has(f)])) as Record<Feature, boolean>;
  return { plan, state, limits: PLANS[plan].limits, features, trialDaysLeft: null, renewsAt: null, endsAt: null, previewOf: null, school: null, ...extra };
}

/**
 * HIDDEN_FOR_TESTING (lib/hiddenForTesting.ts): while Premium is hidden, every
 * account works as Free (the subscription itself is untouched). Used by
 * PlanProvider and the server's entitlements; entitlementsFor stays as it was.
 */
export function freeWhilePremiumHidden(entitlements: Entitlements): Entitlements {
  if (!HIDDEN_FOR_TESTING.premium) return entitlements;
  const free = entitlements.plan === "free" ? entitlements : build("free", entitlements.state === "guest" ? "guest" : "free");
  // During the trial Free may print every variant (I–VI).
  return { ...free, limits: { ...free.limits, maxVariants: MAX_VARIANTS_FOR_TESTING } };
}

/** The app supports at most 6 variants (lib/variants.ts MAX_VARIANTS). */
const MAX_VARIANTS_FOR_TESTING = 6;

export function guestEntitlements(): Entitlements {
  return build("free", "guest");
}

const time = (iso: string | null) => (iso ? Date.parse(iso) : NaN);

/**
 * What a signed-in user with this subscription (or none) and this school
 * seat (or none) may do at `now`. The same order as public.plan_of in SQL:
 * "View as Free" → Free; an active school seat → School; else the subscription.
 */
export function entitlementsFor(subscription: Subscription | null, now: Date = new Date(), seat: SchoolSeat | null = null): Entitlements {
  const real = seatActive(seat, now)
    ? build("school", "active", { endsAt: seat!.paidUntil })
    : realEntitlements(subscription, now);
  // Previewing Free only ever LOWERS what the account may do.
  if (subscription?.previewFree && real.plan !== "free") return build("free", "free", { previewOf: { plan: real.plan, state: real.state }, school: seat });
  return { ...real, school: seat };
}

function realEntitlements(subscription: Subscription | null, now: Date): Entitlements {
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
