import "server-only";
import { randomUUID } from "node:crypto";
import type { Language } from "@/i18n/dictionaries";
import { notify } from "@/lib/email/send";
import type { EmailKind } from "@/lib/email/templates";
import { formatDayOf } from "@/lib/format";
import { priceTetri } from "@/lib/plans/billing";
import { BILLING_PERIODS, PERIOD_MONTHS, type BillingPeriod } from "@/lib/plans/plans";
import { formatGel } from "@/lib/plans/pricing";
import { billingSecret, type ServerDb } from "@/lib/server/db";
import { activeProvider, paymentsStatus } from "./config";
import { receiptLabel, type BillingError, type BillingSummary } from "./summary";
import type { PaymentEvent, PaymentProvider } from "./types";

/**
 * What the billing routes do, in one place:
 *   startCheckout  → "Buy" was pressed
 *   applyEvent     → a verified message from the provider arrived
 *   runBillingJob  → the scheduled job (renewals, retries, expiries, reminders)
 *   setCancel / setPeriod / loadSummary
 *
 * The plan itself changes only inside the database functions
 * (supabase/schema.sql, section "Payments"), which demand the server secret.
 */

const PLAN_NAMES: Record<Language, Record<string, string>> = {
  ka: { premium: "Premium", school: "სკოლა", free: "უფასო" },
  en: { premium: "Premium", school: "School", free: "Free" },
};
const asLanguage = (value: unknown): Language => (value === "en" ? "en" : "ka");
const money = (tetri: number) => `${formatGel(tetri / 100)} ₾`;
const day = (iso: unknown, language: Language) => (typeof iso === "string" ? formatDayOf(iso, language) : "");

/** PostgREST / Postgres say "no such function" when the payments SQL hasn't been run yet. */
export function isMissingSql(error: unknown): boolean {
  const code = (error as { code?: string } | null)?.code ?? "";
  return code === "PGRST202" || code === "42883" || code === "42P01";
}

export const isBillingPeriod = (value: unknown): value is BillingPeriod => BILLING_PERIODS.includes(value as BillingPeriod);

// ---------------------------------------------------------------------------
// Buy
// ---------------------------------------------------------------------------

export async function startCheckout(db: ServerDb, origin: string, period: BillingPeriod, language: Language): Promise<{ url: string } | { error: BillingError }> {
  const provider = activeProvider(origin);
  if (!db.user) return { error: "signIn" };
  if (!provider || !paymentsStatus(origin).enabled) return { error: "disabled" };

  // The price comes from plans.ts HERE, on the server — never from the browser.
  const amountTetri = priceTetri(period);
  const orderId = `mt-c-${randomUUID()}`;
  const started = await db.rpc<{ payment_id?: string; error?: string }>("billing_start_checkout", {
    secret: billingSecret(),
    uid: db.user.id,
    provider: provider.id,
    order_id: orderId,
    billing_period: period,
    amount_tetri: amountTetri,
  });
  if (started.error === "alreadySubscribed") return { error: "alreadySubscribed" };
  if (!started.payment_id) return { error: "failed" };

  try {
    const session = await provider.createCheckout({
      orderId,
      amountTetri,
      period,
      description: `MathTest Premium (${PERIOD_MONTHS[period]} mo.)`,
      email: db.user.email,
      language,
      callbackUrl: `${origin}/api/billing/webhook/${provider.id}`,
      returnUrl: `${origin}/api/billing/return/${provider.id}?order=${orderId}`,
    });
    return { url: session.url };
  } catch (error) {
    console.error("MathTest: the payment provider refused the checkout", error);
    // Close the order, so it doesn't wait for an answer that will never come.
    await applyEvent(db, origin, provider, failedEvent(orderId, "provider error", "checkout-error")).catch(() => undefined);
    return { error: "provider" };
  }
}

const failedEvent = (orderId: string, reason: string, suffix: string): PaymentEvent => ({
  type: "payment_failed",
  eventId: `${orderId}:${suffix}`,
  orderId,
  providerPaymentId: null,
  amountTetri: null,
  card: { last4: null, brand: null, expiry: null },
  cardToken: null,
  failureReason: reason,
});

// ---------------------------------------------------------------------------
// A verified provider message
// ---------------------------------------------------------------------------

export type EventResult = {
  result: "paid" | "failed" | "refunded" | "cancelled" | "duplicate" | "ignored" | "unknownOrder" | "amountMismatch" | "alreadyPaid";
  payment_id?: string;
  kind?: "checkout" | "renewal";
  user_id?: string;
  email?: string | null;
  language?: string;
  plan?: string;
  amount_tetri?: number;
  receipt_number?: number | null;
  period_end?: string | null;
  grace_ends_at?: string | null;
};

/** Card tokens never go into the stored copy of a message. */
const redact = (raw: string) => raw.slice(0, 20_000).replace(/("?(?:rectoken|card_token)"?\s*[:=]\s*"?)[^"&,}\s]+/gi, "$1[hidden]");

export async function applyEvent(db: ServerDb, origin: string, provider: PaymentProvider, event: PaymentEvent, rawBody = ""): Promise<EventResult> {
  const { cardToken, ...visible } = event;
  const result = await db.rpc<EventResult>("billing_record_event", {
    secret: billingSecret(),
    provider: provider.id,
    event_id: event.eventId,
    event_type: event.type,
    order_id: event.orderId,
    amount_tetri: event.amountTetri,
    provider_payment_id: event.providerPaymentId,
    card_last4: event.card.last4,
    card_brand: event.card.brand,
    card_expiry: event.card.expiry,
    card_token: cardToken,
    failure_reason: event.failureReason,
    payload: { event: visible, raw: redact(rawBody) },
  });
  if (result.result === "amountMismatch" || result.result === "unknownOrder") {
    console.error(`MathTest: payment message for order ${event.orderId} needs a look: ${result.result}`);
  }

  const language = asLanguage(result.language);
  const base = { to: result.email, userId: result.user_id ?? null, language };
  const plan = PLAN_NAMES[language][result.plan ?? "premium"] ?? "Premium";
  if (result.result === "paid" && result.payment_id) {
    await notify(db, {
      ...base,
      kind: "paymentReceived",
      dedupeKey: `pay:${result.payment_id}:received`,
      data: {
        siteUrl: origin,
        amount: money(result.amount_tetri ?? 0),
        plan,
        date: day(result.period_end, language),
        receiptNumber: receiptLabel(result.receipt_number ?? null),
        link: `${origin}/billing/receipt/${result.payment_id}`,
      },
    });
  } else if (result.result === "failed" && result.kind === "renewal" && result.payment_id) {
    // A failed first payment is shown on the screen; only failed RENEWALS need an email.
    await notify(db, {
      ...base,
      kind: "paymentFailed",
      dedupeKey: `pay:${result.payment_id}:failed`,
      data: { siteUrl: origin, amount: money(result.amount_tetri ?? 0), plan, date: day(result.grace_ends_at, language) },
    });
  }
  return result;
}

// ---------------------------------------------------------------------------
// The scheduled job
// ---------------------------------------------------------------------------

type Sweep = {
  charges: { user_id: string; provider: string; plan: string; period: string }[];
  emails: { kind: EmailKind; user_id: string; key: string; email: string | null; language: string; date?: string; plan?: string }[];
};
type Renewal = EventResult & { skip?: boolean; failed?: boolean; card_token?: string };

export type JobReport = { renewed: number; failed: number; waiting: number; emails: number };

/** `onlyUser`: the local test tools run the job for one account; the real scheduled job leaves it out. */
export async function runBillingJob(db: ServerDb, origin: string, onlyUser: string | null = null): Promise<JobReport> {
  const secret = billingSecret();
  const provider = activeProvider(origin);
  const report: JobReport = { renewed: 0, failed: 0, waiting: 0, emails: 0 };
  // Ends what is over (cancelled plans, grace periods) and lists the rest.
  const sweep = await db.rpc<Sweep>("billing_sweep", { secret, only_user: onlyUser });

  for (const charge of sweep.charges) {
    // Only what the provider that is switched on can charge. (School plans are paid by invoice.)
    if (!provider || !provider.configured || charge.provider !== provider.id || charge.plan !== "premium" || !isBillingPeriod(charge.period)) continue;
    const orderId = `mt-r-${randomUUID()}`;
    const amountTetri = priceTetri(charge.period);
    const started = await db.rpc<Renewal>("billing_start_renewal", { secret, uid: charge.user_id, order_id: orderId, amount_tetri: amountTetri });
    if (started.skip) continue;
    let event: PaymentEvent | null;
    if (started.failed || !started.card_token) {
      report.failed++;
      continue; // no saved card: already recorded as a failed try
    }
    try {
      event = await provider.chargeRenewal({
        orderId,
        amountTetri,
        description: `MathTest Premium (${PERIOD_MONTHS[charge.period]} mo.)`,
        cardToken: started.card_token,
        callbackUrl: `${origin}/api/billing/webhook/${provider.id}`,
      });
    } catch (error) {
      console.error("MathTest: a renewal could not be charged", error);
      event = failedEvent(orderId, "provider error", "charge-error");
    }
    if (!event) {
      report.waiting++; // the provider answers by webhook
      continue;
    }
    // A provider that repeats the first amount (BoG) decides the amount itself.
    if (!provider.canChangeAmount) event = { ...event, amountTetri: null };
    const result = await applyEvent(db, origin, provider, event);
    if (result.result === "paid") report.renewed++;
    else report.failed++;
  }

  for (const email of sweep.emails) {
    const language = asLanguage(email.language);
    const sent = await notify(db, {
      kind: email.kind,
      to: email.email,
      userId: email.user_id,
      language,
      dedupeKey: email.key,
      data: { siteUrl: origin, date: day(email.date, language), plan: PLAN_NAMES[language][email.plan ?? "premium"] ?? "Premium" },
    });
    if (sent === "sent") report.emails++;
  }
  return report;
}

// ---------------------------------------------------------------------------
// Cancel / resume / change period / read
// ---------------------------------------------------------------------------

export async function setCancel(db: ServerDb, origin: string, cancel: boolean): Promise<{ ok: true } | { error: BillingError }> {
  if (!db.user) return { error: "signIn" };
  const result = await db.rpc<{ ok?: boolean; error?: string; ends_at?: string; plan?: string; email?: string; language?: string }>("billing_set_cancel", {
    secret: billingSecret(),
    uid: db.user.id,
    cancel,
  });
  if (!result.ok) return { error: result.error === "ended" ? "ended" : "noSubscription" };
  if (cancel) {
    const language = asLanguage(result.language);
    await notify(db, {
      kind: "cancelConfirmed",
      to: result.email,
      userId: db.user.id,
      language,
      dedupeKey: `${db.user.id}:cancelConfirmed:${(result.ends_at ?? "").slice(0, 10)}`,
      data: { siteUrl: origin, date: day(result.ends_at, language), plan: PLAN_NAMES[language][result.plan ?? "premium"] ?? "Premium" },
    });
  }
  return { ok: true };
}

export async function setPeriod(db: ServerDb, origin: string, period: BillingPeriod): Promise<{ ok: true } | { error: BillingError }> {
  if (!db.user) return { error: "signIn" };
  const provider = activeProvider(origin);
  if (!provider) return { error: "disabled" };
  if (!provider.canChangeAmount) return { error: "newCheckoutNeeded" };
  const result = await db.rpc<{ ok?: boolean; error?: string }>("billing_set_period", { secret: billingSecret(), uid: db.user.id, billing_period: period });
  if (!result.ok) return { error: result.error === "invalid" ? "invalid" : "noSubscription" };
  return { ok: true };
}

type SummaryRow = Pick<BillingSummary, "subscription" | "method" | "payments" | "pending" | "profile">;

export async function loadSummary(db: ServerDb | null, origin: string): Promise<BillingSummary> {
  const status = paymentsStatus(origin);
  const provider = activeProvider(origin);
  const empty: BillingSummary = {
    enabled: status.enabled,
    testMode: status.testMode,
    sandbox: status.sandbox,
    provider: status.provider,
    signedIn: Boolean(db?.user),
    canChangePeriod: Boolean(provider?.canChangeAmount),
    subscription: null,
    method: null,
    payments: [],
    pending: [],
    profile: null,
  };
  if (!db?.user || !billingSecret()) return empty;
  try {
    const row = await db.rpc<SummaryRow>("billing_summary", { secret: billingSecret(), uid: db.user.id });
    return { ...empty, subscription: row.subscription ?? null, method: row.method ?? null, payments: row.payments ?? [], pending: row.pending ?? [], profile: row.profile ?? null };
  } catch (error) {
    // The payments SQL isn't in the database yet: payments are simply not available.
    if (!isMissingSql(error)) console.error("MathTest: could not load the billing summary", error);
    return { ...empty, enabled: false };
  }
}
