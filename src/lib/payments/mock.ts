/**
 * The MOCK provider: a pretend bank for trying everything on your own
 * computer. No account, no card, no money.
 *
 * It behaves like a real provider on purpose:
 * - "Buy" sends the teacher to OUR OWN pretend bank page (/checkout/mock);
 * - that page sends a SIGNED webhook to our real webhook route;
 * - the plan changes only when that webhook is verified — exactly the path
 *   a real payment takes.
 *
 * The signature is an "HMAC": a fingerprint of the message made with a
 * secret key. Without the key nobody can make a valid one.
 */
import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { isRenewalOrder, type PaymentEvent, type PaymentProvider, type WebhookInput } from "./types";

export const MOCK_SIGNATURE_HEADER = "x-mock-signature";
/** A saved "card" with this token is declined at every renewal (to test retries and grace). */
export const MOCK_DECLINING_TOKEN = "mock_tok_declines";
export const MOCK_GOOD_TOKEN = "mock_tok_ok";

/** What the teacher can choose on the pretend bank page. */
export const MOCK_OUTCOMES = ["success", "successThenDecline", "declined", "threeDsFailed"] as const;
export type MockOutcome = (typeof MOCK_OUTCOMES)[number];

export type MockSession = { orderId: string; amountTetri: number; description: string; callbackUrl: string; returnUrl: string; expires: number };

export type MockWebhook = {
  id: string;
  type: "payment.succeeded" | "payment.failed" | "payment.refunded";
  order_id: string;
  payment_id: string;
  amount: number;
  card?: { last4: string; brand: string; expiry: string };
  card_token?: string;
  reason?: string;
};

const hmac = (secret: string, text: string) => createHmac("sha256", secret).update(text).digest("hex");

function sameText(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

export function createMockProvider({ secret, origin }: { secret: string; origin: string }) {
  const sign = (body: string) => hmac(secret, body);

  function eventFrom(message: MockWebhook): PaymentEvent {
    const paid = message.type === "payment.succeeded";
    return {
      type: message.type === "payment.refunded" ? "refunded" : paid ? (isRenewalOrder(message.order_id) ? "subscription_renewed" : "payment_succeeded") : "payment_failed",
      eventId: message.id,
      orderId: message.order_id,
      providerPaymentId: message.payment_id,
      amountTetri: message.amount,
      card: { last4: message.card?.last4 ?? null, brand: message.card?.brand ?? null, expiry: message.card?.expiry ?? null },
      cardToken: message.card_token ?? null,
      failureReason: message.reason ?? null,
    };
  }

  /** The message the pretend bank sends for an outcome chosen on its page. */
  function webhookFor(session: Pick<MockSession, "orderId" | "amountTetri">, outcome: MockOutcome): MockWebhook {
    const base = { id: `mock_evt_${randomUUID()}`, order_id: session.orderId, payment_id: `mock_pay_${randomUUID().slice(0, 12)}`, amount: session.amountTetri };
    if (outcome === "declined") return { ...base, type: "payment.failed", reason: "card_declined" };
    if (outcome === "threeDsFailed") return { ...base, type: "payment.failed", reason: "3ds_failed" };
    return {
      ...base,
      type: "payment.succeeded",
      card: { last4: outcome === "success" ? "4242" : "0002", brand: "visa", expiry: "12/30" },
      card_token: outcome === "success" ? MOCK_GOOD_TOKEN : MOCK_DECLINING_TOKEN,
    };
  }

  const provider: PaymentProvider = {
    id: "mock",
    testMode: true,
    configured: secret.length > 0,
    canChangeAmount: true,

    async createCheckout(request) {
      const session: MockSession = {
        orderId: request.orderId,
        amountTetri: request.amountTetri,
        description: request.description,
        callbackUrl: request.callbackUrl,
        returnUrl: request.returnUrl,
        expires: Date.now() + 60 * 60 * 1000,
      };
      const payload = Buffer.from(JSON.stringify(session)).toString("base64url");
      return { url: `${origin}/checkout/mock?session=${payload}.${sign(payload)}` };
    },

    async chargeRenewal(request) {
      const declined = request.cardToken === MOCK_DECLINING_TOKEN;
      const message = webhookFor({ orderId: request.orderId, amountTetri: request.amountTetri }, declined ? "declined" : "success");
      return { ...eventFrom(message), cardToken: null, card: { last4: null, brand: null, expiry: null } };
    },

    verifyWebhook({ rawBody, headers }: WebhookInput) {
      const given = headers.get(MOCK_SIGNATURE_HEADER) ?? "";
      return given.length > 0 && sameText(given, sign(rawBody));
    },

    parseEvent({ rawBody }: WebhookInput) {
      return eventFrom(JSON.parse(rawBody) as MockWebhook);
    },

    async cancel() {
      // Nothing to forget: the pretend bank keeps no cards.
    },

    async getInvoice(providerPaymentId) {
      return { providerPaymentId, status: "mock", amountTetri: null, raw: { note: "mock provider: no real payment exists" } };
    },
  };

  return {
    ...provider,
    sign,
    webhookFor,
    /** Reads the `session` from the pretend bank page's address; null if it was changed or is too old. */
    readSession(token: string, now = Date.now()): MockSession | null {
      const [payload, signature] = token.split(".");
      if (!payload || !signature || !sameText(signature, sign(payload))) return null;
      try {
        const session = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as MockSession;
        return session.expires > now ? session : null;
      } catch {
        return null;
      }
    },
  };
}
export type MockProvider = ReturnType<typeof createMockProvider>;
