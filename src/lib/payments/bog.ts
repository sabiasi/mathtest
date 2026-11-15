/**
 * Bank of Georgia — "BoG Payments" (api.bog.ge/payments/v1), written from
 * their public documentation (api.bog.ge/docs/en/payments: authentication,
 * create-order, callback, get-payment-details, saved-card/offline,
 * saved-card/offline-payment, refund). The older "iPay" API is marked
 * deprecated there, so this uses the current one.
 *
 * NOT yet tried against a real merchant account: before real payments, run
 * the test payments in docs/GO_LIVE.md.
 *
 * How BoG works, in short:
 * - We first get a short-lived "access token" with our client id + secret.
 * - We create an order and, before sending the teacher to the bank page,
 *   ask BoG to save the card for automatic payments (…/subscriptions).
 * - Renewals: POST …/orders/{first order id}/subscribe. BoG repeats the
 *   FIRST order's amount, so monthly ↔ yearly needs a new checkout.
 * - BoG POSTs the result to our callback URL, signed with the bank's private
 *   key (RSA, SHA-256) in the "Callback-Signature" header; we check it with
 *   the bank's PUBLIC key (BOG_CALLBACK_PUBLIC_KEY, copied from their
 *   "Callback" documentation page).
 * - Amounts are in lari with decimals (15.00), not tetri.
 */
import { createVerify, randomUUID } from "node:crypto";
import { ProviderError, isRenewalOrder, last4Of, type PaymentEvent, type PaymentProvider, type WebhookInput } from "./types";

export const BOG_API = "https://api.bog.ge/payments/v1";
export const BOG_TOKEN_URL = "https://oauth2.bog.ge/auth/realms/bog/protocol/openid-connect/token";
export const BOG_SIGNATURE_HEADER = "callback-signature";

type Json = Record<string, unknown>;
const object = (value: unknown): Json => (value && typeof value === "object" ? (value as Json) : {});
const text = (value: unknown) => (value === null || value === undefined ? "" : String(value));

/** "15.00" lari → 1500 tetri (null when it isn't a number). */
function tetri(value: unknown): number | null {
  const amount = Number(text(value));
  return text(value) !== "" && Number.isFinite(amount) ? Math.round(amount * 100) : null;
}

/** Is `signature` (base64) the bank's signature of exactly these bytes? Check BEFORE reading the JSON. */
export function verifyBogSignature(publicKeyPem: string, rawBody: string, signature: string): boolean {
  if (!publicKeyPem || !signature) return false;
  try {
    return createVerify("RSA-SHA256").update(rawBody, "utf8").verify(publicKeyPem, signature, "base64");
  } catch {
    return false; // a broken key or signature is simply "not verified"
  }
}

export function bogEvent(message: unknown): PaymentEvent {
  const body = object(object(message).body);
  const detail = object(body.payment_detail);
  const units = object(body.purchase_units);
  const status = text(object(body.order_status).key);
  const bankOrder = text(body.order_id);
  const orderId = text(body.external_order_id);
  let type: PaymentEvent["type"] = "ignored"; // created, processing, refund_requested, refunded_partially…
  if (status === "completed") type = isRenewalOrder(orderId) ? "subscription_renewed" : "payment_succeeded";
  else if (status === "rejected") type = "payment_failed";
  else if (status === "refunded") type = "refunded";
  const paid = type === "payment_succeeded" || type === "subscription_renewed";
  return {
    type,
    eventId: `${bankOrder}:${status}`,
    orderId,
    providerPaymentId: bankOrder || null,
    amountTetri: tetri(units.transfer_amount) ?? tetri(units.request_amount),
    card: { last4: last4Of(detail.payer_identifier), brand: text(detail.card_type) || null, expiry: text(detail.card_expiry_date) || null },
    // The first order's id is what renewals are charged against.
    cardToken: paid && !isRenewalOrder(orderId) ? bankOrder : null,
    failureReason: type === "payment_failed" ? text(body.reject_reason) || text(detail.code_description) || "rejected" : null,
  };
}

export type BogOptions = { clientId: string; clientSecret: string; callbackPublicKey: string; fetch?: typeof fetch; testMode?: boolean };

export function createBogProvider({ clientId, clientSecret, callbackPublicKey, fetch: send = fetch, testMode = false }: BogOptions): PaymentProvider {
  let token: { value: string; expires: number } | null = null;

  async function accessToken(): Promise<string> {
    if (token && token.expires > Date.now()) return token.value;
    const response = await send(BOG_TOKEN_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
      },
      body: "grant_type=client_credentials",
    });
    const data = object(await response.json().catch(() => null));
    const value = text(data.access_token);
    if (!response.ok || !value) throw new ProviderError("BoG: could not sign in with the client id and secret", data);
    // Their example shows a timestamp where the docs say "seconds": don't trust it, ask again every 5 minutes.
    token = { value, expires: Date.now() + 5 * 60 * 1000 };
    return value;
  }

  async function call(method: string, path: string, body?: Json, language?: string): Promise<{ status: number; data: Json }> {
    const response = await send(`${BOG_API}/${path}`, {
      method,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${await accessToken()}`,
        "Idempotency-Key": randomUUID(),
        ...(language ? { "Accept-Language": language } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = object(await response.json().catch(() => null));
    if (!response.ok) throw new ProviderError(`BoG: ${method} ${path} answered ${response.status}`, data);
    return { status: response.status, data };
  }

  return {
    id: "bog",
    testMode,
    configured: clientId.length > 0 && clientSecret.length > 0 && callbackPublicKey.includes("BEGIN PUBLIC KEY"),
    canChangeAmount: false,

    async createCheckout(request) {
      const lari = request.amountTetri / 100;
      const { data } = await call(
        "POST",
        "ecommerce/orders",
        {
          callback_url: request.callbackUrl,
          external_order_id: request.orderId,
          purchase_units: {
            currency: "GEL",
            total_amount: lari,
            basket: [{ product_id: `premium-${request.period}`, description: request.description, quantity: 1, unit_price: lari }],
          },
          redirect_urls: { success: request.returnUrl, fail: request.returnUrl },
          payment_method: ["card"],
          ttl: 60,
        },
        request.language,
      );
      const id = text(data.id);
      const url = text(object(object(data._links).redirect).href);
      if (!id || !url.startsWith("https://")) throw new ProviderError("BoG: no order id or payment page in the answer", data);
      // "After creating the order and before redirecting the customer": save the card for automatic payments.
      await call("PUT", `orders/${encodeURIComponent(id)}/subscriptions`);
      return { url, providerPaymentId: id };
    },

    async chargeRenewal(request) {
      await call("POST", `ecommerce/orders/${encodeURIComponent(request.cardToken)}/subscribe`, {
        callback_url: request.callbackUrl,
        external_order_id: request.orderId,
      });
      return null; // the result arrives at our webhook
    },

    verifyWebhook({ rawBody, headers }: WebhookInput) {
      return verifyBogSignature(callbackPublicKey, rawBody, headers.get(BOG_SIGNATURE_HEADER) ?? "");
    },

    parseEvent({ rawBody }: WebhookInput) {
      return bogEvent(JSON.parse(rawBody));
    },

    async cancel(cardToken) {
      // Their "Delete saved card" page; if the address differs, the card simply stays saved and is never charged by us.
      await call("DELETE", `charges/card/${encodeURIComponent(cardToken)}`);
    },

    async getInvoice(providerPaymentId) {
      const { data } = await call("GET", `receipt/${encodeURIComponent(providerPaymentId)}`);
      const units = object(data.purchase_units);
      return { providerPaymentId, status: text(object(data.order_status).key), amountTetri: tetri(units.transfer_amount) ?? tetri(units.request_amount), raw: data };
    },
  };
}
