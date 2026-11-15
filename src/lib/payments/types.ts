/**
 * The "adapter" for payment providers.
 *
 * An adapter is a plug: our app talks to ONE shape (PaymentProvider below),
 * and each bank / payment company gets a small file that translates to its
 * own API (mock.ts, flitt.ts, bog.ts). Switching providers = changing the
 * PAYMENT_PROVIDER setting, nothing else.
 *
 * Words:
 * - "checkout": the provider's page where the teacher types the card.
 * - "webhook" / "callback": a message the provider's server sends to OUR
 *   server ("payment 123 succeeded"). Only these verified messages change a plan.
 * - "signature": proof that a webhook really comes from the provider.
 */
import type { BillingPeriod } from "@/lib/plans/plans";

export const PROVIDER_IDS = ["mock", "flitt", "bog"] as const;
export type ProviderId = (typeof PROVIDER_IDS)[number];

export type CheckoutRequest = {
  /** Our own id for this payment ("mt-c-…"), sent back in the webhook. */
  orderId: string;
  amountTetri: number;
  period: BillingPeriod;
  /** Shown on the bank page and the card statement. */
  description: string;
  email: string | null;
  language: "ka" | "en";
  /** Where the provider's server sends the result (our webhook route). */
  callbackUrl: string;
  /** Where the teacher's browser comes back to. */
  returnUrl: string;
};

export type CheckoutSession = { url: string; providerPaymentId?: string };

export type RenewalRequest = {
  orderId: string;
  amountTetri: number;
  description: string;
  /** What the provider gave us to charge the saved card again. */
  cardToken: string;
  callbackUrl: string;
};

/** Our own, provider-independent events. */
export const EVENT_TYPES = ["payment_succeeded", "payment_failed", "subscription_renewed", "cancelled", "refunded", "ignored"] as const;
export type PaymentEventType = (typeof EVENT_TYPES)[number];

export type PaymentEvent = {
  type: PaymentEventType;
  /** Unique per message at this provider: the same message twice has the same id. */
  eventId: string;
  orderId: string;
  providerPaymentId: string | null;
  amountTetri: number | null;
  card: { last4: string | null; brand: string | null; expiry: string | null };
  /** For renewals; stays on the server and in the database, never in the browser. */
  cardToken: string | null;
  failureReason: string | null;
};

export type ProviderInvoice = { providerPaymentId: string; status: string; amountTetri: number | null; raw: unknown };

export type WebhookInput = { rawBody: string; headers: Headers };

export interface PaymentProvider {
  id: ProviderId;
  /** True when no real money can move (mock, or a provider's test credentials). */
  testMode: boolean;
  /** False until every credential this provider needs is set. */
  configured: boolean;
  /** monthly ↔ yearly without a new card entry? (BoG repeats the first amount, so: no.) */
  canChangeAmount: boolean;
  createCheckout(request: CheckoutRequest): Promise<CheckoutSession>;
  /** Charges the saved card. Some providers answer at once (event), others by webhook later (null). */
  chargeRenewal(request: RenewalRequest): Promise<PaymentEvent | null>;
  /** Is this message really from the provider? */
  verifyWebhook(input: WebhookInput): Promise<boolean> | boolean;
  /** Only call after verifyWebhook said yes. */
  parseEvent(input: WebhookInput): PaymentEvent;
  /** Tell the provider to forget the saved card (best effort). */
  cancel(cardToken: string): Promise<void>;
  /** The provider's own record of a payment (for support and the receipt). */
  getInvoice(providerPaymentId: string, orderId: string): Promise<ProviderInvoice | null>;
}

/** Order ids say what they are: "mt-c-…" a checkout, "mt-r-…" a renewal. */
export const isRenewalOrder = (orderId: string) => orderId.startsWith("mt-r-");

/** "444455XXXXXX1111" / "4444 **** 1111" → "1111". */
export function last4Of(masked: unknown): string | null {
  const digits = typeof masked === "string" ? /(\d{4})\s*$/.exec(masked) : null;
  return digits ? digits[1] : null;
}

export class ProviderError extends Error {
  constructor(message: string, public readonly detail?: unknown) {
    super(message);
    this.name = "ProviderError";
  }
}
