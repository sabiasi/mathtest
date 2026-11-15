/**
 * Flitt (pay.flitt.com) — written from their public documentation
 * (docs.flitt.com/api: create-order, building-signature, order-parameters,
 * create-order-recurring, create-reversal, testing).
 *
 * NOT yet tried against a real merchant account: before real payments, run
 * the test payments in docs/GO_LIVE.md with Flitt's test merchant.
 *
 * How Flitt works, in short:
 * - We POST an order to /api/checkout/url and get the bank page's address.
 * - `required_rectoken: "Y"` asks for a "rectoken": a token that lets us
 *   charge the same card again for renewals (/api/recurring).
 * - Flitt POSTs the result to our `server_callback_url`.
 * - Every message carries a signature: SHA-1 of the secret key and all
 *   non-empty values, sorted by parameter name and joined with "|".
 * - Amounts are in tetri (minor units), as whole numbers.
 */
import { createHash, timingSafeEqual } from "node:crypto";
import { ProviderError, isRenewalOrder, last4Of, type PaymentEvent, type PaymentProvider, type WebhookInput } from "./types";

export const FLITT_API = "https://pay.flitt.com/api";
/** Flitt's public test merchant (their "Testing" page): no real money moves. */
export const FLITT_TEST_MERCHANT = "1549901";

type Params = Record<string, unknown>;

/**
 * The text that gets hashed: the secret key, then every non-empty value in
 * the alphabetical order of the parameter names, joined with "|".
 * `signature` itself and empty values are left out; 0 stays.
 */
export function flittSignatureString(secretKey: string, params: Params): string {
  const values = Object.keys(params)
    .filter((name) => name !== "signature" && name !== "response_signature_string")
    .sort()
    .map((name) => params[name])
    .filter((value) => value !== "" && value !== null && value !== undefined)
    .map(String);
  return [secretKey, ...values].join("|");
}

/** The signature of a request or callback: SHA-1 of that text, as lowercase hex. */
export function flittSignature(secretKey: string, params: Params): string {
  return createHash("sha1").update(flittSignatureString(secretKey, params), "utf8").digest("hex");
}

function sameText(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

/** Flitt sends callbacks as JSON or as a form, depending on the merchant's settings. */
export function readFlittBody(rawBody: string): Params {
  let data: unknown;
  try {
    data = JSON.parse(rawBody);
  } catch {
    data = Object.fromEntries(new URLSearchParams(rawBody));
  }
  const object = (data && typeof data === "object" ? data : {}) as Params;
  return (object.response && typeof object.response === "object" ? object.response : object) as Params;
}

const text = (value: unknown) => (value === null || value === undefined ? "" : String(value));
const whole = (value: unknown) => (/^\d+$/.test(text(value)) ? Number(value) : null);

export function flittEvent(data: Params): PaymentEvent {
  const orderId = text(data.order_id);
  const status = text(data.order_status);
  const reversed = whole(data.reversal_amount) ?? 0;
  let type: PaymentEvent["type"] = "ignored"; // created / processing: not final yet
  if (status === "approved") type = reversed > 0 ? "ignored" /* a partial refund: handled by hand */ : isRenewalOrder(orderId) ? "subscription_renewed" : "payment_succeeded";
  else if (status === "declined" || status === "expired") type = "payment_failed";
  else if (status === "reversed") type = "refunded";
  return {
    type,
    eventId: [orderId, status, text(data.payment_id), reversed].join(":"),
    orderId,
    providerPaymentId: text(data.payment_id) || null,
    amountTetri: whole(data.amount),
    card: { last4: last4Of(data.masked_card), brand: text(data.card_type).toLowerCase() || null, expiry: null },
    cardToken: text(data.rectoken) || null,
    failureReason: type === "payment_failed" ? text(data.response_description) || text(data.response_code) || status : null,
  };
}

export type FlittOptions = { merchantId: string; secretKey: string; fetch?: typeof fetch; apiUrl?: string };

export function createFlittProvider({ merchantId, secretKey, fetch: send = fetch, apiUrl = FLITT_API }: FlittOptions): PaymentProvider {
  async function post(path: string, params: Params): Promise<Params> {
    const request = { ...params, merchant_id: Number(merchantId) };
    const response = await send(`${apiUrl}/${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ request: { ...request, signature: flittSignature(secretKey, request) } }),
    });
    const data = readFlittBody(await response.text());
    if (data.response_status === "failure") throw new ProviderError(`Flitt: ${text(data.error_message)} (${text(data.error_code)})`, data);
    return data;
  }

  const verified = (data: Params) => {
    const given = text(data.signature);
    return given.length > 0 && sameText(given, flittSignature(secretKey, data));
  };

  return {
    id: "flitt",
    testMode: merchantId === FLITT_TEST_MERCHANT,
    configured: /^\d+$/.test(merchantId) && secretKey.length > 0,
    canChangeAmount: true,

    async createCheckout(request) {
      const data = await post("checkout/url", {
        version: "1.0.1",
        order_id: request.orderId,
        order_desc: request.description,
        amount: request.amountTetri,
        currency: "GEL",
        response_url: request.returnUrl,
        server_callback_url: request.callbackUrl,
        required_rectoken: "Y",
        lang: request.language,
        sender_email: request.email ?? "",
        lifetime: 3600,
      });
      const url = text(data.checkout_url);
      if (!url.startsWith("https://")) throw new ProviderError("Flitt: no checkout_url in the answer", data);
      return { url, providerPaymentId: text(data.payment_id) || undefined };
    },

    // "Request is always executed as host-to-host and response is returned in the context of the same request."
    async chargeRenewal(request) {
      const data = await post("recurring", {
        version: "1.0.1",
        order_id: request.orderId,
        order_desc: request.description,
        amount: request.amountTetri,
        currency: "GEL",
        rectoken: request.cardToken,
        server_callback_url: request.callbackUrl,
      });
      if (!verified(data)) throw new ProviderError("Flitt: the answer's signature is wrong", data);
      const event = flittEvent(data);
      return event.type === "ignored" ? null : event; // "processing": the callback brings the result
    },

    verifyWebhook({ rawBody }: WebhookInput) {
      return verified(readFlittBody(rawBody));
    },

    parseEvent({ rawBody }: WebhookInput) {
      return flittEvent(readFlittBody(rawBody));
    },

    async cancel() {
      // Flitt charges only when WE ask (with the rectoken), so "cancel" is simply: we stop asking.
    },

    async getInvoice(providerPaymentId, orderId) {
      const data = await post("status/order_id", { order_id: orderId });
      return { providerPaymentId: text(data.payment_id) || providerPaymentId, status: text(data.order_status), amountTetri: whole(data.amount), raw: data };
    },
  };
}
