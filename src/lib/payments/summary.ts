/**
 * What the browser gets from GET /api/billing/summary (Settings → My plan,
 * the pricing page). Plain types, shared by the server and the browser.
 */
import type { BillingPeriod, PlanId } from "@/lib/plans/plans";
import type { ProviderId } from "./types";

export type PaymentStatus = "paid" | "failed" | "refunded";

export type PaymentRow = {
  id: string;
  order_id: string;
  kind: "checkout" | "renewal";
  plan: PlanId;
  billing_period: BillingPeriod;
  amount_tetri: number;
  status: PaymentStatus;
  failure_reason: string;
  receipt_number: number | null;
  period_start: string | null;
  period_end: string | null;
  card_last4: string | null;
  card_brand: string | null;
  created_at: string;
  paid_at: string | null;
  refunded_at: string | null;
};

export type SubscriptionRow = {
  plan: string;
  status: string;
  billing_period: BillingPeriod | null;
  trial_ends_at: string | null;
  current_period_end: string | null;
  grace_ends_at: string | null;
  cancel_at_period_end: boolean | null;
  preview_free?: boolean | null;
  provider: string | null;
  next_retry_at: string | null;
};

export type BillingProfile = { full_name: string; school_name: string; language: string; email: string | null };

export type BillingSummary = {
  /** Can a teacher buy right now? */
  enabled: boolean;
  /** No real money can move: show the "TEST MODE" banner. */
  testMode: boolean;
  /** The local pretend database is on (the test tools are shown). */
  sandbox: boolean;
  provider: ProviderId | null;
  signedIn: boolean;
  /** monthly ↔ yearly without paying again now? */
  canChangePeriod: boolean;
  subscription: SubscriptionRow | null;
  method: { last4: string | null; brand: string | null; expiry: string | null } | null;
  payments: PaymentRow[];
  /** Orders still waiting for the provider's answer. */
  pending: string[];
  profile: BillingProfile | null;
};

/** Error codes our billing routes answer with ({ error: code }); each has a Georgian message (`billing.error.<code>`). */
export const BILLING_ERRORS = ["signIn", "disabled", "tooMany", "alreadySubscribed", "notReady", "provider", "invalid", "noSubscription", "ended", "newCheckoutNeeded", "failed"] as const;
export type BillingError = (typeof BILLING_ERRORS)[number];

export const asBillingError = (code: unknown): BillingError => (BILLING_ERRORS.includes(code as BillingError) ? (code as BillingError) : "failed");

/** Receipt no. 42 → "MT-000042". */
export const receiptLabel = (n: number | null) => (n === null ? "" : `MT-${String(n).padStart(6, "0")}`);
